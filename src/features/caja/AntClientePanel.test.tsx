import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { AntClientePanel } from './AntClientePanel'
import { renderWithProviders } from '@/test/helpers'

// Escribe en el buscador de clientes y elige la sugerencia como lo hace UI5 con
// Enter o clic: "change" con el texto de la sugerencia (las flechas solo marcan).
async function seleccionarCliente(busqueda: string, nombre: string) {
  const input = screen.getByPlaceholderText(/buscar cliente/i)
  Object.defineProperty(input, 'value', { value: busqueda, writable: true, configurable: true })
  fireEvent.input(input, { target: { value: busqueda } })
  const item = await waitFor(() => {
    const encontrado = document.querySelector(`ui5-suggestion-item[text*="${nombre}"]`)
    expect(encontrado).not.toBeNull()
    return encontrado as HTMLElement
  }, { timeout: 3000 })
  ;(input as unknown as { value: string }).value = item.getAttribute('text') ?? ''
  fireEvent.change(input)
}

// La selección de la solicitud está en el popup "Anticipos" (ver AnticipoCajaDialog.test.tsx)
describe('AntClientePanel', () => {
  it('debería mostrar el buscador de clientes sin el botón Cliente Boleta y sin select en la pantalla', () => {
    renderWithProviders(<AntClientePanel />)
    expect(screen.getByText('Anticipo de Cliente')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Búsqueda cliente SAP_CLIENTES')).toBeInTheDocument()
    expect(screen.queryByText('Cliente Boleta')).not.toBeInTheDocument()
    expect(screen.queryByTestId('select-anticipo')).not.toBeInTheDocument()
  })

  it('al elegir el cliente debería abrir el popup con el cliente y el select de sus solicitudes abiertas', async () => {
    renderWithProviders(<AntClientePanel />)
    await seleccionarCliente('Sergio', 'Sergio Cutiño')
    expect(await screen.findByTestId('anticipo-dialog')).toBeInTheDocument()
    expect(await screen.findByTestId('select-anticipo')).toBeInTheDocument()
    expect(screen.getByText('1400000113 · $55.000 · vence 20/10/2026 · PRUEBA ANTICIPO')).toBeInTheDocument()
  })

  it('el botón "Anticipo" debería abrir el popup vacío', async () => {
    renderWithProviders(<AntClientePanel />)
    fireEvent.click(screen.getByTestId('btn-anticipo'))
    expect(await screen.findByTestId('anticipo-dialog')).toBeInTheDocument()
    // Sin cliente todavía: se ve el campo para digitar el N°
    expect(screen.getByLabelText('Nº documento')).toBeInTheDocument()
  })

  it('debería mostrar la caja de pendientes solo en modo técnico', () => {
    renderWithProviders(<AntClientePanel />)
    expect(screen.getByTestId('pendientes-ant-cliente')).toBeInTheDocument()
  })
})
