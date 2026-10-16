// Facturación del pedido POS — funciones puras (sin llamadas a SAP), testeadas
// en sapFacturasBody.test.ts. Documento de José Castillo "Creación de factura
// POS — ejemplo de los 3 pasos SAP" (16-10-2026):
//   1. API_SALES_ORDER_SRV (V2)  → SalesOrder (ya implementado en sapPedidos.ts)
//   2. API_BILLINGDOCUMENT (V4)  → BillingDocument (action CreateFromSDDocument)
//   3. ZPOS_PRINT_SRV (V2)       → Folio DTE (PrintInvoiceSet)

/** Pedido SD con ceros a la izquierda (10 dígitos), como lo espera la V4. */
export function salesOrder10(salesOrder: string): string {
  const limpio = String(salesOrder ?? '').trim()
  return /^\d+$/.test(limpio) ? limpio.padStart(10, '0') : limpio
}

/** Posición SD con 6 dígitos (10 → "000010"). */
export function posicion6(item: string): string {
  const limpio = String(item ?? '').trim()
  return /^\d+$/.test(limpio) ? limpio.padStart(6, '0') : limpio
}

export function sinCeros(valor: string): string {
  return String(valor ?? '').trim().replace(/^0+(?=\d)/, '')
}

export interface IItemFacturable {
  SDDocumentItem: string
  BillingQuantity: number
  BillingQuantityUnit: string
}

/**
 * Posiciones del pedido a facturar, leídas desde SAP (A_SalesOrder?$expand=to_Item)
 * y no desde el carro del POS: así la posición, cantidad y unidad son las que
 * quedaron en SAP. Se omiten las rechazadas y las de cantidad 0. Venta mesón:
 * se factura la cantidad completa (sin facturación parcial).
 */
export function itemsFacturables(pedidoV2: { to_Item?: { results?: Record<string, unknown>[] } } | undefined): IItemFacturable[] {
  const items = pedidoV2?.to_Item?.results ?? []
  return items
    .filter((it) => !String(it.SalesDocumentRjcnReason ?? '').trim())
    .map((it) => ({
      SDDocumentItem: posicion6(String(it.SalesOrderItem ?? '')),
      BillingQuantity: Number(it.RequestedQuantity) || 0,
      BillingQuantityUnit: String(it.RequestedQuantityUnit ?? '').trim(),
    }))
    .filter((it) => it.BillingQuantity > 0)
}

export interface IBodyFactura {
  _Control: {
    DefaultBillingDocumentDate: string
    DefaultBillingDocumentType: string
    AutomPostingToAcctgIsDisabled: boolean
    CutOffBillingDocumentDate: null
  }
  _Reference: {
    SDDocument: string
    BillingDocumentType: string
    BillingDocumentDate: string
    SalesOrganization: string
    SDDocumentCategory: string
    DestinationCountry: string
    _Item: IItemFacturable[]
  }[]
}

/**
 * Body de CreateFromSDDocument (paso 2). SDDocumentCategory "C" = pedido de
 * ventas (se factura sin entrega). AutomPostingToAcctgIsDisabled false: la
 * factura queda contabilizada en FI y aparece como partida abierta en Caja.
 */
export function construirBodyFactura(p: {
  salesOrder: string
  items: IItemFacturable[]
  claseFactura: string
  fecha: string          // YYYY-MM-DD (hoy en Chile)
  salesOrganization: string
}): IBodyFactura {
  return {
    _Control: {
      DefaultBillingDocumentDate: p.fecha,
      DefaultBillingDocumentType: p.claseFactura,
      AutomPostingToAcctgIsDisabled: false,
      CutOffBillingDocumentDate: null,
    },
    _Reference: [{
      SDDocument: salesOrder10(p.salesOrder),
      BillingDocumentType: p.claseFactura,
      BillingDocumentDate: p.fecha,
      SalesOrganization: p.salesOrganization,
      SDDocumentCategory: 'C',
      DestinationCountry: 'CL',
      _Item: p.items,
    }],
  }
}

export interface IBodyFolio {
  Vbeln: string
  Vkorg: string
  Werks: string
  Vtweg: string
  Fkart: string
  Pedido: string
  IndExencion: string
}

/**
 * Body de PrintInvoiceSet (paso 3). Fkart = clase del PEDIDO (respuesta de José,
 * 16-10-2026): ZV01 = factura → ZGENERA_FOLIO; ZV02 = boleta → ZGENERA_FOLIO_BOLETA.
 * IndExencion fijo "0" hasta que SAP indique de dónde sale.
 */
export function construirBodyFolio(p: {
  billingDocument: string
  salesOrganization: string
  centro: string
  canal: string
  clasePedido: string
  salesOrder: string
}): IBodyFolio {
  return {
    Vbeln: sinCeros(p.billingDocument),
    Vkorg: p.salesOrganization,
    Werks: p.centro,
    Vtweg: p.canal,
    Fkart: p.clasePedido,
    Pedido: sinCeros(p.salesOrder),
    IndExencion: '0',
  }
}

export interface IResultadoFolio {
  ok: boolean
  folio: string
  codigo: string
  mensaje: string
}

/** Respuesta de PrintInvoiceSet: siempre HTTP 201; el estado real va en MsgType/Zcodigo. */
export function interpretarFolio(d: Record<string, unknown> | undefined): IResultadoFolio {
  const codigo = String(d?.Zcodigo ?? '').trim()
  const msgType = String(d?.MsgType ?? '').trim()
  const folio = String(d?.Folio ?? '').trim()
  const zlog = String(d?.Zlog ?? '').trim()
  const message = String(d?.Message ?? '').trim()
  const ok = codigo === 'DOK' && msgType === 'S' && !!folio
  const mensaje = ok ? message || `Folio ${folio} asignado` : [message, zlog && zlog !== message ? zlog : ''].filter(Boolean).join(' — ')
    || (codigo ? `SAP respondió ${codigo} sin detalle` : 'SAP no devolvió el estado del folio (el job puede no haber terminado en 60 s)')
  return { ok, folio, codigo: codigo || '???', mensaje }
}

/** Mensaje de error de SAP, en V2 (message.value) o V4 (message como texto). */
export function mensajeErrorSap(error: unknown): string {
  const e = error as { response?: { data?: { error?: { message?: unknown; details?: { message?: string }[] } } }; message?: string }
  const err = e?.response?.data?.error
  const principal = typeof err?.message === 'string'
    ? err.message
    : (err?.message as { value?: string } | undefined)?.value
  const detalles = (err?.details ?? []).map((x) => x.message).filter(Boolean)
  return [principal, ...detalles.filter((d) => d !== principal)].filter(Boolean).join(' — ') || e?.message || 'Error desconocido en SAP'
}

/** Hoy en Chile como YYYY-MM-DD (no UTC: de noche UTC ya es mañana). */
export function hoyChile(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora)
}
