import { describe, it, expect } from 'vitest'
import { buscarUnidad, textoUnidad, tooltipUnidad, codigoYTextoUnidad } from './unidadMedida'
import type { IUnidadMedida } from '@/services/api/posMaestros'

const unidades: IUnidadMedida[] = [
  { msehi: 'ST', mseh3: 'UN', mseh6: 'UN', texto_corto: 'Unidad', texto_largo: 'Unidad' },
  { msehi: 'TO', mseh3: 'TON', mseh6: 'TON', texto_corto: 'Tonelada', texto_largo: 'Tonelada' },
  { msehi: 'M3', mseh3: 'M3', mseh6: 'M3', texto_corto: 'Metro cúb', texto_largo: 'Metro cúbico' },
  { msehi: 'H', mseh3: 'H', mseh6: 'H', texto_corto: null, texto_largo: null },
]

describe('unidad de medida en Nuevo Pedido', () => {
  it('debería encontrar la unidad por código comercial (simulación) o interno (stock)', () => {
    expect(buscarUnidad('UN', unidades)?.msehi).toBe('ST')
    expect(buscarUnidad('ST', unidades)?.mseh3).toBe('UN')
    expect(buscarUnidad(' to ', unidades)?.mseh3).toBe('TON')
    expect(buscarUnidad('XX', unidades)).toBeUndefined()
    expect(buscarUnidad(undefined, unidades)).toBeUndefined()
  })

  it('debería mostrar el texto corto y, sin texto o sin maestro, el código', () => {
    expect(textoUnidad('ST', unidades)).toBe('Unidad')
    expect(textoUnidad('UN', unidades)).toBe('Unidad')
    expect(textoUnidad('H', unidades)).toBe('H')
    expect(textoUnidad('XX', unidades)).toBe('XX')
    expect(textoUnidad('ST', [])).toBe('ST')
  })

  it('debería poner en el tooltip el texto largo y el código', () => {
    expect(tooltipUnidad('M3', unidades)).toBe('Metro cúbico (M3)')
    expect(tooltipUnidad('XX', unidades)).toBe('XX')
  })

  it('debería armar "ST - Unidad" para el buscador, o solo el código si no hay texto', () => {
    expect(codigoYTextoUnidad('ST', unidades)).toBe('ST - Unidad')
    expect(codigoYTextoUnidad('H', unidades)).toBe('H')
    expect(codigoYTextoUnidad('ST', [])).toBe('ST')
  })
})
