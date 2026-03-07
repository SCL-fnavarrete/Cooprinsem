import { describe, it, expect } from 'vitest'
import { getPartidasAbiertas } from './facturas'

describe('getPartidasAbiertas', () => {
  it('retorna partidas del cliente 0001000001', async () => {
    const partidas = await getPartidasAbiertas('0001000001')
    expect(partidas.length).toBeGreaterThan(0)
    partidas.forEach((p) => {
      expect(p.kunnr).toBe('0001000001')
      expect(p.belnr).toBeTruthy()
      expect(p.importe).toBeGreaterThan(0)
      expect(['verde', 'amarillo', 'rojo']).toContain(p.semaforo)
    })
  })

  it('retorna array vacío para cliente sin partidas', async () => {
    const partidas = await getPartidasAbiertas('0009999999')
    expect(partidas).toEqual([])
  })
})
