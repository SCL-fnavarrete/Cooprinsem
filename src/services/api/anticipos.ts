import type { IAnticipo, IBuscarAnticipoRequest } from '@/types/anticipo'
import { API_BASE_URL } from './config'

// Listar anticipos pendientes de un cliente
// En Fase 1 será OData SAP (⏳ pendiente-ABAP, clase DZ, transacción F-37)
export async function listarAnticiposPendientes(kunnr: string): Promise<IAnticipo[]> {
  const res = await fetch(`${API_BASE_URL}/api/anticipos/cliente/${encodeURIComponent(kunnr)}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error listando anticipos: ${res.status}`)
  }

  const json = await res.json()
  return (json.d?.results ?? []) as IAnticipo[]
}

// Buscar anticipo pendiente por código de cliente + Nº comprobante SAP
// En Fase 1 será OData SAP (⏳ pendiente-ABAP, clase DZ, transacción F-37)
export async function buscarAnticipo(req: IBuscarAnticipoRequest): Promise<IAnticipo> {
  const res = await fetch(`${API_BASE_URL}/api/anticipos/buscar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kunnr: req.kunnr,
      nroComprobante: req.nroComprobante,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error buscando anticipo: ${res.status}`)
  }

  const json = await res.json()
  return json.d as IAnticipo
}
