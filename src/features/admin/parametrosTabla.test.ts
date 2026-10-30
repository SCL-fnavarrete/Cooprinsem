import { describe, it, expect } from 'vitest'
import type { IParametroGeneral } from '@/services/api/posMaestros'
import {
  filtrarParametros, ordenarParametros, siguienteOrdenParametros, ORDEN_PARAMETROS_DEFECTO,
} from './parametrosTabla'

const p = (clave: string, valor: string, descripcion: string, id = 0): IParametroGeneral => ({ id, clave, valor, descripcion })

const PARAMETROS = [
  p('PAGO_MULTIPLE', 'N', 'Permite pagar varias facturas'),
  p('DIAS_MAX_CHEQUE_FECHA', '30', 'Días máximos del cheque a fecha'),
  p('IDCLIENTE', '10000043', 'Último número de cliente'),
  p('NCOBRO', '9', 'Folio de cobro'),
]

describe('filtrarParametros', () => {
  it('debería devolver todos cuando el filtro está vacío', () => {
    expect(filtrarParametros(PARAMETROS, '  ')).toHaveLength(4)
  })

  it('debería buscar en clave, valor y descripción sin distinguir mayúsculas', () => {
    expect(filtrarParametros(PARAMETROS, 'pago').map((x) => x.clave)).toEqual(['PAGO_MULTIPLE'])
    expect(filtrarParametros(PARAMETROS, '10000043').map((x) => x.clave)).toEqual(['IDCLIENTE'])
    expect(filtrarParametros(PARAMETROS, 'FOLIO').map((x) => x.clave)).toEqual(['NCOBRO'])
  })

  it('debería ignorar tildes en ambos sentidos', () => {
    expect(filtrarParametros(PARAMETROS, 'dias maximos').map((x) => x.clave)).toEqual(['DIAS_MAX_CHEQUE_FECHA'])
    expect(filtrarParametros(PARAMETROS, 'último').map((x) => x.clave)).toEqual(['IDCLIENTE'])
  })
})

describe('ordenarParametros', () => {
  it('debería ordenar por clave ascendente por defecto', () => {
    expect(ordenarParametros(PARAMETROS, ORDEN_PARAMETROS_DEFECTO).map((x) => x.clave))
      .toEqual(['DIAS_MAX_CHEQUE_FECHA', 'IDCLIENTE', 'NCOBRO', 'PAGO_MULTIPLE'])
  })

  it('debería ordenar valores numéricos en orden natural', () => {
    expect(ordenarParametros(PARAMETROS, { columna: 'valor', direccion: 'asc' }).map((x) => x.valor))
      .toEqual(['9', '30', '10000043', 'N'])
  })

  it('debería ordenar descendente sin modificar el arreglo original', () => {
    const original = [...PARAMETROS]
    expect(ordenarParametros(PARAMETROS, { columna: 'clave', direccion: 'desc' })[0].clave).toBe('PAGO_MULTIPLE')
    expect(PARAMETROS).toEqual(original)
  })
})

describe('siguienteOrdenParametros', () => {
  it('debería invertir la dirección al hacer clic en la misma columna', () => {
    expect(siguienteOrdenParametros({ columna: 'clave', direccion: 'asc' }, 'clave')).toEqual({ columna: 'clave', direccion: 'desc' })
  })

  it('debería partir ascendente al cambiar de columna', () => {
    expect(siguienteOrdenParametros({ columna: 'clave', direccion: 'desc' }, 'valor')).toEqual({ columna: 'valor', direccion: 'asc' })
  })
})
