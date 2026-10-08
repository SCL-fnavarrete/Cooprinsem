import { describe, it, expect } from 'vitest'
import { soloDigitos, porcentajeDesdeTexto, montoDesdeTexto } from './numeros'

describe('soloDigitos', () => {
  it('debería quitar letras, signos y separadores', () => {
    expect(soloDigitos('1a-2.5e')).toBe('125')
    expect(soloDigitos('abc')).toBe('')
  })
})

describe('porcentajeDesdeTexto', () => {
  it('debería convertir el texto en un porcentaje entero', () => {
    expect(porcentajeDesdeTexto('15')).toBe(15)
    expect(porcentajeDesdeTexto('1x5')).toBe(15)
  })

  it('debería limitar el porcentaje a 100', () => {
    expect(porcentajeDesdeTexto('150')).toBe(100)
  })

  it('debería devolver 0 con el texto vacío o sin dígitos', () => {
    expect(porcentajeDesdeTexto('')).toBe(0)
    expect(porcentajeDesdeTexto('-')).toBe(0)
  })
})

describe('montoDesdeTexto', () => {
  it('debería convertir el texto en un monto CLP entero', () => {
    expect(montoDesdeTexto('1.500')).toBe(1500)
    expect(montoDesdeTexto('$ 2500')).toBe(2500)
    expect(montoDesdeTexto('')).toBe(0)
  })
})
