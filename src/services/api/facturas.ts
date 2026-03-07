import type { IPartidaAbierta } from '@/types/caja'
import { API_BASE_URL } from './config'

// Mapea snake_case del backend POC a camelCase del frontend
// También soporta camelCase directo (MSW en tests)
function mapPartida(raw: Record<string, unknown>): IPartidaAbierta {
  const diasMora = Number(raw['dias_mora'] ?? raw['diasMora'] ?? 0)
  const fechaVenc = String(raw['fecha_venc'] ?? raw['fechaVenc'] ?? '')

  return {
    belnr: String(raw['belnr'] ?? ''),
    kunnr: String(raw['kunnr'] ?? ''),
    claseDoc: String(raw['clase_doc'] ?? raw['claseDoc'] ?? 'FV'),
    fechaDoc: String(raw['fecha_doc'] ?? raw['fechaDoc'] ?? ''),
    fechaVenc,
    importe: Number(raw['importe'] ?? 0),
    estado: (raw['estado'] ?? 'ABIERTO') as IPartidaAbierta['estado'],
    diasMora,
    semaforo: (raw['semaforo'] ?? calcSemaforo(diasMora, fechaVenc)) as IPartidaAbierta['semaforo'],
  }
}

// Calcula semáforo si el backend no lo provee
function calcSemaforo(diasMora: number, fechaVenc: string): 'verde' | 'amarillo' | 'rojo' {
  if (diasMora > 0) return 'rojo'
  const venc = new Date(fechaVenc)
  const hoy = new Date()
  const diff = Math.floor((venc.getTime() - hoy.getTime()) / 86400000)
  if (diff <= 7) return 'amarillo'
  return 'verde'
}

export async function getPartidasAbiertas(kunnr: string): Promise<IPartidaAbierta[]> {
  const res = await fetch(`${API_BASE_URL}/api/partidas/${kunnr}`)
  if (!res.ok) throw new Error(`Error obteniendo partidas: ${res.status}`)

  const json = await res.json()
  const results = json.d?.results ?? json.results ?? []
  return (results as Record<string, unknown>[]).map(mapPartida)
}
