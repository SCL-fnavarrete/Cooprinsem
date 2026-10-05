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

  it('debería listar las partidas abiertas del cliente identificado con estado y total', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    expect(await screen.findByText('1800000009')).toBeInTheDocument()
    expect(screen.getByTestId('ctacte-total')).toHaveTextContent('4 partidas abiertas — Total: $108.180')
    expect(screen.getByText('Vencida (40 d)')).toBeInTheDocument()
    expect(screen.getByText('Por vencer')).toBeInTheDocument()
    expect(screen.getByText('Vigente')).toBeInTheDocument()
    expect(screen.getAllByText('No informado')).toHaveLength(4)
    expect(screen.getAllByText('D6 — Factura')).toHaveLength(2)
  })

  it('debería habilitar Pagos al seleccionar partidas y abrir la pantalla de pago con fuente SAP', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await screen.findByText('1800000009')
    expect(screen.getByTestId('ctacte-pagos')).toHaveAttribute('disabled')

    fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000009'))
    expect(screen.getByTestId('ctacte-total')).toHaveTextContent('Seleccionadas: 1 — $76.160')
    expect(screen.getByTestId('ctacte-pagos')).not.toHaveAttribute('disabled')

    fireEvent.click(screen.getByTestId('ctacte-pagos'))
    expect(window.location.pathname).toBe('/caja/pago')
    expect(window.location.search).toBe('?fuente=sap&kunnr=10000003&docs=1800000009-001-2026')
    window.history.pushState({}, '', '/')
  })

  it('debería marcar la factura ya pagada como pendiente de compensación y no permitir seleccionarla', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    expect(await screen.findByText('Pagada · pend. compensación')).toBeInTheDocument()
    const check = screen.getByLabelText('Seleccionar documento 1800000012') as HTMLInputElement
    expect(check).toBeDisabled()
    fireEvent.click(check)
    expect(screen.getByTestId('ctacte-pagos')).toHaveAttribute('disabled')
  })

  it('debería mostrar el aviso de pendientes de Pago Cta. Cte.', () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/Sucursal del documento/)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/Partidas CME/)
  })

  it('debería volver a Home con el botón Volver', () => {
    const onVolver = vi.fn()
    renderWithProviders(<PagoCtaCtePanel onVolver={onVolver} />)
    fireEvent.click(screen.getByText('Volver'))
    expect(onVolver).toHaveBeenCalled()
  })
})
