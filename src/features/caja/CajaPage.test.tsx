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
    it('muestra los 8 botones del menú de caja', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText('Pago Cta. Cte.')).toBeInTheDocument()
      expect(screen.getByText('Egr. de Caja')).toBeInTheDocument()
      expect(screen.getByText('List. Pagarés')).toBeInTheDocument()
      expect(screen.getByText('Ant. Cliente')).toBeInTheDocument()
      expect(screen.getByText('E° de Cuenta')).toBeInTheDocument()
      expect(screen.getByText('Consulta Pago')).toBeInTheDocument()
      expect(screen.getByText('Arqueo Caja')).toBeInTheDocument()
      expect(screen.getByText('Salir de la Caja')).toBeInTheDocument()
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

  describe('navegación al detalle de pago desde partida', () => {
    beforeEach(() => {
      mockNavigate.mockClear()
    })

    it('navega a /caja/pago/:belnr al hacer clic en una partida', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CajaPage />)

      // Esperar a que carguen las partidas
      await waitFor(() => {
        expect(screen.getByTestId('caja-factura-list')).toBeInTheDocument()
      })

      // Clic en una partida
      const row = screen.getByText('1900000001').closest('ui5-table-row') as HTMLElement
      await user.click(row)

      // Debe navegar a la pantalla de detalle de pago con kunnr como query param
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/\/caja\/pago\/1900000001\?kunnr=/)
      )
    })

    it('no muestra botón "Cobrar en Efectivo" en la lista de partidas', async () => {
      renderWithProviders(<CajaPage />)

      await waitFor(() => {
        expect(screen.getByTestId('caja-factura-list')).toBeInTheDocument()
      })

      expect(screen.queryByText('Cobrar en Efectivo')).not.toBeInTheDocument()
    })
  })

  describe('flujo Listado documentos', () => {
    it('muestra el título "Listado documentos"', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/Listado documentos/)).toBeInTheDocument()
    })

    it('muestra los 4 filtros específicos', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('filtro-cliente')).toBeInTheDocument()
      expect(screen.getByTestId('filtro-nombre')).toBeInTheDocument()
      expect(screen.getByTestId('filtro-documento')).toBeInTheDocument()
      expect(screen.getByTestId('filtro-pedido')).toBeInTheDocument()
    })

    it('no muestra botón Cliente Boleta ni búsqueda de cliente', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.queryByTestId('btn-cliente-boleta')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/buscar cliente por RUT/i)).not.toBeInTheDocument()
    })

    it('muestra la tabla de partidas inmediatamente al entrar', async () => {
      renderWithProviders(<CajaPage />)

      await waitFor(() => {
        expect(screen.getByTestId('caja-factura-list')).toBeInTheDocument()
      })
    })

    it('muestra el filtro de estado', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('filtro-estado')).toBeInTheDocument()
    })
  })
})
