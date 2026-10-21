import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AnticipoCajaDialog } from './AnticipoCajaDialog'
import { renderWithProviders } from '@/test/helpers'
import { crearClienteMock } from '@/test/factories'
import { server } from '@/services/mock/server'

const BASE = 'http://localhost:3001'
const SERGIO = crearClienteMock({ codigoCliente: '10000003', nombre: 'Sergio Cutiño', rut: '16029421-3' })

function setUI5InputValue(element: Element, value: string) {
  Object.defineProperty(element, 'value', { value, writable: true, configurable: true })
  fireEvent.input(element, { target: { value } })
}

// Elige una opción del select de solicitudes (UI5 Select: evento change con selectedOption)
function elegir(textoInicio: string) {
  const select = screen.getByTestId('select-anticipo')
  const opcion = [...select.querySelectorAll('ui5-option')].find((o) => o.textContent?.startsWith(textoInicio))
  fireEvent(select, new CustomEvent('change', { detail: { selectedOption: opcion } }))
}

describe('AnticipoCajaDialog', () => {
  it('con el cliente elegido debería listar sus solicitudes abiertas en un select', async () => {
    renderWithProviders(<AnticipoCajaDialog open clienteInicial={SERGIO} onCancelar={vi.fn()} />)
    expect(screen.getByPlaceholderText(/buscar cliente/i)).toHaveValue('Sergio Cutiño')
    expect(screen.getByLabelText('Sociedad')).toHaveValue('COOP')
    await screen.findByTestId('select-anticipo')
    expect(screen.getByText('— Seleccione una solicitud —')).toBeInTheDocument()
    expect(screen.getByText('1400000113 · $55.000 · vence 20/10/2026 · PRUEBA ANTICIPO')).toBeInTheDocument()
    expect(screen.getByText('1400000114 · $65.000 · vence 20/10/2026 · PRUEBA ANTICIPO')).toBeInTheDocument()
    expect(screen.getByText('Otro N° (digitar)')).toBeInTheDocument()
    expect(screen.getByTestId('btn-anticipo-aceptar')).toHaveAttribute('disabled')
  })

  it('al elegir una solicitud debería mostrar N° documento, importe, vencimiento, asignación y texto', async () => {
    renderWithProviders(<AnticipoCajaDialog open clienteInicial={SERGIO} onCancelar={vi.fn()} />)
    await screen.findByTestId('select-anticipo')
    elegir('1400000113')
    const detalle = await screen.findByTestId('anticipo-detalle')
    expect(detalle).toHaveTextContent('1400000113')
    expect(screen.getByTestId('anticipo-importe')).toHaveTextContent('$55.000')
    expect(detalle).toHaveTextContent('Vencimiento: 20/10/2026')
    expect(detalle).toHaveTextContent('Asignación: santander')
    expect(detalle).toHaveTextContent('Texto: PRUEBA ANTICIPO')
  })

  it('"Otro N° (digitar)" debería permitir ingresar el número y buscarlo con Aceptar', async () => {
    renderWithProviders(<AnticipoCajaDialog open clienteInicial={SERGIO} onCancelar={vi.fn()} />)
    await screen.findByTestId('select-anticipo')
    elegir('Otro N°')
    setUI5InputValue(await screen.findByLabelText('Nº documento'), '1400000114')
    await waitFor(() => expect(screen.getByTestId('btn-anticipo-aceptar')).not.toHaveAttribute('disabled'))
    fireEvent.click(screen.getByTestId('btn-anticipo-aceptar'))
    expect(await screen.findByTestId('anticipo-importe')).toHaveTextContent('$65.000')
  })

  it('sin solicitudes abiertas debería ofrecer digitar el N° y mostrar el rechazo si no existe', async () => {
    server.use(http.get(`${BASE}/api/sap-cta-cte/anticipos/solicitudes`, () => HttpResponse.json({ success: true, total: 0, data: [] })))
    renderWithProviders(<AnticipoCajaDialog open clienteInicial={SERGIO} onCancelar={vi.fn()} />)
    expect(await screen.findByTestId('anticipo-sin-abiertas')).toBeInTheDocument()
    expect(screen.queryByTestId('select-anticipo')).not.toBeInTheDocument()
    setUI5InputValue(screen.getByLabelText('Nº documento'), '999')
    await waitFor(() => expect(screen.getByTestId('btn-anticipo-aceptar')).not.toHaveAttribute('disabled'))
    fireEvent.click(screen.getByTestId('btn-anticipo-aceptar'))
    expect(await screen.findByTestId('anticipo-error')).toHaveTextContent('No existe el documento 999')
  })

  it('"Ir a pagar" debería abrir la pantalla de pago en modo anticipo', async () => {
    window.history.pushState({}, '', '/')
    renderWithProviders(
      <Routes>
        <Route path="/" element={<AnticipoCajaDialog open clienteInicial={SERGIO} onCancelar={vi.fn()} />} />
        <Route path="/caja/pago" element={<div data-testid="pantalla-pago" />} />
      </Routes>,
    )
    await screen.findByTestId('select-anticipo')
    elegir('1400000113')
    fireEvent.click(await screen.findByTestId('btn-anticipo-ir-pagar'))
    expect(await screen.findByTestId('pantalla-pago')).toBeInTheDocument()
    expect(window.location.search).toBe('?fuente=sap&modo=anticipo&kunnr=10000003&docs=1400000113-001-2026')
  })
})
