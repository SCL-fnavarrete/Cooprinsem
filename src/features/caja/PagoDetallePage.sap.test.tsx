import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/helpers'
import { PagoDetallePage } from './PagoDetallePage'

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

  it('debería cargar el cliente y la partida seleccionada desde SAP', async () => {
    renderSap()
    expect(await screen.findByText('1800000009')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Nombre: Sergio Cutiño')).toBeInTheDocument())
    expect(screen.getByText('Crédito: no disponible en el maestro de clientes SAP')).toBeInTheDocument()
  })

  it('debería avisar que el pago real está pendiente y no permitir ejecutarlo', async () => {
    renderSap()
    await screen.findByText('1800000009')
    expect(screen.getByTestId('aviso-pago-sap')).toBeInTheDocument()
    expect(screen.getByTestId('btn-ejecutar-pago')).toHaveAttribute('disabled')
  })
})
