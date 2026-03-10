import type { IUsuarioAdmin, ICreateUsuarioRequest, IUpdateUsuarioRequest, IRol, ISucursal } from '@/types/admin'
import { API_BASE_URL } from './config'

// Usuarios

export async function getUsuarios(): Promise<IUsuarioAdmin[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/usuarios`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error al cargar usuarios: ${res.status}`)
  }

  const json = await res.json()
  return json.d.results as IUsuarioAdmin[]
}

export async function createUsuario(data: ICreateUsuarioRequest): Promise<IUsuarioAdmin> {
  const res = await fetch(`${API_BASE_URL}/api/admin/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error al crear usuario: ${res.status}`)
  }

  const json = await res.json()
  return json.d as IUsuarioAdmin
}

export async function updateUsuario(id: string, data: IUpdateUsuarioRequest): Promise<IUsuarioAdmin> {
  const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error al actualizar usuario: ${res.status}`)
  }

  const json = await res.json()
  return json.d as IUsuarioAdmin
}

export async function toggleEstadoUsuario(id: string, estado: 1 | 2): Promise<IUsuarioAdmin> {
  const res = await fetch(`${API_BASE_URL}/api/admin/usuarios/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error al cambiar estado: ${res.status}`)
  }

  const json = await res.json()
  return json.d as IUsuarioAdmin
}

// Roles (solo lectura)

export async function getRoles(): Promise<IRol[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/roles`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error al cargar roles: ${res.status}`)
  }

  const json = await res.json()
  return json.d.results as IRol[]
}

// Sucursales (solo lectura)

export async function getSucursales(): Promise<ISucursal[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/sucursales`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error al cargar sucursales: ${res.status}`)
  }

  const json = await res.json()
  return json.d.results as ISucursal[]
}
