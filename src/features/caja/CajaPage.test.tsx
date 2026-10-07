import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CajaPage } from './CajaPage'
import { renderWithProviders } from '@/test/helpers'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Polyfill: jsdom no tiene checkVisibility (usado por UI5 Table internamente)
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

describe('CajaPage', () => {
  describe('menú lateral', () => {
    it('muestra los botones del menú de caja, con Home primero y Pago Cta. Cte. debajo', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Pago Cta. Cte.')).toBeInTheDocument()
      expect(screen.getByText('Egr. de Caja')).toBeInTheDocument()
      expect(screen.getByText('List. Pagarés')).toBeInTheDocument()
      expect(screen.getByText('Ant. Cliente')).toBeInTheDocument()
      expect(screen.getByText('E° de Cuenta')).toBeInTheDocument()
      expect(screen.getByText('Consulta Pago')).toBeInTheDocument()
      expect(screen.getByText('Arqueo Caja')).toBeInTheDocument()
      expect(screen.getByText('Salir de la Caja')).toBeInTheDocument()
      // "Anticipo" ya no es opción del menú: vive dentro de Ant. Cliente
      expect(screen.queryByText('Anticipo')).not.toBeInTheDocument()
    })

    it('Pago Cta. Cte., List. Pagarés, Ant. Cliente, Arqueo Caja y Salir de la Caja están habilitados, el resto deshabilitados', () => {
      renderWithProviders(<CajaPage />)
      const pagoBtn = screen.getByText('Pago Cta. Cte.').closest('ui5-button')
      expect(pagoBtn).not.toHaveAttribute('disabled')

      const pagaresBtn = screen.getByText('List. Pagarés').closest('ui5-button')
      expect(pagaresBtn).not.toHaveAttribute('disabled')

      const anticipoBtn = screen.getByText('Ant. Cliente').closest('ui5-button')
      expect(anticipoBtn).not.toHaveAttribute('disabled')

      const arqueoBtn = screen.getByText('Arqueo Caja').closest('ui5-button')
      expect(arqueoBtn).not.toHaveAttribute('disabled')

      const salirBtn = screen.getByText('Salir de la Caja').closest('ui5-button')
      expect(salirBtn).not.toHaveAttribute('disabled')

      // Los demás deshabilitados
      const egresoBtn = screen.getByText('Egr. de Caja').closest('ui5-button')
      expect(egresoBtn).toHaveAttribute('disabled')

      const edoCuentaBtn = screen.getByText('E° de Cuenta').closest('ui5-button')
      expect(edoCuentaBtn).toHaveAttribute('disabled')

      const consultaBtn = screen.getByText('Consulta Pago').closest('ui5-button')
      expect(consultaBtn).toHaveAttribute('disabled')
    })
  })

  describe('salir de la caja', () => {
    beforeEach(() => {
      mockNavigate.mockClear()
    })

    it('muestra MessageBox de confirmación al hacer clic en Salir de la Caja', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CajaPage />)

      const salirBtn = screen.getByText('Salir de la Caja').closest('ui5-button') as HTMLElement
      await user.click(salirBtn)

      await waitFor(() => {
        expect(screen.getByText(/¿Desea salir de la Caja/)).toBeInTheDocument()
      })
    })

    it('confirmar "Salir" redirige a /home', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CajaPage />)

      const salirBtn = screen.getByText('Salir de la Caja').closest('ui5-button') as HTMLElement
      await user.click(salirBtn)

      await waitFor(() => {
        expect(screen.getByText(/¿Desea salir de la Caja/)).toBeInTheDocument()
      })

      // UI5 MessageBox de tipo Confirm tiene botón OK
      const okBtn = screen.getByText('OK').closest('ui5-button') as HTMLElement
      await user.click(okBtn)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/home')
      })
    })

    it('cancelar cierra el dialog sin redirigir', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CajaPage />)

      const salirBtn = screen.getByText('Salir de la Caja').closest('ui5-button') as HTMLElement
      await user.click(salirBtn)

      await waitFor(() => {
        expect(screen.getByText(/¿Desea salir de la Caja/)).toBeInTheDocument()
      })

      const cancelBtn = screen.getByText('Cancel').closest('ui5-button') as HTMLElement
      await user.click(cancelBtn)

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('panel de información de sesión', () => {
    it('muestra el id y nombre del usuario', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/cajero\.test — Cajero Test/)).toBeInTheDocument()
    })

    it('muestra la sucursal con nombre', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/D190 — Osorno/)).toBeInTheDocument()
    })

    it('muestra la sociedad COOP', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/COOP — COOPRINSEM LTDA\./)).toBeInTheDocument()
    })
  })

  describe('flujo Listado documentos', () => {
    it('muestra el título "Listado documentos"', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/Listado documentos/)).toBeInTheDocument()
    })

    it('muestra solo los filtros que corresponden a columnas de la tabla', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('filtro-cliente')).toBeInTheDocument()
      expect(screen.getByTestId('filtro-nombre')).toBeInTheDocument()
      expect(screen.queryByTestId('filtro-documento')).not.toBeInTheDocument()
      expect(screen.queryByTestId('filtro-pedido')).not.toBeInTheDocument()
    })

    it('no muestra botón Cliente Boleta ni búsqueda de cliente', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.queryByTestId('btn-cliente-boleta')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/buscar cliente por RUT/i)).not.toBeInTheDocument()
    })

    it('muestra la tabla vacía con las columnas del WebDynpro y el aviso de pendientes', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('listado-documentos-caja')).toBeInTheDocument()
      expect(screen.getByText('No hay documentos disponibles para pagar')).toBeInTheDocument()
      expect(screen.getByTestId('pendientes-home-caja')).toBeInTheDocument()
    })

    it('muestra el filtro de estado', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('filtro-estado')).toBeInTheDocument()
    })
  })
})
