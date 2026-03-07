import { describe, it, expect } from 'vitest'
import { formatCLP, formatRUT, formatFecha, formatFechaSAP } from './format'

describe('formatCLP', () => {
  it('formatea enteros como pesos chilenos con punto de miles', () => {
    expect(formatCLP(1234567)).toBe('$1.234.567')
  })

  it('formatea cero', () => {
    expect(formatCLP(0)).toBe('$0')
  })

  it('formatea negativos para mostrar vuelto', () => {
    expect(formatCLP(-5000)).toBe('-$5.000')
  })

  it('no agrega decimales (CLP no tiene centavos)', () => {
    expect(formatCLP(10000)).toBe('$10.000')
    expect(formatCLP(10000)).not.toContain(',')
  })

  it('redondea decimales si llegan por error', () => {
    expect(formatCLP(10000.7)).toBe('$10.001')
  })

  it('formatea valores pequeños', () => {
    expect(formatCLP(100)).toBe('$100')
    expect(formatCLP(1)).toBe('$1')
  })
})

describe('formatRUT', () => {
  it('formatea RUT sin formato a formato con puntos y guión', () => {
    expect(formatRUT('123456789')).toBe('12.345.678-9')
  })

  it('formatea RUT con dígito verificador K', () => {
    expect(formatRUT('12345678K')).toBe('12.345.678-K')
    expect(formatRUT('12345678k')).toBe('12.345.678-K')
  })

  it('acepta RUT ya formateado y lo normaliza', () => {
    expect(formatRUT('12.345.678-9')).toBe('12.345.678-9')
  })

  it('retorna string corto tal cual si tiene menos de 2 chars', () => {
    expect(formatRUT('5')).toBe('5')
    expect(formatRUT('')).toBe('')
  })
})

describe('formatFecha', () => {
  it('convierte formato SAP (YYYYMMDD) a DD/MM/YYYY', () => {
    expect(formatFecha('20250325')).toBe('25/03/2025')
  })

  it('convierte formato ISO (YYYY-MM-DD) a DD/MM/YYYY', () => {
    expect(formatFecha('2025-03-25')).toBe('25/03/2025')
  })

  it('maneja ISO con hora (toma solo la fecha)', () => {
    expect(formatFecha('2025-03-25T14:30:00.000Z')).toBe('25/03/2025')
  })

  it('retorna el string original si no tiene 8 dígitos', () => {
    expect(formatFecha('abc')).toBe('abc')
  })
})

describe('formatFechaSAP', () => {
  it('convierte Date a YYYYMMDD', () => {
    const fecha = new Date(2025, 2, 25) // marzo = mes 2
    expect(formatFechaSAP(fecha)).toBe('20250325')
  })

  it('pone ceros a la izquierda en mes y día', () => {
    const fecha = new Date(2025, 0, 5) // enero 5
    expect(formatFechaSAP(fecha)).toBe('20250105')
  })
})
