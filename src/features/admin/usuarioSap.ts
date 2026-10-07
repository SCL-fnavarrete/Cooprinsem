import type { ISapUsuarioPos } from '@/types/sapMaestro'

// Reglas para vincular usuarios del POS con su usuario SAP (Usuarios_pos).
// Vínculo: username del POS = IdUsuario de SAP (los vendedores y cajeros se
// crean con su mismo usuario SAP). Administrador y Consultas no tienen perfil SAP.

export type RolCod = 1 | 2 | 3 | 4

/**
 * Rol del POS sugerido según el prefijo del perfil SAP: CAJA_ → Caja (3),
 * MESON_ / TERRENO → Ventas (2). Otros prefijos (ej. ESTACION_) quedan sin
 * sugerencia hasta que SAP confirme a qué rol corresponden.
 */
export function rolSugeridoPorPerfil(idRol: string): RolCod | null {
  const perfil = idRol.trim().toUpperCase()
  if (perfil.startsWith('CAJA')) return 3
  if (perfil.startsWith('MESON') || perfil.startsWith('TERRENO')) return 2
  return null
}

/**
 * Lectura de TipoUsuario según los datos de Usuarios_pos (cajeros = FI,
 * vendedores de terreno = CO). PENDIENTE: SAP lo está validando — la primera
 * respuesta del equipo lo indicó al revés.
 */
export function tipoUsuarioTexto(tipo: string): string {
  if (tipo === 'FI') return 'Caja'
  if (tipo === 'CO') return 'Ventas'
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

/** Datos del formulario de usuario que se completan al elegir un usuario SAP. */
export function datosDesdeUsuarioSap(u: ISapUsuarioPos): IDatosDesdeSap {
  return {
    username: u.IdUsuario,
    nombreCompleto: u.Nombre,
    rolCod: rolSugeridoPorPerfil(u.IdRol),
    sucursalId: u.PerfilWerks,
    idVendedor: idVendedorSap(u.IdVendedor),
  }
}
