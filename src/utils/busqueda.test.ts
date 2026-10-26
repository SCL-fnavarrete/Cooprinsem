import { describe, it, expect } from 'vitest'
import { largoBusqueda } from './busqueda'

describe('largoBusqueda', () => {
  it('debería contar los caracteres sin los "*" ni espacios de los extremos', () => {
    expect(largoBusqueda('agricola*verde')).toBe(13)
    expect(largoBusqueda('a**g')).toBe(2)
    expect(largoBusqueda(' * ')).toBe(0)
  })
})
