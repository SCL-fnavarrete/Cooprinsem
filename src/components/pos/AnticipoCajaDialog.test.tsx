import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { AnticipoCajaDialog } from './AnticipoCajaDialog'
import { renderWithProviders } from '@/test/helpers'
import { crearClienteMock } from '@/test/factories'

const SERGIO = crearClienteMock({ codigoCliente: '10000003', nombre: 'Sergio Cutiño', rut: '16029421-3' })

function setUI5InputValue(element: Element, value: string) {
  Object.defineProperty(element, 'value', { value, writable: true, configurable: true })
  fireEvent.input(element, { target: { value } })
}

describe('AnticipoCajaDialog', () => {
  it('debería precargar el cliente y dejar Aceptar deshabilitado sin N° de documento', () => {
    renderWithProviders(<AnticipoCajaDialog open clienteInicial={SERGIO} onCancelar={vi.fn()} />)
    expect(screen.getByPlaceholderText(/buscar cliente/i)).toHaveValue('Sergio Cutiño')
    expect(screen.getByLabelText('Sociedad')).toHaveValue('COOP')
    expect(screen.getByTestId('btn-anticipo-aceptar')).toHaveAttribute('disabled')
  })

  it('al aceptar, debería mostrar N° documento, importe, vencimiento, asignación y texto de la solicitud', async () => {
    renderWithProviders(<AnticipoCajaDialog open clienteInicial={SERGIO} onCancelar={vi.fn()} />)
    setUI5InputValue(screen.getByLabelText('Nº documento'), '1400000113')
    setUI5InputValue(screen.getByLabelText('Ejercicio'), '2026')
    await waitFor(() => expect(screen.getByTestId('btn-anticipo-aceptar')).not.toHaveAttribute('disabled'))
    fireEvent.click(screen.getByTestId('btn-anticipo-aceptar'))

    const detalle = await screen.findByTestId('anticipo-detalle')
    expect(detalle).toHaveTextContent('1400000113')
    expect(screen.getByTestId('anticipo-importe')).toHaveTextContent('$55.000')
    expect(detalle).toHaveTextContent('Vencimiento: 20/10/2026')
    expect(detalle).toHaveTextContent('Asignación: santander')
    expect(detalle).toHaveTextContent('Texto: PRUEBA ANTICIPO')
  })

  it('debería mostrar el rechazo cuando la solicitud no existe para el cliente', async () => {
    renderWithProviders(<AnticipoCajaDialog open clienteInicial={SERGIO} documentoInicial="999" ejercicioInicial="2026" onCancelar={vi.fn()} />)
    expect(await screen.findByTestId('anticipo-error')).toHaveTextContent('No existe el documento 999')
    expect(screen.queryByTestId('anticipo-detalle')).not.toBeInTheDocument()
  })

  it('"Ir a pagar" debería abrir la pantalla de pago en modo anticipo', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<AnticipoCajaDialog open clienteInicial={SERGIO} documentoInicial="1400000113" ejercicioInicial="2026" onCancelar={vi.fn()} />} />
        <Route path="/caja/pago" element={<div data-testid="pantalla-pago">{window.location.search}</div>} />
      </Routes>,
    )
    fireEvent.click(await screen.findByTestId('btn-anticipo-ir-pagar'))
    expect(await screen.findByTestId('pantalla-pago')).toBeInTheDocument()
    expect(window.location.search).toBe('?fuente=sap&modo=anticipo&kunnr=10000003&docs=1400000113-001-2026')
  })
})
