import type { IArqueoCaja, IArqueoDetalle, ICierreCaja, EstadoCierre } from '@/types/arqueo'
import { API_BASE_URL } from './config'

// Grabar arqueo del cajero — en Fase 1 será OData SAP (⏳ pendiente-ABAP)
export async function grabarArqueo(
  params: {
    fechaCaja: string
    sucursalId: string
    cajeroId: string
    detalles: IArqueoDetalle[]
  }
): Promise<IArqueoCaja> {
  const res = await fetch(`${API_BASE_URL}/api/arqueo/grabar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error grabando arqueo: ${res.status}`)
  }

  const json = await res.json()
  return json.d as IArqueoCaja
}

// Obtener arqueo del día — para el Jefe Admin en el cierre
export async function getArqueoDelDia(
  params: { fechaCaja: string; sucursalId: string; cajeroId: string }
): Promise<IArqueoCaja> {
  const qs = new URLSearchParams({
    fecha: params.fechaCaja,
    sucursal: params.sucursalId,
    cajero: params.cajeroId,
  })
  const res = await fetch(`${API_BASE_URL}/api/arqueo/dia?${qs.toString()}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error obteniendo arqueo: ${res.status}`)
  }

  const json = await res.json()
  return json.d as IArqueoCaja
}

// Ejecutar cierre de caja (borrador o definitivo) — en Fase 1 será SAP ZFI26
export async function ejecutarCierre(
  params: { arqueoId: string; estado: EstadoCierre; jefeAdminId: string }
): Promise<ICierreCaja> {
  const res = await fetch(`${API_BASE_URL}/api/arqueo/cierre`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error ejecutando cierre: ${res.status}`)
  }

  const json = await res.json()
  return json.d as ICierreCaja
}
