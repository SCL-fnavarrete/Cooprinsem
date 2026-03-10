import type { IPagare } from '@/types/pagare'
import { API_BASE_URL } from './config'

/**
 * Obtiene la lista completa de pagarés.
 * En Fase 1 será OData SAP (pendiente confirmar con ABAP).
 */
export async function getPagares(): Promise<IPagare[]> {
  const res = await fetch(`${API_BASE_URL}/api/pagares`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error al cargar pagarés: ${res.status}`)
  }

  const json = await res.json()
  return json.d.results as IPagare[]
}
