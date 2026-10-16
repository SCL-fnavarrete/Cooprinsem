import { describe, it, expect } from 'vitest'
import {
  salesOrder10, posicion6, sinCeros, itemsFacturables, construirBodyFactura, construirBodyFolio,
  interpretarFolio, mensajeErrorSap, hoyChile,
} from './sapFacturasBody'

describe('formato de números SAP', () => {
  it('debería completar pedido a 10 dígitos y posición a 6', () => {
    expect(salesOrder10('1234')).toBe('0000001234')
    expect(posicion6('10')).toBe('000010')
    expect(sinCeros('0090000123')).toBe('90000123')
  })
})

describe('itemsFacturables', () => {
  it('debería tomar posición, cantidad y unidad de SAP y omitir rechazadas o en cero', () => {
    const items = itemsFacturables({
      to_Item: {
        results: [
          { SalesOrderItem: '10', RequestedQuantity: '10.000', RequestedQuantityUnit: 'UN', SalesDocumentRjcnReason: '' },
          { SalesOrderItem: '20', RequestedQuantity: '2', RequestedQuantityUnit: 'KG', SalesDocumentRjcnReason: 'Z1' },
          { SalesOrderItem: '30', RequestedQuantity: '0', RequestedQuantityUnit: 'UN' },
        ],
      },
    })
    expect(items).toEqual([{ SDDocumentItem: '000010', BillingQuantity: 10, BillingQuantityUnit: 'UN' }])
  })
})

describe('construirBodyFactura', () => {
  it('debería armar la referencia mínima que SAP aceptó (pedido completo)', () => {
    expect(construirBodyFactura({ salesOrder: '83', claseFactura: 'ZV01', fecha: '2026-10-16' })).toEqual({
      _Control: { DefaultBillingDocumentDate: '2026-10-16', DefaultBillingDocumentType: 'ZV01', AutomPostingToAcctgIsDisabled: false, CutOffBillingDocumentDate: null },
      _Reference: [{ SDDocument: '0000000083', SDDocumentCategory: 'C' }],
    })
  })
})

describe('construirBodyFolio', () => {
  it('debería usar la clase del pedido como Fkart y los números sin ceros', () => {
    expect(construirBodyFolio({
      billingDocument: '0090000123', salesOrganization: 'COOP', centro: 'D190', canal: 'VM', clasePedido: 'ZV01', salesOrder: '0000001234',
    })).toEqual({ Vbeln: '90000123', Vkorg: 'COOP', Werks: 'D190', Vtweg: 'VM', Fkart: 'ZV01', Pedido: '1234', IndExencion: '0' })
  })
})

describe('interpretarFolio', () => {
  it('debería aceptar solo DOK con MsgType S y folio', () => {
    expect(interpretarFolio({ Folio: '123456', MsgType: 'S', Zcodigo: 'DOK', Message: 'folio 123456 asignado con éxito' }))
      .toEqual({ ok: true, folio: '123456', codigo: 'DOK', mensaje: 'folio 123456 asignado con éxito' })
  })

  it('debería devolver el detalle de Zlog si el SII rechaza', () => {
    const r = interpretarFolio({ Folio: '', MsgType: 'E', Zcodigo: 'ERF', Message: 'Factura 0090000123 — error folio', Zlog: 'RUT receptor no válido' })
    expect(r.ok).toBe(false)
    expect(r.codigo).toBe('ERF')
    expect(r.mensaje).toBe('Factura 0090000123 — error folio — RUT receptor no válido')
  })

  it('debería avisar si no vino estado (job sin terminar)', () => {
    const r = interpretarFolio({})
    expect(r.ok).toBe(false)
    expect(r.codigo).toBe('???')
    expect(r.mensaje).toMatch(/60 s/)
  })
})

describe('mensajeErrorSap', () => {
  it('debería leer el formato V4 (message como texto y details)', () => {
    expect(mensajeErrorSap({ response: { data: { error: { message: 'Item already fully billed', details: [{ message: 'Posición 10' }] } } } }))
      .toBe('Item already fully billed — Posición 10')
  })
  it('debería leer el formato V2 (message.value)', () => {
    expect(mensajeErrorSap({ response: { data: { error: { message: { value: 'CSRF token validation failed' } } } } })).toBe('CSRF token validation failed')
  })
})

describe('hoyChile', () => {
  it('debería usar la fecha de Chile y no la UTC', () => {
    // 02:00 UTC del 17-10 = 23:00 del 16-10 en Chile (UTC-3)
    expect(hoyChile(new Date('2026-10-17T02:00:00Z'))).toBe('2026-10-16')
  })
})
