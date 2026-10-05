import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { renderWithProviders } from '@/test/helpers'
import { PagoDetallePage } from './PagoDetallePage'

const BASE = 'http://localhost:3001'

function setUI5InputValue(element: Element, value: string) {
  Object.defineProperty(element, 'value', { value, writable: true, configurable: true })
  fireEvent.input(element, { target: { value } })
}

// Pantalla de pago con partidas SAP (viene de Caja > Pago Cta. Cte.)
describe('PagoDetallePage con fuente SAP', () => {
  function renderSap() {
    window.history.pushState({}, '', '/caja/pago?fuente=sap&kunnr=10000003&docs=1800000009-001-2026')
    renderWithProviders(
      <Routes>
        <Route path="/caja/pago/:belnr?" element={<PagoDetallePage />} />
      </Routes>
    )
  }

  async function ingresarEfectivoYEjecutar() {
    await screen.findByText('1800000009')
    const input = screen.getByTestId('input-monto-efectivo')
    setUI5InputValue(input, '80000')
    fireEvent.click(screen.getByTestId('btn-medio-EFECTIVO'))
    await waitFor(() => expect(screen.getByTestId('btn-ejecutar-pago')).not.toHaveAttribute('disabled'))
    fireEvent.click(screen.getByTestId('btn-ejecutar-pago'))
  }

  it('debería cargar el cliente y la partida seleccionada desde SAP', async () => {
    renderSap()
    expect(await screen.findByText('1800000009')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Nombre: Sergio Cutiño')).toBeInTheDocument())
    expect(screen.getByText('Crédito: no disponible en el maestro de clientes SAP')).toBeInTheDocument()
    expect(screen.getByTestId('aviso-pago-sap')).toBeInTheDocument()
  })

  it('debería pedir confirmación mostrando el JSON a enviar y luego mostrar el N° de documento SAP', async () => {
    renderSap()
    await ingresarEfectivoYEjecutar()

    expect(await screen.findByTestId('pago-sap-dialog')).toHaveAttribute('header-text', 'Confirmar pago en SAP')
    expect(screen.getByText('JSON que se enviará')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('btn-confirmar-pago-sap'))
    expect(await screen.findByTestId('pago-sap-exito')).toHaveTextContent('Documento N° 1400000060')
    expect(screen.getByTestId('pago-sap-exito')).toHaveTextContent('CAJ-D190-000001')
    expect(screen.getByText('JSON enviado')).toBeInTheDocument()
    expect(screen.getByText('JSON de respuesta de SAP')).toBeInTheDocument()
  })

  it('debería mostrar el rechazo de SAP con su mensaje y detalle', async () => {
    server.use(
      http.post(`${BASE}/api/sap-cta-cte/pagos`, () => HttpResponse.json({
        success: false, message: 'Período 10 no permitido', refDocNo: 'CAJ-D190-000002',
        errordetails: [{ message: 'Período 10 no permitido para la sociedad COOP', severity: 'error' }],
        body: { DocType: 'DW' }, url: 'https://sap/ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet',
        detalle: { error: { message: { value: 'Período 10 no permitido' } } },
      }, { status: 400 }))
    )
    renderSap()
    await ingresarEfectivoYEjecutar()
    fireEvent.click(await screen.findByTestId('btn-confirmar-pago-sap'))
    expect(await screen.findByTestId('pago-sap-error')).toHaveTextContent('Período 10 no permitido')
    expect(screen.getByText('Período 10 no permitido para la sociedad COOP')).toBeInTheDocument()
  })
})
