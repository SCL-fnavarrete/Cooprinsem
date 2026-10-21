import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { AntClientePanel } from './AntClientePanel'
import { renderWithProviders } from '@/test/helpers'
import { server } from '@/services/mock/server'

const BASE = 'http://localhost:3001'

// Escribe en el buscador de clientes y elige la sugerencia (UI5 Input:
// onSelectionChange con el atributo `text` del ui5-suggestion-item).
async function seleccionarCliente(busqueda: string, nombre: string) {
  const input = screen.getByPlaceholderText(/buscar cliente/i)
  Object.defineProperty(input, 'value', { value: busqueda, writable: true, configurable: true })
  fireEvent.input(input, { target: { value: busqueda } })
  const item = await waitFor(() => {
    const encontrado = document.querySelector(`ui5-suggestion-item[text*="${nombre}"]`)
    expect(encontrado).not.toBeNull()
    return encontrado as HTMLElement
  }, { timeout: 3000 })
  fireEvent(input, new CustomEvent('selection-change', { detail: { item }, bubbles: true }))
}

describe('AntClientePanel', () => {
  it('debería mostrar el buscador de clientes sin el botón Cliente Boleta', () => {
    renderWithProviders(<AntClientePanel />)
    expect(screen.getByText('Anticipo de Cliente')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Búsqueda cliente SAP_CLIENTES')).toBeInTheDocument()
    expect(screen.queryByText('Cliente Boleta')).not.toBeInTheDocument()
  })

  it('debería listar las solicitudes de anticipo abiertas del cliente desde SAP', async () => {
    renderWithProviders(<AntClientePanel />)
    await seleccionarCliente('Sergio', 'Sergio Cutiño')
    expect(await screen.findByTestId('tabla-anticipos')).toBeInTheDocument()
    expect(screen.getByText('1400000113')).toBeInTheDocument()
    expect(screen.getByText('1400000114')).toBeInTheDocument()
    expect(screen.getByText('$55.000')).toBeInTheDocument()
    expect(screen.getAllByText('santander')).toHaveLength(2)
  })

  it('debería avisar cuando el cliente no tiene solicitudes abiertas', async () => {
    server.use(http.get(`${BASE}/api/sap-cta-cte/anticipos/solicitudes`, () => HttpResponse.json({ success: true, total: 0, data: [] })))
    renderWithProviders(<AntClientePanel />)
    await seleccionarCliente('Sergio', 'Sergio Cutiño')
    expect(await screen.findByTestId('sin-anticipos')).toHaveTextContent('no tiene solicitudes de anticipo abiertas')
  })

  it('debería mostrar el error de SAP al consultar las solicitudes', async () => {
    server.use(http.get(`${BASE}/api/sap-cta-cte/anticipos/solicitudes`, () =>
      HttpResponse.json({ success: false, message: 'Error al consultar las solicitudes de anticipo en SAP' }, { status: 500 })))
    renderWithProviders(<AntClientePanel />)
    await seleccionarCliente('Sergio', 'Sergio Cutiño')
    expect(await screen.findByTestId('error-anticipos')).toHaveTextContent('Error al consultar las solicitudes')
  })

  it('al elegir una solicitud, debería abrir el popup con sus datos', async () => {
    renderWithProviders(<AntClientePanel />)
    await seleccionarCliente('Sergio', 'Sergio Cutiño')
    fireEvent.click(await screen.findByTestId('seleccionar-1400000114'))
    expect(await screen.findByTestId('anticipo-detalle')).toBeInTheDocument()
    expect(screen.getByTestId('anticipo-importe')).toHaveTextContent('$65.000')
    expect(screen.getByTestId('btn-anticipo-ir-pagar')).toBeInTheDocument()
  })

  it('debería mostrar la caja de pendientes solo en modo técnico', () => {
    renderWithProviders(<AntClientePanel />)
    expect(screen.getByTestId('pendientes-ant-cliente')).toBeInTheDocument()
  })
})
