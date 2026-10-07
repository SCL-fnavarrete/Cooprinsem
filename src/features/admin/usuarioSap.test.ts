import { describe, it, expect } from 'vitest'
import { rolSugeridoPorPerfil, rolSugeridoPorTipo, tipoUsuarioTexto, idVendedorSap, datosDesdeUsuarioSap } from './usuarioSap'
import type { ISapUsuarioPos } from '@/types/sapMaestro'

describe('rolSugeridoPorPerfil', () => {
  it('debería sugerir Caja (3) para perfiles CAJA_', () => {
    expect(rolSugeridoPorPerfil('CAJA_OSORNO D190')).toBe(3)
  })
  it('debería sugerir Ventas (2) para perfiles MESON_ y TERRENO', () => {
    expect(rolSugeridoPorPerfil('MESON_OSORNO D190')).toBe(2)
    expect(rolSugeridoPorPerfil('TERRENO_OSORNO_COMBUSTIBLE')).toBe(2)
    expect(rolSugeridoPorPerfil('TERRENO SANTIAGO')).toBe(2)
  })
  it('no debería sugerir rol para perfiles sin regla (ESTACION_)', () => {
    expect(rolSugeridoPorPerfil('ESTACION_FUTRONO E120')).toBeNull()
  })
})

describe('rolSugeridoPorTipo', () => {
  it('debería sugerir Caja (3) para FI y Ventas (2) para CO', () => {
    expect(rolSugeridoPorTipo('FI')).toBe(3)
    expect(rolSugeridoPorTipo('CO')).toBe(2)
    expect(rolSugeridoPorTipo('')).toBeNull()
  })
})

describe('tipoUsuarioTexto', () => {
  it('debería leer FI como Caja y CO como Ventas (confirmado por SAP)', () => {
    expect(tipoUsuarioTexto('FI')).toBe('Caja')
    expect(tipoUsuarioTexto('CO')).toBe('Ventas')
    expect(tipoUsuarioTexto('')).toBe('')
  })
})

describe('idVendedorSap', () => {
  it('debería tratar 00000000 como sin vendedor', () => {
    expect(idVendedorSap('00000000')).toBe('')
    expect(idVendedorSap('13735252')).toBe('13735252')
  })
})

describe('datosDesdeUsuarioSap', () => {
  it('debería completar login, nombre, rol, centro e Id Vendedor desde el usuario SAP', () => {
    const cajero = {
      IdUsuario: 'DVIANA', Nombre: 'DIEGO VIANA GUERRERO', IdRol: 'CAJA_OSORNO D190',
      IdVendedor: '00000000', PerfilWerks: 'D190', TipoUsuario: 'FI',
    } as ISapUsuarioPos
    expect(datosDesdeUsuarioSap(cajero)).toEqual({
      username: 'DVIANA', nombreCompleto: 'DIEGO VIANA GUERRERO', rolCod: 3, sucursalId: 'D190', idVendedor: '',
    })
  })

  it('debería sugerir el rol por TipoUsuario aunque el perfil no tenga regla (ESTACION_)', () => {
    const estacion = { IdUsuario: 'X', Nombre: 'X', IdRol: 'ESTACION_FUTRONO E120', IdVendedor: '00000000', PerfilWerks: 'E120', TipoUsuario: 'FI' } as ISapUsuarioPos
    expect(datosDesdeUsuarioSap(estacion).rolCod).toBe(3)
  })

  it('sin TipoUsuario debería usar el prefijo del perfil como respaldo', () => {
    const vendedor = { IdUsuario: 'Y', Nombre: 'Y', IdRol: 'TERRENO_OSORNO', IdVendedor: '13735252', PerfilWerks: 'D190', TipoUsuario: '' } as ISapUsuarioPos
    expect(datosDesdeUsuarioSap(vendedor).rolCod).toBe(2)
  })
})
