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

  describe('auto-detección de cliente desde partidas', () => {
    it('habilita "Cobrar en Efectivo" al seleccionar partidas del mismo cliente sin buscador', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CajaPage />)

      // Esperar a que carguen las partidas
      await waitFor(() => {
        expect(screen.getByTestId('caja-factura-list')).toBeInTheDocument()
      })

      // Seleccionar 2 partidas del cliente 0001000001 (belnr 1900000001, 1900000002)
      const row1 = screen.getByText('1900000001').closest('ui5-table-row') as HTMLElement
      const row2 = screen.getByText('1900000002').closest('ui5-table-row') as HTMLElement
      await user.click(row1)
      await user.click(row2)

      // Botón cobrar debe estar habilitado (sin haber buscado cliente)
      const cobrarBtn = screen.getByText('Cobrar en Efectivo').closest('ui5-button') as HTMLElement
      expect(cobrarBtn).not.toHaveAttribute('disabled')

      // Debe mostrar info del cliente derivado (MessageStrip con total CLP)
      expect(screen.getByText(/documento\(s\) seleccionado.*Total:.*\$/)).toBeInTheDocument()
    })

    it('muestra mensaje de múltiples clientes al seleccionar partidas de distintos clientes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CajaPage />)

      await waitFor(() => {
        expect(screen.getByTestId('caja-factura-list')).toBeInTheDocument()
      })

      // Seleccionar partida de cliente 0001000001
      const row1 = screen.getByText('1900000001').closest('ui5-table-row') as HTMLElement
      await user.click(row1)

      // Seleccionar partida de cliente 0001000002
      const row2 = screen.getByText('1900000003').closest('ui5-table-row') as HTMLElement
      await user.click(row2)

      // Debe mostrar warning de múltiples clientes
      expect(screen.getByText(/Solo puedes cobrar documentos de un cliente a la vez/)).toBeInTheDocument()
    })

    it('deshabilita botón cuando hay partidas de múltiples clientes seleccionadas', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CajaPage />)

      await waitFor(() => {
        expect(screen.getByTestId('caja-factura-list')).toBeInTheDocument()
      })

      // Seleccionar partidas de 2 clientes distintos
      const row1 = screen.getByText('1900000001').closest('ui5-table-row') as HTMLElement
      const row2 = screen.getByText('1900000003').closest('ui5-table-row') as HTMLElement
      await user.click(row1)
      await user.click(row2)

      const cobrarBtn = screen.getByText('Cobrar en Efectivo').closest('ui5-button') as HTMLElement
      expect(cobrarBtn).toHaveAttribute('disabled')
    })
  })

  describe('flujo Pago Cuenta Corriente', () => {
    it('muestra el título del módulo', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/Pago Cuenta Corriente/)).toBeInTheDocument()
    })

    it('muestra búsqueda de cliente', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument()
    })

    it('muestra botón Cliente Boleta', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('btn-cliente-boleta')).toBeInTheDocument()
    })

    it('muestra la tabla de partidas inmediatamente al entrar (sin seleccionar cliente)', async () => {
      renderWithProviders(<CajaPage />)

      // La tabla se muestra siempre, no condicionada a cliente
      await waitFor(() => {
        expect(screen.getByTestId('caja-factura-list')).toBeInTheDocument()
      })
    })

    it('muestra el filtro de texto para partidas', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('filtro-partidas')).toBeInTheDocument()
    })
  })
})
