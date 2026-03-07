import { describe, it, expect } from 'vitest'
import { buscarMateriales } from './materiales'

describe('buscarMateriales', () => {
  it('retorna materiales que coinciden con la búsqueda', async () => {
    const results = await buscarMateriales('martillo')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].descripcion.toLowerCase()).toContain('martillo')
  })

  it('mapea correctamente los campos del material', async () => {
    const results = await buscarMateriales('clavo')
    const articulo = results[0]
    expect(articulo).toHaveProperty('codigoMaterial')
    expect(articulo).toHaveProperty('descripcion')
    expect(articulo).toHaveProperty('precioUnitario')
    expect(articulo).toHaveProperty('unidadMedida')
    expect(articulo).toHaveProperty('stockDisponible')
    expect(typeof articulo.precioUnitario).toBe('number')
  })

  it('retorna resultados ordenados por stock descendente', async () => {
    const results = await buscarMateriales('clavo')
    if (results.length >= 2) {
      expect(results[0].stockDisponible).toBeGreaterThanOrEqual(results[1].stockDisponible)
    }
  })

  it('retorna array vacío cuando no hay coincidencias', async () => {
    const results = await buscarMateriales('XXXXXXNOEXISTE')
    expect(results).toHaveLength(0)
  })
})
