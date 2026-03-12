import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import { UserProvider } from '@/stores/userContext'
import { PagoDetallePage } from './PagoDetallePage'
import type { IUsuario } from '@/types/common'

// Helper: simular input en UI5 Input (jsdom no propaga value con userEvent.type en UI5 web components)
function setUI5InputValue(element: Element, value: string) {
  // Set the value property directly on the web component
  Object.defineProperty(element, 'value', { value, writable: true, configurable: true })
  fireEvent.input(element, { target: { value } })
}

// Usuario cajero por defecto
const USUARIO_CAJA: IUsuario = {
  id: 'cajero.test',
  nombre: 'Cajero Test',
  rolCod: 3,
  sucursal: 'D190',
}

function renderPagoDetalle(belnr: string, kunnr: string, user?: IUsuario) {
  return render(
    <MemoryRouter initialEntries={[`/caja/pago/${belnr}?kunnr=${kunnr}`]}>
      <ThemeProvider>
        <UserProvider initialUser={user ?? USUARIO_CAJA}>
          <Routes>
            <Route path="/caja/pago/:belnr" element={<PagoDetallePage />} />
            <Route path="/caja" element={<div data-testid="caja-page">Caja</div>} />
          </Routes>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('PagoDetallePage', () => {
  describe('cuando carga con un belnr y kunnr válidos', () => {
    it('muestra el título "Detalle de Pago"', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.getByText('Detalle de Pago')).toBeInTheDocument()
    })

    it('carga y muestra los datos del cliente', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await waitFor(() => {
        expect(screen.getByText(/Agricola Los Boldos Ltda\./)).toBeInTheDocument()
      })
    })

    it('muestra la sociedad COOP', () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.getByText(/Sociedad: COOP/)).toBeInTheDocument()
    })

    it('muestra el código del cliente en Info Cliente', () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.getByText(/Cód\. Cliente: 0001000001/)).toBeInTheDocument()
    })

    it('muestra la moneda CLP', () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.getByText('CLP')).toBeInTheDocument()
    })

    it('carga las partidas del cliente', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument()
      })
      expect(screen.getByTestId('pago-partida-row-1900000002')).toBeInTheDocument()
    })

    it('pre-selecciona el documento del belnr de la ruta', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await waitFor(() => {
        const checkbox = screen.getByTestId('pago-partida-row-1900000001').querySelector('input[type="checkbox"]')
        expect(checkbox).toBeChecked()
      })
    })

    it('no pre-selecciona otros documentos del cliente', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument()
      })
      const checkbox2 = screen.getByTestId('pago-partida-row-1900000002').querySelector('input[type="checkbox"]')
      expect(checkbox2).not.toBeChecked()
    })
  })

  describe('totales', () => {
    it('muestra el TOTAL A PAGAR con el importe del documento pre-seleccionado', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await waitFor(() => {
        expect(screen.getByTestId('total-a-pagar')).toHaveTextContent('$850.000')
      })
    })

    it('actualiza TOTAL A PAGAR al seleccionar un segundo documento', async () => {
      const user = userEvent.setup()
      renderPagoDetalle('1900000001', '0001000001')

      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000002')).toBeInTheDocument()
      })

      // Clic en la segunda partida para seleccionarla
      await user.click(screen.getByTestId('pago-partida-row-1900000002'))

      await waitFor(() => {
        // 850.000 + 320.000 = 1.170.000
        expect(screen.getByTestId('total-a-pagar')).toHaveTextContent('$1.170.000')
      })
    })
  })

  describe('medios de pago', () => {
    it('muestra EFECTIVO como habilitado', () => {
      renderPagoDetalle('1900000001', '0001000001')
      const btnEfectivo = screen.getByTestId('btn-medio-EFECTIVO')
      expect(btnEfectivo).not.toBeDisabled()
    })

    it('muestra los demás medios como deshabilitados', () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.getByTestId('btn-medio-TARJETA_DEBITO')).toHaveAttribute('disabled')
      expect(screen.getByTestId('btn-medio-TARJETA_CREDITO')).toHaveAttribute('disabled')
      expect(screen.getByTestId('btn-medio-CHEQUE_DIA')).toHaveAttribute('disabled')
      expect(screen.getByTestId('btn-medio-VALE_VISTA')).toHaveAttribute('disabled')
    })

    it('agrega fila EFECTIVO en medios seleccionados al ingresar monto', async () => {
      const user = userEvent.setup()
      renderPagoDetalle('1900000001', '0001000001')

      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument()
      })

      // UI5 Input en jsdom requiere set value directo + fireEvent
      const input = screen.getByTestId('input-monto-efectivo')
      setUI5InputValue(input, '900000')
      await user.click(screen.getByTestId('btn-agregar-efectivo'))

      await waitFor(() => {
        // "EFECTIVO" aparece tanto en el botón como en la tabla de medios seleccionados
        const efectivoElements = screen.getAllByText('EFECTIVO')
        expect(efectivoElements.length).toBeGreaterThanOrEqual(2) // botón + fila tabla
        expect(screen.getByText('VUELTO EFECTIVO')).toBeInTheDocument()
      })
    })
  })

  describe('botones de acción', () => {
    it('muestra los botones Ejecutar Pago y Cancelar Operación en la columna derecha', () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.getByTestId('btn-ejecutar-pago')).toBeInTheDocument()
      expect(screen.getByTestId('btn-cancelar-operacion')).toBeInTheDocument()
    })

    it('botón Ejecutar Pago muestra "(F9)" en el texto', () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.getByTestId('btn-ejecutar-pago')).toHaveTextContent('(F9)')
    })

    it('botón Cancelar muestra "(Esc)" en el texto', () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.getByTestId('btn-cancelar-operacion')).toHaveTextContent('(Esc)')
    })

    it('Ejecutar Pago está deshabilitado sin medio de pago', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument()
      })
      expect(screen.getByTestId('btn-ejecutar-pago')).toHaveAttribute('disabled')
    })

    it('Cancelar Operación navega a /caja', async () => {
      const user = userEvent.setup()
      renderPagoDetalle('1900000001', '0001000001')

      await user.click(screen.getByTestId('btn-cancelar-operacion'))

      await waitFor(() => {
        expect(screen.getByTestId('caja-page')).toBeInTheDocument()
      })
    })
  })

  describe('atajos de teclado', () => {
    it('Enter en input monto dispara Agregar', async () => {
      renderPagoDetalle('1900000001', '0001000001')

      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument()
      })

      const input = screen.getByTestId('input-monto-efectivo')
      setUI5InputValue(input, '850000')
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        const efectivoElements = screen.getAllByText('EFECTIVO')
        expect(efectivoElements.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('Escape navega a /caja', async () => {
      renderPagoDetalle('1900000001', '0001000001')

      fireEvent.keyDown(window, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.getByTestId('caja-page')).toBeInTheDocument()
      })
    })

    it('F9 ejecuta el pago cuando está habilitado', async () => {
      const user = userEvent.setup()
      renderPagoDetalle('1900000001', '0001000001')

      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument()
      })

      // Agregar pago efectivo primero
      const input = screen.getByTestId('input-monto-efectivo')
      setUI5InputValue(input, '850000')
      await user.click(screen.getByTestId('btn-agregar-efectivo'))

      await waitFor(() => {
        expect(screen.getByTestId('btn-ejecutar-pago')).not.toHaveAttribute('disabled')
      })

      // F9 ejecuta el pago
      fireEvent.keyDown(window, { key: 'F9' })

      await waitFor(() => {
        expect(screen.getByTestId('comprobante-pago-detalle')).toBeInTheDocument()
      })
    })
  })

  describe('flujo completo de cobro efectivo', () => {
    it('ejecuta el pago y muestra comprobante', async () => {
      const user = userEvent.setup()
      renderPagoDetalle('1900000001', '0001000001')

      // Esperar carga de partidas
      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument()
      })

      // Ingresar monto efectivo (UI5 Input en jsdom)
      const input = screen.getByTestId('input-monto-efectivo')
      setUI5InputValue(input, '850000')
      await user.click(screen.getByTestId('btn-agregar-efectivo'))

      // Esperar que el botón ejecutar se habilite
      await waitFor(() => {
        expect(screen.getByTestId('btn-ejecutar-pago')).not.toHaveAttribute('disabled')
      })

      // Ejecutar pago
      await user.click(screen.getByTestId('btn-ejecutar-pago'))

      // Verificar comprobante
      await waitFor(() => {
        expect(screen.getByTestId('comprobante-pago-detalle')).toBeInTheDocument()
      })
      expect(screen.getByText(/Cobro registrado exitosamente/)).toBeInTheDocument()
    })
  })
})
