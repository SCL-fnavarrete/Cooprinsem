import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { PedidoHeader } from './PedidoHeader'
import { renderWithProviders } from '@/test/helpers'
import type { IPedidoHeader } from '@/types/pedido'

const defaultHeader: IPedidoHeader = {
  codigoCliente: '',
  canalDistribucion: 'Venta Mesón',
  // Debe coincidir con la descripción real en pos_documento_venta (ver usePedido.ts) —
  // la BD usa "Venta normal" (n minúscula), no "Venta Normal".
  tipoDocumento: 'Venta normal',
  referencia: '',
  observaciones: '',
  ubicacionPredio: '',
}

describe('PedidoHeader', () => {
  const defaultProps = {
    header: defaultHeader,
    onHeaderChange: vi.fn(),
    clienteSeleccionado: null,
    onClienteSeleccionado: vi.fn(),
    onClienteDeseleccionado: vi.fn(),
    sucursal: 'D190',
  }

  it('renderiza los selectores de canal y tipo documento', async () => {
    renderWithProviders(<PedidoHeader {...defaultProps} />)
    // Los selects de UI5 renderizan sus opciones tras cargar canales/documentos vía API
    await waitFor(() => {
      expect(screen.getByText('Venta Mesón')).toBeInTheDocument()
      expect(screen.getByText('Venta normal')).toBeInTheDocument()
    })
  })

  it('renderiza el campo de referencia', () => {
    renderWithProviders(<PedidoHeader {...defaultProps} />)
    expect(screen.getByPlaceholderText(/orden de compra/i)).toBeInTheDocument()
  })

  it('incluye el componente ClienteSearch', () => {
    renderWithProviders(<PedidoHeader {...defaultProps} />)
    expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument()
  })

  it('muestra campos de solo lectura cuando hay cliente seleccionado', () => {
    const cliente = {
      codigoCliente: '0001000001',
      nombre: 'Test',
      rut: '76.543.210-3',
      condicionPago: '30D',
      estadoCredito: 'AL_DIA' as const,
      creditoAsignado: 5000000,
      creditoUtilizado: 1000000,
      porcentajeAgotamiento: 20,
      sucursal: 'D190',
    }
    renderWithProviders(
      <PedidoHeader {...defaultProps} clienteSeleccionado={cliente} />
    )
    expect(screen.getByLabelText('Centro')).toBeInTheDocument()
    expect(screen.getByLabelText('Condición de pago')).toBeInTheDocument()
  })
})
