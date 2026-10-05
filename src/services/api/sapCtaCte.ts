import { API_BASE_URL } from './config'
import type { IPartidasCtaCteResult } from '@/types/ctaCte'

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
