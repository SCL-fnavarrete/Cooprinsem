import type { IPartidaAbierta } from '@/types/caja'
import { API_BASE_URL } from './config'
import { mapPartida } from './mappers'

export async function getPartidaPorBelnr(belnr: string): Promise<IPartidaAbierta | null> {
  const res = await fetch(`${API_BASE_URL}/api/partidas/doc/${encodeURIComponent(belnr)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Error buscando documento: ${res.status}`)
  const json = await res.json()
  return mapPartida(json as Record<string, unknown>)
}

export async function getPartidasAbiertas(kunnr?: string, incluirPagadas = false): Promise<IPartidaAbierta[]> {
  const base = kunnr
    ? `${API_BASE_URL}/api/partidas/${kunnr}`
    : `${API_BASE_URL}/api/partidas`
  const url = incluirPagadas ? `${base}?incluirPagadas=true` : base
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error obteniendo partidas: ${res.status}`)

  const json = await res.json()
  const results = json.d?.results ?? json.results ?? []
  return (results as Record<string, unknown>[]).map(mapPartida)
}
