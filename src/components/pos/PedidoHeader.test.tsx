import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
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
  retira: '',
  descuentoPorcentaje: 0,
  patente: '',
  nombreConductor: '',
  rutConductor: '',
  despacho: '',
  recargoFlete: 0,
  destinatarioMercancia: '',
  quienRetira: '',
}

const clienteTest = {
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

  describe('grupos de cabecera', () => {
    it('agrupa Descuento %, Despacho y Recargo Flete en "Descuentos y recargos" y quita el input Retira', () => {
      renderWithProviders(<PedidoHeader {...defaultProps} clienteSeleccionado={clienteTest} />)
      const grupo = screen.getByTestId('grupo-descuentos-recargos')
      expect(grupo).toHaveTextContent('Descuentos y recargos')
      expect(grupo).toContainElement(screen.getByLabelText('Descuento porcentaje'))
      expect(grupo).toContainElement(screen.getByLabelText('Despacho'))
      expect(grupo).toContainElement(screen.getByLabelText('Recargo flete'))
      expect(screen.queryByLabelText('Retira')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Quien retira')).toBeInTheDocument()
    })
  })

  describe('descuentos y recargos solo numéricos', () => {
    it('debería aceptar solo dígitos en Descuento % y limitarlo a 100', () => {
      const onHeaderChange = vi.fn()
      renderWithProviders(<PedidoHeader {...defaultProps} onHeaderChange={onHeaderChange} clienteSeleccionado={clienteTest} />)
      fireEvent.input(screen.getByLabelText('Descuento porcentaje'), { target: { value: '1x5' } })
      expect(onHeaderChange).toHaveBeenLastCalledWith({ descuentoPorcentaje: 15 })
      fireEvent.input(screen.getByLabelText('Descuento porcentaje'), { target: { value: '150' } })
      expect(onHeaderChange).toHaveBeenLastCalledWith({ descuentoPorcentaje: 100 })
    })

    it('debería aceptar solo dígitos en Recargo Flete (CLP entero)', () => {
      const onHeaderChange = vi.fn()
      renderWithProviders(<PedidoHeader {...defaultProps} onHeaderChange={onHeaderChange} clienteSeleccionado={clienteTest} />)
      fireEvent.input(screen.getByLabelText('Recargo flete'), { target: { value: '1.500' } })
      expect(onHeaderChange).toHaveBeenLastCalledWith({ recargoFlete: 1500 })
    })
  })

  describe('grupo Transporte (PE-26)', () => {
    it('muestra Patente, Nombre Conductor y Rut Conductor agrupados en Transporte', () => {
      renderWithProviders(<PedidoHeader {...defaultProps} clienteSeleccionado={clienteTest} />)
      const grupo = screen.getByTestId('grupo-transporte')
      expect(grupo).toHaveTextContent('Transporte')
      expect(screen.getByLabelText('Patente')).toBeInTheDocument()
      expect(screen.getByLabelText('Nombre conductor')).toBeInTheDocument()
      expect(screen.getByLabelText('Rut conductor')).toBeInTheDocument()
      expect(grupo).toContainElement(screen.getByLabelText('Patente'))
    })

    it('debería pasar la patente a mayúsculas', () => {
      const onHeaderChange = vi.fn()
      renderWithProviders(<PedidoHeader {...defaultProps} onHeaderChange={onHeaderChange} clienteSeleccionado={clienteTest} />)
      fireEvent.input(screen.getByLabelText('Patente'), { target: { value: 'ab-cd-12' } })
      expect(onHeaderChange).toHaveBeenCalledWith({ patente: 'AB-CD-12' })
    })

    it('debería formatear el RUT del conductor válido al salir del campo', () => {
      const onHeaderChange = vi.fn()
      renderWithProviders(<PedidoHeader {...defaultProps} onHeaderChange={onHeaderChange} clienteSeleccionado={clienteTest} />)
      const input = screen.getByLabelText('Rut conductor') as HTMLInputElement
      input.value = '123456785'
      fireEvent.change(input, { target: { value: '123456785' } })
      expect(onHeaderChange).toHaveBeenCalledWith({ rutConductor: '12.345.678-5' })
    })

    it('debería marcar en rojo un RUT del conductor inválido', () => {
      renderWithProviders(
        <PedidoHeader {...defaultProps} header={{ ...defaultHeader, rutConductor: '12.345.678-9' }} clienteSeleccionado={clienteTest} />,
      )
      expect(screen.getByLabelText('Rut conductor')).toHaveAttribute('value-state', 'Negative')
    })
  })
})
