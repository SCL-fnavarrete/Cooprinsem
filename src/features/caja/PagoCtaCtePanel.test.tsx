import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { PagoCtaCtePanel } from './PagoCtaCtePanel'

function escribir(label: string, valor: string) {
  const input = screen.getByLabelText(label) as HTMLInputElement
  input.value = valor
  fireEvent.input(input, { target: { value: valor } })
}

describe('PagoCtaCtePanel', () => {
  it('debería exigir RUT o Cliente para identificar al cliente', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    expect(await screen.findByText('Ingrese el RUT o el código de Cliente')).toBeInTheDocument()
  })

  it('debería rechazar un RUT inválido', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '96.719.960-0')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    expect(await screen.findByText('El RUT ingresado no es válido')).toBeInTheDocument()
  })

  it('debería identificar al cliente por RUT completo y completar Cliente y Nombre', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '96.719.960-5')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('10042446')
  })

  it('debería identificar al cliente por código', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10042446')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
  })

  it('debería pedir elegir cuando hay varios clientes con el mismo RUT', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '16.029.421-3')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    expect(await screen.findByText(/Hay 2 clientes con este RUT/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('10000003 — Sergio Cutiño'))
    expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('Sergio Cutiño')
  })

  it('debería cargar el nombre automáticamente al salir del campo RUT', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '96.719.960-5')
    fireEvent.change(screen.getByLabelText('Rut'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('10042446')
  })

  it('debería cargar el nombre automáticamente al salir del campo Cliente, aunque el RUT tenga un valor anterior', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '16.029.421-3')
    escribir('Cliente', '10042446')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
  })

  it('debería volver a Home con el botón Volver', () => {
    const onVolver = vi.fn()
    renderWithProviders(<PagoCtaCtePanel onVolver={onVolver} />)
    fireEvent.click(screen.getByText('Volver'))
    expect(onVolver).toHaveBeenCalled()
  })
})
