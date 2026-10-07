import type { IInterfaz, ISapBanco, ISapCentro, ISapCentroCosto, ISapSociedad, ISapRegion, ISapPerfilUsuario, ISapUsuarioPos } from '@/types/sapMaestro'
import { API_BASE_URL } from './config'

// Interfases SAP
export async function getInterfases(params?: {
  tipo?: number
  estado?: string
  desde?: string
  hasta?: string
}): Promise<IInterfaz[]> {
  const query = new URLSearchParams()
  if (params?.tipo) query.set('tipo', String(params.tipo))
  if (params?.estado) query.set('estado', params.estado)
  if (params?.desde) query.set('desde', params.desde)
  if (params?.hasta) query.set('hasta', params.hasta)

  const res = await fetch(`${API_BASE_URL}/api/interfaces?${query.toString()}`)
  if (!res.ok) throw new Error(`Error al cargar interfases: ${res.status}`)
  const json = await res.json()
  return json.d.results as IInterfaz[]
}

// Bancos SAP
export async function getSapBancos(search?: string): Promise<ISapBanco[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/sap-maestro/bancos${query}`)
  if (!res.ok) throw new Error(`Error al cargar bancos: ${res.status}`)
  const json = await res.json()
  return json.d.results as ISapBanco[]
}

// Centros SAP
export async function getSapCentros(search?: string): Promise<ISapCentro[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/sap-maestro/centros${query}`)
  if (!res.ok) throw new Error(`Error al cargar centros: ${res.status}`)
  const json = await res.json()
  return json.d.results as ISapCentro[]
}

// Centros de Costo SAP
export async function getSapCentrosCosto(search?: string): Promise<ISapCentroCosto[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/sap-maestro/centros-costo${query}`)
  if (!res.ok) throw new Error(`Error al cargar centros de costo: ${res.status}`)
  const json = await res.json()
  return json.d.results as ISapCentroCosto[]
}

// Sociedades SAP
export async function getSapSociedades(search?: string): Promise<ISapSociedad[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/sap-maestro/sociedades${query}`)
  if (!res.ok) throw new Error(`Error al cargar sociedades: ${res.status}`)
  const json = await res.json()
  return json.d.results as ISapSociedad[]
}

// Perfiles de usuario SAP (Perfiles_usuarios)
export async function getSapPerfiles(search?: string): Promise<ISapPerfilUsuario[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/sap-maestro/perfiles${query}`)
  if (!res.ok) throw new Error(`Error al cargar perfiles de usuario: ${res.status}`)
  const json = await res.json()
  return json.d.results as ISapPerfilUsuario[]
}

// Usuarios POS mantenidos en SAP (Usuarios_pos). idRol filtra por perfil exacto.
export async function getSapUsuariosPos(params?: { idRol?: string; search?: string }): Promise<ISapUsuarioPos[]> {
  const query = new URLSearchParams()
  if (params?.idRol) query.set('idRol', params.idRol)
  if (params?.search) query.set('search', params.search)
  const res = await fetch(`${API_BASE_URL}/api/sap-maestro/usuarios-pos?${query.toString()}`)
  if (!res.ok) throw new Error(`Error al cargar usuarios SAP: ${res.status}`)
  const json = await res.json()
  return json.d.results as ISapUsuarioPos[]
}

// Regiones SAP
export async function getSapRegiones(search?: string): Promise<ISapRegion[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/sap-maestro/regiones${query}`)
  if (!res.ok) throw new Error(`Error al cargar regiones: ${res.status}`)
  const json = await res.json()
  return json.d.results as ISapRegion[]
}