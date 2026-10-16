import { API_BASE_URL } from './config'
import { clavePartidaCtaCte, motivoNoPagable } from '@/types/ctaCte'
import type { IPartidasCtaCteResult, IPagoCtaCteParams, IPreviewPagoCtaCte, IResultadoPagoCtaCte, IDocumentoHomeSap, IDocumentosHomeResult } from '@/types/ctaCte'
import type { IDocumentoCaja, Semaforo } from '@/types/caja'
import { formatRUT } from '@/utils/format'

export interface IConsultaPartidasCtaCte {
  cliente: string
  venceHasta?: string  // YYYY-MM-DD
}

/**
 * Partidas abiertas del cliente (Caja > Pago Cta. Cte.). Nunca lanza por un
 * rechazo de negocio (success:false con `message`); solo por error de red.
 */
export async function getPartidasCtaCte(params: IConsultaPartidasCtaCte): Promise<IPartidasCtaCteResult> {
  const query = new URLSearchParams({ cliente: params.cliente })
  if (params.venceHasta) query.set('venceHasta', params.venceHasta)
  const res = await fetch(`${API_BASE_URL}/api/sap-cta-cte/partidas?${query}`)
  return res.json()
}

/**
 * Documentos del Home de Caja (consulta de José, 15-10-2026): FAR_CUSTOMER_LINE_ITEMS
 * con fecha de contabilización entre `desde` (por defecto 01-10-2026) y hoy, de la sucursal del usuario.
 */
export async function getDocumentosHomeCaja(params: { sucursal: string; desde?: string; hasta?: string }): Promise<IDocumentosHomeResult> {
  const query = new URLSearchParams({ sucursal: params.sucursal })
  if (params.desde) query.set('desde', params.desde)
  if (params.hasta) query.set('hasta', params.hasta)
  const res = await fetch(`${API_BASE_URL}/api/sap-cta-cte/documentos-home?${query}`)
  return res.json()
}

// Estado del Home con el criterio del resto de Caja. NetDueArrearsDays: > 0
// vencida; entre -7 y 0 por vencer; menos de -7 vigente. Compensada = pagada.
function estadoDocumentoHome(d: IDocumentoHomeSap): Semaforo {
  if (d.compensada) return 'pagada'
  if (d.diasMora > 0) return 'rojo'
  if (d.diasMora >= -7) return 'amarillo'
  return 'verde'
}

// Por qué un documento del Home no se puede pagar (null = se puede).
function motivoNoPagableHome(d: IDocumentoHomeSap): string | null {
  if (d.compensada) return 'Pagado: ya está compensado en SAP'
  if (d.codigoCme) return `Partida especial CME (${d.codigoCme}): no se paga desde Caja`
  return motivoNoPagable(d)
}

/** Fila del Home; id = clave SAP de la partida (la misma que usa la pantalla de pago). */
export function mapDocumentoHome(d: IDocumentoHomeSap): IDocumentoCaja {
  return {
    id: clavePartidaCtaCte(d),
    kunnr: d.cliente,
    estado: estadoDocumentoHome(d),
    sucursal: d.sucursal,
    tipoDocumento: d.tipoDocumentoNombre || d.tipoDocumento,
    folio: d.folio || d.documento,
    rut: d.rut ? formatRUT(d.rut) : '',
    cliente: d.nombreCliente,
    monedaDocumento: d.monedaDocumento,
    montoDocumento: d.montoDocumento,
    moneda: d.moneda,
    monto: d.monto,
    fecha: d.fechaDocumento,
    bloqueoPago: d.bloqueoPago,
    motivoNoSeleccionable: motivoNoPagableHome(d) ?? undefined,
  }
}

/** Body del pago SIN contabilizar (modal de confirmación). */
export async function previewPagoCtaCte(params: IPagoCtaCteParams): Promise<IPreviewPagoCtaCte> {
  const res = await fetch(`${API_BASE_URL}/api/sap-cta-cte/pagos/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}

/**
 * Contabiliza el pago en SAP (ZCOOP_JOURNALENTRY_SRV, variante 3). Nunca lanza
 * por un rechazo de SAP: devuelve success:false con el detalle, el body y la URL.
 */
export async function registrarPagoCtaCte(params: IPagoCtaCteParams): Promise<IResultadoPagoCtaCte> {
  const res = await fetch(`${API_BASE_URL}/api/sap-cta-cte/pagos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}
