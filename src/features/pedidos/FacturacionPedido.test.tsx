import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { renderWithProviders } from '@/test/helpers'
import { FacturacionPedido } from './FacturacionPedido'
import { correspondeFacturar } from '@/services/api/sapFacturas'

beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

const BASE = 'http://localhost:3001'
const props = { salesOrder: '83', centro: 'D190', tipoDocumento: 'Venta normal', tipoComprobante: 'Factura', canalDistribucion: 'Venta Mesón' }

describe('correspondeFacturar', () => {
  it('debería facturar solo Venta normal + Factura', () => {
    expect(correspondeFacturar('Venta normal', 'Factura')).toBe(true)
    expect(correspondeFacturar('Venta normal', 'Boleta')).toBe(false)
    expect(correspondeFacturar('Venta Boleta', 'Factura')).toBe(false)
  })
})

describe('FacturacionPedido', () => {
  beforeEach(() => localStorage.clear())

  it('debería mostrar los 3 pasos, el modo de prueba y el JSON de la factura propuesta', async () => {
    renderWithProviders(<FacturacionPedido {...props} />)
    expect(await screen.findByTestId('facturacion-paso-2')).toBeInTheDocument()
    expect(screen.getByTestId('facturacion-paso-1-estado')).toHaveTextContent('Listo')
    expect(screen.getByTestId('facturacion-paso-2-estado')).toHaveTextContent('Solo JSON (no enviado)')
    expect(screen.getByTestId('facturacion-paso-3-estado')).toHaveTextContent('No se intentó')
    expect(screen.getByTestId('facturacion-modo')).toHaveTextContent('FACTURA_SAP_HABILITADO = N')
    // POST de la factura: JSON de ida visible
    expect(screen.getByTestId('facturacion-paso-2-llamada-1-enviado')).toHaveTextContent('"SDDocument": "0000000083"')
    // GET de búsqueda: respuesta visible
    expect(screen.getByTestId('facturacion-paso-2-llamada-0-respuesta')).toHaveTextContent('"value"')
    expect(screen.queryByTestId('btn-reintentar-factura')).not.toBeInTheDocument()
    expect(screen.getByTestId('pendientes-facturacion')).toBeInTheDocument()
  })

  it('debería permitir reintentar cuando un paso falla', async () => {
    let llamadas = 0
    server.use(http.post(`${BASE}/api/sap-facturas/emitir`, () => {
      llamadas++
      return HttpResponse.json({
        success: false, salesOrder: '83', modo: { factura: 'S', folio: 'S', claseFactura: 'ZF2' },
        pasos: [
          { paso: 1, nombre: 'Pedido', estado: 'ok', mensaje: 'Pedido SAP N° 83', llamadas: [] },
          { paso: 2, nombre: 'Factura', estado: 'ok', mensaje: 'Factura 90000123 creada y contabilizada.', llamadas: [] },
          { paso: 3, nombre: 'Folio', estado: 'error', mensaje: 'Sin folio (ERF): RUT receptor no válido.', llamadas: [
            { descripcion: 'Solicitar el folio (PrintInvoiceSet)', metodo: 'POST', url: 'https://sap/PrintInvoiceSet', body: { Vbeln: '90000123' }, status: 201, respuesta: { d: { Zcodigo: 'ERF', Zlog: 'RUT receptor no válido' } } },
          ] },
        ],
      })
    }))
    renderWithProviders(<FacturacionPedido {...props} />)
    expect(await screen.findByTestId('facturacion-paso-3-estado')).toHaveTextContent('Error')
    expect(screen.getByTestId('facturacion-paso-3-llamada-0-respuesta')).toHaveTextContent('RUT receptor no válido')
    fireEvent.click(screen.getByTestId('btn-reintentar-factura'))
    await screen.findByTestId('facturacion-paso-3-estado')
    expect(llamadas).toBe(2)
  })

  it('debería avisar el N° de factura obtenido (sin ceros) para el mensaje de éxito', async () => {
    server.use(http.post(`${BASE}/api/sap-facturas/emitir`, () => HttpResponse.json({
      success: true, salesOrder: '83', modo: { factura: 'S', folio: 'N', claseFactura: 'ZV01' },
      pasos: [
        { paso: 1, nombre: 'Pedido', estado: 'ok', mensaje: 'Pedido SAP N° 83', llamadas: [] },
        { paso: 2, nombre: 'Factura', estado: 'ok', mensaje: 'Factura 90000050 creada y contabilizada.', llamadas: [],
          datos: { billingDocument: '0090000050', docContable: '1800000051' } },
        { paso: 3, nombre: 'Folio', estado: 'propuesta', mensaje: 'FOLIO_SAP_HABILITADO = N', llamadas: [] },
      ],
    })))
    const onFactura = vi.fn()
    renderWithProviders(<FacturacionPedido {...props} onFactura={onFactura} />)
    await waitFor(() => expect(onFactura).toHaveBeenCalledWith({ numero: '90000050', docContable: '1800000051' }))
  })

  it('no debería avisar factura en modo solo JSON', async () => {
    const onFactura = vi.fn()
    renderWithProviders(<FacturacionPedido {...props} onFactura={onFactura} />)
    await screen.findByTestId('facturacion-paso-2')
    expect(onFactura).not.toHaveBeenCalled()
  })

  it('debería mostrar el rechazo del backend si no corresponde facturar', async () => {
    renderWithProviders(<FacturacionPedido {...props} tipoComprobante="Boleta" />)
    expect(await screen.findByTestId('facturacion-rechazo')).toHaveTextContent('Venta normal')
  })
})
