import type { ICliente, ICrearCliente } from '@/types/cliente'
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

export async function crearCliente(data: ICrearCliente): Promise<ICliente> {
  const body = {
    tratamiento: data.tratamiento,
    rut: data.rut,
    nombre: data.nombre,
    nombre2: data.nombre2 ?? '',
    concepto_busqueda: data.conceptoBusqueda,
    giro: data.giro,
    direccion: data.direccion,
    region: data.region,
    ciudad: data.ciudad,
    comuna: data.comuna,
    zona_transporte: data.zonaTransporte,
    telefono: data.telefono ?? '',
    celular: data.celular ?? '',
    fax: data.fax ?? '',
    direccion_postal: data.direccionPostal ?? '',
    ciudad_postal: data.ciudadPostal ?? '',
    casilla: data.casilla ?? '',
    correo_contacto: data.correoContacto ?? '',
    correo_factura: data.correoFactura ?? '',
  }

  const res = await fetch(`${API_BASE_URL}/api/clientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as Record<string, string>).error ?? `Error creando cliente: ${res.status}`)
  }

  const json = await res.json()
  const result = json.d ?? json
  return mapCliente(result as Record<string, unknown>)
}
