import type { IArticulo } from '@/types/articulo'
import { API_BASE_URL } from './config'
import { mapMaterial } from './mappers'

export async function buscarMateriales(query: string, centro?: string): Promise<IArticulo[]> {
  const params = new URLSearchParams({ search: query })
  if (centro) params.set('centro', centro)

  const res = await fetch(`${API_BASE_URL}/api/materiales?${params}`)
  if (!res.ok) throw new Error(`Error buscando materiales: ${res.status}`)

  const json = await res.json()
  const results = json.d?.results ?? json.results ?? []
  return (results as Record<string, unknown>[]).map(mapMaterial)
}
