import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { PedidoHeader } from './PedidoHeader'
import { renderWithProviders } from '@/test/helpers'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
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

  it('debería mostrar el comprobante según la clase, sin el select Boleta / Factura', () => {
    const { unmount } = renderWithProviders(<PedidoHeader {...defaultProps} header={{ ...defaultHeader, tipoDocumento: 'Venta Boleta', claseDocumento: 'ZV02' }} />)
    expect(screen.getByTestId('indicador-comprobante')).toHaveTextContent('Comprobante: Boleta')
    expect(screen.queryByTestId('select-boleta-factura')).not.toBeInTheDocument()
    expect(screen.queryByText('Boleta / Factura')).not.toBeInTheDocument()
    unmount()

    renderWithProviders(<PedidoHeader {...defaultProps} header={{ ...defaultHeader, claseDocumento: 'ZV01' }} />)
    expect(screen.getByTestId('indicador-comprobante')).toHaveTextContent('Comprobante: Factura')
  })

  it('no debería mostrar comprobante en tipos por definir (Cotización, Notas)', () => {
    renderWithProviders(<PedidoHeader {...defaultProps} header={{ ...defaultHeader, tipoDocumento: 'Cotización normal', claseDocumento: 'ZC01' }} />)
    expect(screen.queryByTestId('indicador-comprobante')).not.toBeInTheDocument()
  })

  it('debería ofrecer Venta Boleta (ZV02) en el Tipo Documento', async () => {
    renderWithProviders(<PedidoHeader {...defaultProps} />)
    expect(await screen.findByText('Venta Boleta')).toBeInTheDocument()
  })

  it('al elegir el Cliente Boleta con una venta factura debería pasar a Venta Boleta', async () => {
    const onHeaderChange = vi.fn()
    const onClienteSeleccionado = vi.fn()
    renderWithProviders(
      <PedidoHeader {...defaultProps} header={{ ...defaultHeader, tipoDocumento: 'Venta Puesto Fundo', claseDocumento: 'ZV04' }}
        onHeaderChange={onHeaderChange} onClienteSeleccionado={onClienteSeleccionado} />
    )
    await screen.findByText('Venta normal')
    fireEvent.click(screen.getByText('Cliente Boleta'))
    await waitFor(() => expect(onClienteSeleccionado).toHaveBeenCalled())
    expect(onHeaderChange).toHaveBeenCalledWith({ tipoDocumento: 'Venta Boleta', claseDocumento: 'ZV02' })
  })

  it('con el Cliente Boleta y una venta factura debería avisar que no se puede grabar', () => {
    const header = { ...defaultHeader, tipoDocumento: 'Venta Puesto Fundo', claseDocumento: 'ZV04', codigoCliente: '999999' }
    const boleta = { ...clienteTest, codigoCliente: '999999', nombre: 'Cliente Boleta', rut: '' }
    renderWithProviders(<PedidoHeader {...defaultProps} header={header} clienteSeleccionado={boleta} />)
    expect(screen.getByTestId('aviso-cliente-boleta')).toHaveTextContent('solo se usa en ventas boleta')
  })

  it('con el Cliente Boleta en Venta Boleta (ZV02) no debería avisar', () => {
    const header = { ...defaultHeader, tipoDocumento: 'Venta Boleta', claseDocumento: 'ZV02', codigoCliente: '999999' }
    const boleta = { ...clienteTest, codigoCliente: '999999', nombre: 'Cliente Boleta', rut: '' }
    renderWithProviders(<PedidoHeader {...defaultProps} header={header} clienteSeleccionado={boleta} />)
    expect(screen.queryByTestId('aviso-cliente-boleta')).not.toBeInTheDocument()
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

  describe('Datos Generales', () => {
    it('agrupa Destinatario, Quien Retira, Centro, Condición Pago e ID Vendedor en una caja', () => {
      renderWithProviders(
        <PedidoHeader {...defaultProps} clienteSeleccionado={clienteTest} vendedor={{ id: 'u1', nombre: 'Vendedor', idVendedor: '22810200' }} />,
      )
      const grupo = screen.getByTestId('grupo-datos-generales')
      expect(grupo).toHaveTextContent('Datos Generales')
      for (const etiqueta of ['Destinatario mercancía', 'Quien retira', 'Centro', 'Condición de pago', 'ID Vendedor']) {
        expect(grupo).toContainElement(screen.getByLabelText(etiqueta))
      }
    })

    it('muestra la condición de pago de la simulación con su descripción', () => {
      renderWithProviders(
        <PedidoHeader {...defaultProps} clienteSeleccionado={{ ...clienteTest, condicionPago: '' }} condicionPagoSap={{ codigo: 'D001', descripcion: 'Credito Vcto. dia 12' }} />,
      )
      expect(screen.getByLabelText('Condición de pago')).toHaveValue('D001 - Credito Vcto. dia 12')
    })

    it('deja la condición de pago vacía con aviso antes de simular', () => {
      renderWithProviders(<PedidoHeader {...defaultProps} clienteSeleccionado={{ ...clienteTest, condicionPago: '' }} />)
      const campo = screen.getByLabelText('Condición de pago')
      expect(campo).toHaveValue('')
      expect(campo).toHaveAttribute('placeholder', 'Se obtiene al simular')
    })

    it('no muestra las cajas de la cabecera sin cliente seleccionado', () => {
      renderWithProviders(<PedidoHeader {...defaultProps} />)
      expect(screen.queryByTestId('grupo-datos-generales')).not.toBeInTheDocument()
      expect(screen.queryByTestId('grupo-transporte')).not.toBeInTheDocument()
    })

    it('Quien Retira lista solo interlocutores ZB del destinatario y permite dejarlo vacío', async () => {
      renderWithProviders(
        <PedidoHeader {...defaultProps} header={{ ...defaultHeader, destinatarioMercancia: '80000344' }} clienteSeleccionado={clienteTest} />,
      )
      expect(await screen.findByText(/90001424 - RETIRA UNO - ZB/)).toBeInTheDocument()
      expect(screen.getByText(/90001429 - RETIRA DOS - ZB/)).toBeInTheDocument()
      expect(screen.queryByText(/90009999/)).not.toBeInTheDocument()
      expect(screen.getByText('-- Sin quien retira --')).toBeInTheDocument()
    })
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

// Venta de combustible (ZV15, 21-10-2026): solo vendedores de terreno con bodega móvil
describe('PedidoHeader — venta de combustible', () => {
  const props = {
    header: defaultHeader,
    onHeaderChange: vi.fn(),
    clienteSeleccionado: null,
    onClienteSeleccionado: vi.fn(),
    onClienteDeseleccionado: vi.fn(),
    sucursal: 'D190',
  }
  const MALVARADO = { usuario: 'MALVARADO', encontrado: true, perfil: 'TERRENO_OSORNO_COMBUSTIBLE', canalPerfil: 'VT', bodegaMovil: '60000364', esVendedorTerreno: true, motivo: null }

  it('no debería ofrecer "Venta Combustible" ni el canal Venta Terreno a quien no es vendedor de terreno', async () => {
    renderWithProviders(<PedidoHeader {...props} vendedorTerreno={null} />)
    await waitFor(() => expect(screen.getByText('Venta normal')).toBeInTheDocument())
    expect(screen.queryByText('Venta Combustible')).not.toBeInTheDocument()
    expect(screen.queryByText('Venta Terreno')).not.toBeInTheDocument()
  })

  it('al elegir "Venta Combustible" debería fijar la clase ZV15 y el canal Venta Terreno', async () => {
    const onHeaderChange = vi.fn()
    renderWithProviders(<PedidoHeader {...props} onHeaderChange={onHeaderChange} vendedorTerreno={MALVARADO} />)
    const opcion = await screen.findByText('Venta Combustible')
    await screen.findByText('Venta Terreno')
    fireEvent(screen.getByLabelText('Tipo documento'), new CustomEvent('change', { detail: { selectedOption: opcion } }))
    expect(onHeaderChange).toHaveBeenCalledWith({ tipoDocumento: 'Venta Combustible', claseDocumento: 'ZV15', canalDistribucion: 'Venta Terreno' })
  })

  it('con combustible elegido debería mostrar la bodega móvil y bloquear el canal', async () => {
    const header = { ...defaultHeader, tipoDocumento: 'Venta Combustible', claseDocumento: 'ZV15', canalDistribucion: 'Venta Terreno' }
    renderWithProviders(<PedidoHeader {...props} header={header} vendedorTerreno={MALVARADO} />)
    expect(screen.getByLabelText('Bodega móvil')).toHaveValue('60000364')
    expect(screen.getByTestId('aviso-combustible')).toHaveTextContent('bodega móvil 60000364')
    expect(screen.getByLabelText('Canal distribución')).toHaveAttribute('disabled')
  })

  it('sin bodega móvil debería mostrar el motivo como error', () => {
    const header = { ...defaultHeader, tipoDocumento: 'Venta Combustible', claseDocumento: 'ZV15' }
    const sinBodega = { ...MALVARADO, bodegaMovil: '', motivo: 'El vendedor MALVARADO no tiene bodega móvil asignada (Admin > Tablas SAP > Usuario Vendedor).' }
    renderWithProviders(<PedidoHeader {...props} header={header} vendedorTerreno={sinBodega} />)
    expect(screen.getByTestId('aviso-combustible')).toHaveTextContent('no tiene bodega móvil asignada')
    expect(screen.getByLabelText('Bodega móvil')).toHaveValue('Sin asignar')
  })
})

// Selección automática de destinatario y persona que retira (29-10-2026)
describe('PedidoHeader — selección automática de interlocutores', () => {
  const props = { onClienteSeleccionado: vi.fn(), onClienteDeseleccionado: vi.fn(), sucursal: 'D190' }
  const interlocutores = (porCliente: Record<string, [string, string][]>) =>
    server.use(http.get('http://localhost:3001/api/sap-maestro/interlocutores', ({ request }) => {
      const customer = new URL(request.url).searchParams.get('customer') ?? ''
      const results = (porCliente[customer] ?? []).map(([PartnerFunction, BPCustomerNumber], i) =>
        ({ id: i + 1, Customer: customer, PartnerFunction, BPCustomerNumber, CustomerName: `NOMBRE ${BPCustomerNumber}` }))
      return HttpResponse.json({ d: { results } })
    }))

  it('con un solo destinatario (repetido por área de venta) debería elegirlo', async () => {
    interlocutores({ '0001000001': [['SH', '80000344'], ['SH', '80000344'], ['SP', '0001000001']] })
    const onHeaderChange = vi.fn()
    renderWithProviders(<PedidoHeader {...props} header={defaultHeader} onHeaderChange={onHeaderChange} clienteSeleccionado={clienteTest} />)
    await waitFor(() => expect(onHeaderChange).toHaveBeenCalledWith({ destinatarioMercancia: '80000344' }))
  })

  it('con varios destinatarios no debería elegir ninguno', async () => {
    interlocutores({ '0001000001': [['SH', '0001000001'], ['SH', '80000344']] })
    const onHeaderChange = vi.fn()
    renderWithProviders(<PedidoHeader {...props} header={defaultHeader} onHeaderChange={onHeaderChange} clienteSeleccionado={clienteTest} />)
    await waitFor(() => expect(onHeaderChange).toHaveBeenCalledWith({ destinatarioMercancia: '' }))
    expect(onHeaderChange).not.toHaveBeenCalledWith({ destinatarioMercancia: '80000344' })
  })

  it('con varios destinatarios debería elegir el que viene de Clientes > Buscar', async () => {
    interlocutores({ '0001000001': [['SH', '0001000001'], ['SH', '80000344']] })
    const onHeaderChange = vi.fn()
    renderWithProviders(<PedidoHeader {...props} header={defaultHeader} onHeaderChange={onHeaderChange} clienteSeleccionado={clienteTest} destinatarioPreferido="80000344" />)
    await waitFor(() => expect(onHeaderChange).toHaveBeenCalledWith({ destinatarioMercancia: '80000344' }))
  })

  it('con una sola persona que retira debería elegirla; con varias, ninguna', async () => {
    interlocutores({ '80000344': [['ZB', '90001424'], ['ZB', '90001424']], '80000400': [['ZB', '90001424'], ['ZB', '90001429']] })
    const onHeaderChange = vi.fn()
    const { unmount } = renderWithProviders(<PedidoHeader {...props} header={{ ...defaultHeader, destinatarioMercancia: '80000344' }} onHeaderChange={onHeaderChange} clienteSeleccionado={null} />)
    await waitFor(() => expect(onHeaderChange).toHaveBeenCalledWith({ quienRetira: '90001424' }))
    unmount()

    const onHeaderChange2 = vi.fn()
    renderWithProviders(<PedidoHeader {...props} header={{ ...defaultHeader, destinatarioMercancia: '80000400' }} onHeaderChange={onHeaderChange2} clienteSeleccionado={null} />)
    await waitFor(() => expect(onHeaderChange2).toHaveBeenCalledWith({ quienRetira: '' }))
    await new Promise((r) => setTimeout(r, 100))
    expect(onHeaderChange2).not.toHaveBeenCalledWith({ quienRetira: '90001424' })
  })
})
