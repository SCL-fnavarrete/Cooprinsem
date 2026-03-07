import type { IArticulo } from '@/types/articulo'
import { API_BASE_URL } from './config'

// Mapea snake_case del backend POC a camelCase del frontend
function mapMaterial(raw: Record<string, unknown>): IArticulo {
  return {
    codigoMaterial: String(raw['matnr'] ?? raw['codigoMaterial'] ?? ''),
    descripcion: String(raw['descripcion'] ?? ''),
    precioUnitario: Number(raw['precio_unitario'] ?? raw['precioUnitario'] ?? 0),
    unidadMedida: String(raw['unidad_medida'] ?? raw['unidadMedida'] ?? 'UN'),
    stockDisponible: Number(raw['stock_disponible'] ?? raw['stockDisponible'] ?? 0),
    centro: String(raw['centro'] ?? 'D190'),
    almacen: String(raw['almacen'] ?? 'B000'),
  }
}

export async function buscarMateriales(query: string, centro?: string): Promise<IArticulo[]> {
  const params = new URLSearchParams({ search: query })
  if (centro) params.set('centro', centro)

  const res = await fetch(`${API_BASE_URL}/api/materiales?${params}`)
  if (!res.ok) throw new Error(`Error buscando materiales: ${res.status}`)

  const json = await res.json()
  const results = json.d?.results ?? json.results ?? []
  return (results as Record<string, unknown>[]).map(mapMaterial)
}
