import type { ICliente, ICrearCliente } from '@/types/cliente'
import { API_BASE_URL } from './config'
import { mapCliente } from './mappers'
import { getGrupoBusquedaClientes } from '@/stores/grupoBusquedaClientes'

export async function buscarClientes(query: string, sucursal?: string): Promise<ICliente[]> {
  const params = new URLSearchParams({ search: query })
  if (sucursal) params.set('sucursal', sucursal)

  const res = await fetch(`${API_BASE_URL}/api/clientes?${params}`)
  if (!res.ok) throw new Error(`Error buscando clientes: ${res.status}`)

  const json = await res.json()
  const results = json.d?.results ?? json.results ?? []
  return (results as Record<string, unknown>[]).map(mapCliente)
}

// Busca en las tablas Sap_cliente/Sap_clientes_direccion (sincronizadas desde SAP).
// Sin datos de crédito — ver PROGRESS.md. El caller debe ocultar el panel de crédito
// para esta fuente en vez de confiar en estadoCredito/creditoAsignado/creditoUtilizado.
// Sucursal sí está disponible (Sap_cliente.CliSucursal).
// `grupo`: grupo BP (ZNAC, ZPER…) o "TODOS"; si no se indica, el elegido en el
// select "Grupo BP" de los buscadores (por defecto ZNAC).
export async function buscarClientesSapTabla(query: string, sucursal?: string, grupo?: string): Promise<ICliente[]> {
  const params = new URLSearchParams({ search: query, grupo: grupo ?? getGrupoBusquedaClientes() })
  if (sucursal) params.set('sucursal', sucursal)

  const res = await fetch(`${API_BASE_URL}/api/sap-cliente-tabla?${params}`)
  if (!res.ok) throw new Error(`Error buscando clientes SAP: ${res.status}`)

  const json = await res.json()
  const results = json.d?.results ?? json.results ?? []
  return (results as Record<string, unknown>[]).map(mapCliente)
}

export interface IGrupoBpClientes {
  grupo: string
  total: number
}

/** Grupos BP de los clientes sincronizados, con su cantidad (select "Grupo BP"). */
export async function getGruposBpClientes(): Promise<{ total: number; grupos: IGrupoBpClientes[] }> {
  const res = await fetch(`${API_BASE_URL}/api/sap-cliente-tabla/grupos`)
  if (!res.ok) throw new Error(`Error consultando grupos de clientes: ${res.status}`)
  const json = await res.json()
  return { total: Number(json.total ?? 0), grupos: (json.grupos ?? []) as IGrupoBpClientes[] }
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
