import { describe, it, expect } from 'vitest'
import type { ILineaPedido } from '@/types/pedido'
import type { ISerieValidada } from '@/types/serie'
import { asignarPrimerasLibres, seriesEnOtrasLineas, validarSeriesPedido } from './seriesPedido'

const serie = (numeroSerie: string, disponible = true): ISerieValidada => ({
  numeroSerie, material: '11000074', lote: 'GENERICO', centro: 'D190', almacen: 'B000', disponible,
})

const linea = (overrides: Partial<ILineaPedido>): ILineaPedido => ({
  posicion: '10', codigoMaterial: '11000074', descripcion: 'ALLFLEX DIIO ELECT HDX UNIDAD', cantidad: 2,
  unidadMedida: 'PC', precioUnitario: 0, subtotal: 0, centroSuministrador: '', almacen: '',
  recargo: 0, descuentoLinea: 0, fechaEntrega: '', ...overrides,
})

const asignada = (numeroSerie: string) => ({ numeroSerie, material: '11000074', lote: 'GENERICO', centro: 'D190', almacen: 'B000' })

describe('asignarPrimerasLibres', () => {
  it('debería asignar las primeras series libres en orden numérico', () => {
    const r = asignarPrimerasLibres([serie('103'), serie('101'), serie('102')], 2)
    expect(r.asignadas.map((s) => s.numeroSerie)).toEqual(['101', '102'])
    expect(r.suficientes).toBe(true)
    expect(r.series.find((s) => s.numeroSerie === '103')?.estado).toBe('disponible')
  })

  it('debería saltar las series no disponibles', () => {
    const r = asignarPrimerasLibres([serie('101'), serie('102', false), serie('103')], 2)
    expect(r.asignadas.map((s) => s.numeroSerie)).toEqual(['101', '103'])
    expect(r.series.find((s) => s.numeroSerie === '102')?.estado).toBe('no-disponible')
  })

  it('debería saltar las series ya usadas en otra línea del pedido', () => {
    const r = asignarPrimerasLibres([serie('101'), serie('102'), serie('103')], 2, new Set(['101']))
    expect(r.asignadas.map((s) => s.numeroSerie)).toEqual(['102', '103'])
    expect(r.series.find((s) => s.numeroSerie === '101')?.estado).toBe('repetida')
  })

  it('debería marcar como insuficiente cuando el rango no alcanza la cantidad', () => {
    const r = asignarPrimerasLibres([serie('101'), serie('102', false)], 2)
    expect(r.suficientes).toBe(false)
    expect(r.libres).toBe(1)
    expect(r.requeridas).toBe(2)
  })

  it('debería ordenar números de serie largos sin perder precisión', () => {
    const r = asignarPrimerasLibres([serie('900000000000000002'), serie('900000000000000001')], 1)
    expect(r.asignadas[0].numeroSerie).toBe('900000000000000001')
  })
})

describe('seriesEnOtrasLineas', () => {
  it('debería devolver las series de las demás líneas, sin la línea actual', () => {
    const lineas = [linea({ posicion: '10', series: [asignada('101')] }), linea({ posicion: '20', series: [asignada('201')] })]
    expect([...seriesEnOtrasLineas(lineas, '10')]).toEqual(['201'])
  })
})

describe('validarSeriesPedido', () => {
  it('no debería exigir series (son opcionales)', () => {
    expect(validarSeriesPedido([linea({})])).toEqual([])
  })

  it('debería bloquear cuando la cantidad de series no coincide con la cantidad de la línea', () => {
    const errores = validarSeriesPedido([linea({ cantidad: 3, series: [asignada('101'), asignada('102')] })])
    expect(errores[0]).toMatch(/tiene 2 series y la cantidad es 3/)
  })

  it('debería bloquear una serie repetida en dos líneas del mismo pedido', () => {
    const errores = validarSeriesPedido([
      linea({ posicion: '10', cantidad: 1, series: [asignada('101')] }),
      linea({ posicion: '20', cantidad: 1, series: [asignada('101')] }),
    ])
    expect(errores[0]).toMatch(/101 está repetida en las posiciones 10 y 20/)
  })
})
