import type { ICliente } from '@/types/cliente'
import { API_BASE_URL } from './config'

// Mapea snake_case del backend POC a camelCase del frontend
// También soporta camelCase directo (MSW en tests)
function mapCliente(raw: Record<string, unknown>): ICliente {
  return {
    codigoCliente: String(raw['kunnr'] ?? raw['codigoCliente'] ?? ''),
    nombre: String(raw['nombre'] ?? ''),
    rut: String(raw['rut'] ?? ''),
    condicionPago: String(raw['condicion_pago'] ?? raw['condicionPago'] ?? 'CONT'),
    estadoCredito: (raw['estado_credito'] ?? raw['estadoCredito'] ?? 'AL_DIA') as ICliente['estadoCredito'],
    creditoAsignado: Number(raw['credito_asignado'] ?? raw['creditoAsignado'] ?? 0),
    creditoUtilizado: Number(raw['credito_utilizado'] ?? raw['creditoUtilizado'] ?? 0),
    porcentajeAgotamiento: Number(raw['porcentaje_agotamiento'] ?? raw['porcentajeAgotamiento'] ?? 0),
    sucursal: String(raw['sucursal'] ?? 'D190'),
  }
}

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
