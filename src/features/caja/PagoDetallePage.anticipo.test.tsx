import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/helpers'
import { PagoDetallePage } from './PagoDetallePage'

function setUI5InputValue(element: Element, value: string) {
  Object.defineProperty(element, 'value', { value, writable: true, configurable: true })
  fireEvent.input(element, { target: { value } })
}

// Pantalla de pago abierta desde Ant. Cliente (solicitud de anticipo CME F)
describe('PagoDetallePage en modo anticipo', () => {
  function renderAnticipo() {
    window.history.pushState({}, '', '/caja/pago?fuente=sap&modo=anticipo&kunnr=10000003&docs=1400000113-001-2026')
    renderWithProviders(
      <Routes>
        <Route path="/caja/pago/:belnr?" element={<PagoDetallePage />} />
      </Routes>,
    )
  }

  it('debería cargar la solicitud de anticipo seleccionada y su importe', async () => {
    renderAnticipo()
    expect(await screen.findByText('1400000113')).toBeInTheDocument()
    expect(screen.getByText('Pago de Anticipo')).toBeInTheDocument()
    expect(screen.getByText('Solicitud anticipo (CME F)')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('total-a-pagar')).toHaveTextContent('$55.000'))
    expect(screen.getByTestId('aviso-pago-anticipo')).toBeInTheDocument()
    expect(screen.queryByTestId('aviso-pago-sap')).not.toBeInTheDocument()
  })

  it('no debería ofrecer pago parcial ni saldo a favor, y el excedente es vuelto', async () => {
    renderAnticipo()
    await screen.findByText('1400000113')
    setUI5InputValue(screen.getByTestId('input-monto-efectivo'), '60000')
    fireEvent.click(screen.getByTestId('btn-medio-EFECTIVO'))
    await waitFor(() => expect(screen.getByTestId('total-a-devolver')).toHaveTextContent('$5.000'))
    expect(screen.queryByTestId('chk-saldo-favor')).not.toBeInTheDocument()
    expect(screen.queryByTestId('chk-pago-parcial')).not.toBeInTheDocument()
  })

  it('debería confirmar con el JSON (claves 41/09/51) y, con el parámetro en N, mostrar solo el JSON', async () => {
    renderAnticipo()
    await screen.findByText('1400000113')
    setUI5InputValue(screen.getByTestId('input-monto-efectivo'), '55000')
    fireEvent.click(screen.getByTestId('btn-medio-EFECTIVO'))
    await waitFor(() => expect(screen.getByTestId('btn-ejecutar-pago')).not.toHaveAttribute('disabled'))
    fireEvent.click(screen.getByTestId('btn-ejecutar-pago'))

    expect(await screen.findByTestId('confirmar-pago-anticipo')).toHaveTextContent('1400000113')
    expect(screen.getByTestId('anticipo-solo-json')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('btn-confirmar-pago-sap'))
    expect(await screen.findByTestId('pago-sap-solo-json')).toHaveTextContent('ANTICIPO_SAP_HABILITADO = N')
    expect(screen.getByTestId('pago-sap-dialog')).toHaveAttribute('header-text', 'Pago de anticipo — solo JSON (no enviado)')
  })
})
