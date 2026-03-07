import { API_BASE_URL } from './config'

/**
 * Retorna stock por almacén para un material dado.
 * Ejemplo: { B000: 20, B001: 10, B002: 5, G000: 0 }
 */
export async function getStockPorCentro(matnr: string): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE_URL}/api/stock/${matnr}`)
  if (!res.ok) throw new Error(`Error obteniendo stock para ${matnr}: ${res.status}`)

  const json = await res.json()
  const data = json.d ?? json
  return (data.stock ?? {}) as Record<string, number>
}
