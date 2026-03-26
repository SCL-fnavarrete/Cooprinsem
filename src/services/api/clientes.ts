import type { ICliente } from '@/types/cliente'
import { API_BASE_URL } from './config'
import { mapCliente } from './mappers'

export async function buscarClientes(query: string, sucursal?: string): Promise<ICliente[]> {
  const params = new URLSearchParams({ search: query })
  if (sucursal) params.set('sucursal', sucursal)

  const res = await fetch(`${API_BASE_URL}/api/clientes?${params}`)
  if (!res.ok) throw new Error(`Error buscando clientes: ${res.status}`)

  const json = await res.json()
  const results = json.d?.results ?? json.results ?? []
  return (results as Record<string, unknown>[]).map(mapCliente)
}

export async function getCliente(kunnr: string): Promise<ICliente> {
  const res = await fetch(`${API_BASE_URL}/api/clientes/${kunnr}`)
  if (!res.ok) throw new Error(`Cliente ${kunnr} no encontrado`)

  const json = await res.json()
  const data = json.d ?? json
  return mapCliente(data as Record<string, unknown>)
}
