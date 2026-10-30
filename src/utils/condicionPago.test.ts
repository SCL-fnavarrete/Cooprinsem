import { describe, it, expect } from 'vitest'
import { textoCondicionPago } from './condicionPago'

describe('textoCondicionPago', () => {
  it('debería mostrar código y descripción de la simulación', () => {
    expect(textoCondicionPago({ codigo: 'D001', descripcion: 'Credito Vcto. dia 12' }, '')).toBe('D001 - Credito Vcto. dia 12')
  })

  it('debería mostrar solo el código si no está en condicion_pago', () => {
    expect(textoCondicionPago({ codigo: 'ZZ99', descripcion: '' })).toBe('ZZ99')
  })

  it('debería usar la condición del cliente antes de simular', () => {
    expect(textoCondicionPago(null, 'CONT')).toBe('CONT')
    expect(textoCondicionPago(null)).toBe('')
  })
})
