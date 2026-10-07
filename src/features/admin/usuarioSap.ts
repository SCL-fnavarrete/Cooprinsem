import type { ISapUsuarioPos } from '@/types/sapMaestro'

// Reglas para vincular usuarios del POS con su usuario SAP (Usuarios_pos).
// Vínculo: username del POS = IdUsuario de SAP (los vendedores y cajeros se
// crean con su mismo usuario SAP). Administrador y Consultas no tienen perfil SAP.

export type RolCod = 1 | 2 | 3 | 4

/**
 * Rol del POS sugerido según el prefijo del perfil SAP: CAJA_ → Caja (3),
 * MESON_ / TERRENO → Ventas (2). Respaldo cuando el usuario no trae TipoUsuario.
 */
export function rolSugeridoPorPerfil(idRol: string): RolCod | null {
  const perfil = idRol.trim().toUpperCase()
  if (perfil.startsWith('CAJA')) return 3
  if (perfil.startsWith('MESON') || perfil.startsWith('TERRENO')) return 2
  return null
}

/**
 * Rol del POS según TipoUsuario de SAP (confirmado por SAP 2026-10-07):
 * FI = Caja (3), CO = Ventas (2).
 */
export function rolSugeridoPorTipo(tipo: string): RolCod | null {
  const t = tipo.trim().toUpperCase()
  if (t === 'FI') return 3
  if (t === 'CO') return 2
  return null
}

/** TipoUsuario de SAP en texto: FI = Caja, CO = Ventas (confirmado por SAP). */
export function tipoUsuarioTexto(tipo: string): string {
  const rol = rolSugeridoPorTipo(tipo)
  if (rol === 3) return 'Caja'
  if (rol === 2) return 'Ventas'
  return ''
}

/** En SAP los cajeros traen IdVendedor '00000000' = sin vendedor. */
export function idVendedorSap(idVendedor: string): string {
  return /^0*$/.test(idVendedor.trim()) ? '' : idVendedor.trim()
}

export interface IDatosDesdeSap {
  username: string
  nombreCompleto: string
  rolCod: RolCod | null
  sucursalId: string
  idVendedor: string
}

/**
 * Datos del formulario de usuario que se completan al elegir un usuario SAP.
 * El rol sale primero del TipoUsuario (dato del propio usuario) y, si viene
 * vacío, del prefijo del perfil.
 */
export function datosDesdeUsuarioSap(u: ISapUsuarioPos): IDatosDesdeSap {
  return {
    username: u.IdUsuario,
    nombreCompleto: u.Nombre,
    rolCod: rolSugeridoPorTipo(u.TipoUsuario) ?? rolSugeridoPorPerfil(u.IdRol),
    sucursalId: u.PerfilWerks,
    idVendedor: idVendedorSap(u.IdVendedor),
  }
}
