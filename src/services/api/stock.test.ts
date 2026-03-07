import { describe, it, expect } from 'vitest'
import { getStockPorCentro } from './stock'

describe('getStockPorCentro', () => {
  it('retorna stock por almacén para un material', async () => {
    const stock = await getStockPorCentro('MAT000001')
    expect(stock).toHaveProperty('B000')
    expect(stock).toHaveProperty('B001')
    expect(stock).toHaveProperty('B002')
    expect(stock).toHaveProperty('G000')
    expect(typeof stock['B000']).toBe('number')
  })
})
