import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import { UserProvider } from '@/stores/userContext'
import { PagoDetallePage } from './PagoDetallePage'
import type { IUsuario } from '@/types/common'
import { ingresarEfectivo, ingresarMedio, setUI5InputValue } from '@/test/mediosPago'

const DATOS_DEBITO = { numeroTarjeta: '1234', numeroOperacion: '000123', codigoAutorizacion: 'A1B2C3' }

// Select de UI5 en jsdom: se dispara change con la opción elegida
function elegirBanco(bankKey: string) {
  const select = screen.getByTestId('medio-campo-codigoBanco')
  const opcion = select.querySelector(`[data-id="${bankKey}"]`)
  fireEvent(select, new CustomEvent('change', { detail: { selectedOption: opcion } }))
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
    const esperarPartida = () => waitFor(() => expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument())

    it('debería habilitar efectivo, tarjetas y cheques (con Cheque a fecha antes de Vale Vista) y dejar Vale Vista deshabilitado', () => {
      renderPagoDetalle('1900000001', '0001000001')
      for (const codigo of ['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CHEQUE_DIA', 'CHEQUE_FECHA']) {
        expect(screen.getByTestId(`btn-medio-${codigo}`)).not.toHaveAttribute('disabled')
      }
      expect(screen.getByTestId('btn-medio-VALE_VISTA')).toHaveAttribute('disabled')
      const orden = screen.getAllByTestId(/^btn-medio-/).map((b) => b.getAttribute('data-testid'))
      expect(orden.indexOf('btn-medio-CHEQUE_FECHA')).toBe(orden.indexOf('btn-medio-VALE_VISTA') - 1)
    })

    it('no debería mostrar resumen bajo un medio sin datos', () => {
      renderPagoDetalle('1900000001', '0001000001')
      expect(screen.queryByTestId(/^resumen-medio-/)).not.toBeInTheDocument()
    })

    it('efectivo debería abrir el popup con lo que falta por pagar y, al aceptar, mostrar el resumen y el vuelto', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await esperarPartida()
      fireEvent.click(screen.getByTestId('btn-medio-EFECTIVO'))
      expect(screen.getByTestId('medio-pago-dialog')).toHaveAttribute('header-text', 'Forma de pago Efectivo')
      await waitFor(() => expect(screen.getByTestId('medio-campo-monto')).toHaveAttribute('value', '$850.000'))
      setUI5InputValue(screen.getByTestId('medio-campo-monto'), '900000')
      fireEvent.click(screen.getByTestId('medio-aceptar'))

      expect(await screen.findByTestId('resumen-medio-EFECTIVO')).toHaveTextContent('$900.000')
      expect(screen.queryByTestId('medio-pago-dialog')).not.toBeInTheDocument()
      expect(screen.getByText('VUELTO EFECTIVO')).toBeInTheDocument()
      expect(screen.getByTestId('total-a-devolver')).toHaveTextContent('$50.000')
    })

    it('al volver a abrir un medio con datos debería permitir editarlo, limpiarlo o cancelar', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await esperarPartida()
      ingresarEfectivo('850000')
      await screen.findByTestId('resumen-medio-EFECTIVO')

      // Editar
      fireEvent.click(screen.getByTestId('btn-medio-EFECTIVO'))
      await waitFor(() => expect(screen.getByTestId('medio-campo-monto')).toHaveAttribute('value', '$850.000'))
      setUI5InputValue(screen.getByTestId('medio-campo-monto'), '860000')
      fireEvent.click(screen.getByTestId('medio-aceptar'))
      await waitFor(() => expect(screen.getByTestId('resumen-medio-EFECTIVO')).toHaveTextContent('$860.000'))

      // Cancelar: no cambia nada
      fireEvent.click(screen.getByTestId('btn-medio-EFECTIVO'))
      setUI5InputValue(screen.getByTestId('medio-campo-monto'), '1')
      fireEvent.click(screen.getByTestId('medio-cancelar'))
      expect(screen.getByTestId('resumen-medio-EFECTIVO')).toHaveTextContent('$860.000')

      // Limpiar: quita el medio
      fireEvent.click(screen.getByTestId('btn-medio-EFECTIVO'))
      fireEvent.click(screen.getByTestId('medio-limpiar'))
      await waitFor(() => expect(screen.queryByTestId('resumen-medio-EFECTIVO')).not.toBeInTheDocument())
      expect(screen.getByTestId('total-pagado')).toHaveTextContent('$0')
    })

    it('tarjeta de débito debería exigir sus datos y no permitir sobrepago', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await esperarPartida()
      fireEvent.click(screen.getByTestId('btn-medio-TARJETA_DEBITO'))
      setUI5InputValue(screen.getByTestId('medio-campo-monto'), '900000')
      fireEvent.click(screen.getByTestId('medio-aceptar'))

      expect(await screen.findByTestId('medio-error-monto')).toHaveTextContent('$850.000')
      expect(screen.getByTestId('medio-error-numeroTarjeta')).toBeInTheDocument()
      expect(screen.getByTestId('medio-error-numeroOperacion')).toBeInTheDocument()
      expect(screen.getByTestId('medio-error-codigoAutorizacion')).toBeInTheDocument()
      expect(screen.queryByTestId('resumen-medio-TARJETA_DEBITO')).not.toBeInTheDocument()
    })

    it('con tarjeta debería mostrar el resumen y bloquear "Ejecutar Pago" hasta la integración con SAP', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await esperarPartida()
      ingresarMedio('TARJETA_DEBITO', DATOS_DEBITO)

      expect(await screen.findByTestId('resumen-medio-TARJETA_DEBITO')).toHaveTextContent('**** 1234 · Op. 000123 · Aut. A1B2C3 · $850.000')
      expect(screen.getByTestId('total-pagado')).toHaveTextContent('$850.000')
      expect(screen.getByTestId('aviso-medios-sin-integracion')).toBeInTheDocument()
      // El usuario de negocio (sin modo técnico) no ve el JSON de los medios
      expect(screen.queryByTestId('json-medios-pago')).not.toBeInTheDocument()
      expect(screen.getByTestId('btn-ejecutar-pago')).toHaveAttribute('disabled')
    })

    it('tarjeta de crédito debería pedir cuotas y mostrarlas en el resumen', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await esperarPartida()
      ingresarMedio('TARJETA_CREDITO', { ...DATOS_DEBITO, cuotas: '3', monto: '500000' })
      expect(await screen.findByTestId('resumen-medio-TARJETA_CREDITO')).toHaveTextContent('3 cuota(s)')
      expect(screen.getByTestId('resumen-medio-TARJETA_CREDITO')).toHaveTextContent('$500.000')
    })

    it('al aceptar otro medio debería limpiar el anterior (un solo medio por cobro)', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await esperarPartida()
      ingresarEfectivo('4000')
      await screen.findByTestId('resumen-medio-EFECTIVO')

      fireEvent.click(screen.getByTestId('btn-medio-TARJETA_DEBITO'))
      expect(screen.getByTestId('medio-aviso-reemplazo')).toHaveTextContent('EFECTIVO')
      // Sugiere el total, no lo que falta después del efectivo
      await waitFor(() => expect(screen.getByTestId('medio-campo-monto')).toHaveAttribute('value', '$850.000'))
      for (const [campo, valor] of Object.entries(DATOS_DEBITO)) setUI5InputValue(screen.getByTestId(`medio-campo-${campo}`), valor)
      fireEvent.click(screen.getByTestId('medio-aceptar'))

      expect(await screen.findByTestId('resumen-medio-TARJETA_DEBITO')).toHaveTextContent('$850.000')
      expect(screen.queryByTestId('resumen-medio-EFECTIVO')).not.toBeInTheDocument()
      expect(screen.getByTestId('total-pagado')).toHaveTextContent('$850.000')
    })

    it('cheque al día con sobrepago debería dejar la diferencia a cta. cte.', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await esperarPartida()
      fireEvent.click(screen.getByTestId('btn-medio-CHEQUE_DIA'))
      expect(screen.queryByTestId('medio-aviso-reemplazo')).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByTestId('medio-campo-codigoBanco').querySelector('[data-id="037"]')).toBeTruthy())
      elegirBanco('037')
      for (const [campo, valor] of Object.entries({
        rutGirador: '96.719.960-5', plaza: '283', cuentaBancaria: '0584335469', numeroCheque: '20111', telefono: '000', monto: '870000',
      })) setUI5InputValue(screen.getByTestId(`medio-campo-${campo}`), valor)
      fireEvent.click(screen.getByTestId('medio-aceptar'))

      expect(await screen.findByTestId('resumen-medio-CHEQUE_DIA')).toHaveTextContent('N° 20111 · Banco Santander')
      expect(screen.getByTestId('total-pagado')).toHaveTextContent('$870.000')
      expect(screen.getByTestId('total-a-devolver')).toHaveTextContent('$0')
      expect(screen.getByTestId('total-a-ctacte')).toHaveTextContent('$20.000')
    })

    it('cheque a fecha debería mostrar la fecha máxima y exigir una fecha posterior a hoy', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await esperarPartida()
      fireEvent.click(screen.getByTestId('btn-medio-CHEQUE_FECHA'))
      expect(screen.getByTestId('medio-fecha-maxima')).toHaveTextContent(/Fecha máxima cheque: \d{2}\.\d{2}\.\d{4}/)
      fireEvent.click(screen.getByTestId('medio-aceptar'))
      expect(await screen.findByTestId('medio-error-fechaCheque')).toBeInTheDocument()
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
    it('Enter en el monto del popup debería aceptar', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      await waitFor(() => expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('btn-medio-EFECTIVO'))
      const input = screen.getByTestId('medio-campo-monto')
      setUI5InputValue(input, '850000')
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(await screen.findByTestId('resumen-medio-EFECTIVO')).toHaveTextContent('$850.000')
    })

    it('F2 debería abrir el popup de Efectivo', async () => {
      renderPagoDetalle('1900000001', '0001000001')
      fireEvent.keyDown(window, { key: 'F2' })
      expect(await screen.findByTestId('medio-pago-dialog')).toHaveAttribute('header-text', 'Forma de pago Efectivo')
    })

    it('Escape navega a /caja', async () => {
      renderPagoDetalle('1900000001', '0001000001')

      fireEvent.keyDown(window, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.getByTestId('caja-page')).toBeInTheDocument()
      })
    })

    it('F9 ejecuta el pago cuando está habilitado', async () => {
      renderPagoDetalle('1900000001', '0001000001')

      await waitFor(() => {
        expect(screen.getByTestId('pago-partida-row-1900000001')).toBeInTheDocument()
      })

      // Agregar pago efectivo primero
      ingresarEfectivo('850000')

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

      // Ingresar monto efectivo en su popup
      ingresarEfectivo('850000')

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
