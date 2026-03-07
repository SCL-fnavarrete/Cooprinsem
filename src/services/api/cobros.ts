import type { IPagoEfectivo, IResultadoCobro } from '@/types/caja'
import { API_BASE_URL } from './config'

export async function registrarCobroEfectivo(cobro: IPagoEfectivo): Promise<IResultadoCobro> {
  const body = {
    kunnr: cobro.kunnr,
    monto: cobro.monto,
    monto_recibido: cobro.montoRecibido,
    medio_pago: cobro.medio_pago,
    belnrs_cancelados: cobro.belnrs_cancelados,
  }

  const res = await fetch(`${API_BASE_URL}/api/cobros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error registrando cobro: ${res.status}`)
  }

  const json = await res.json()
  return json.d as IResultadoCobro
}
