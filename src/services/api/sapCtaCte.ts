import { API_BASE_URL } from './config'
import type { IPartidasCtaCteResult, IPagoCtaCteParams, IPreviewPagoCtaCte, IResultadoPagoCtaCte } from '@/types/ctaCte'

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
