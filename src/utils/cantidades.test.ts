import { describe, it, expect } from 'vitest'
import { limpiarTextoCantidad, cantidadDesdeTexto, formatCantidad, formatPrecioUnitario, esCantidadEntera } from './cantidades'
import { hoyChileFechaEntrega, fechaEntregaISO, errorFechaEntrega } from './fechaEntrega'

describe('cantidad con coma decimal', () => {
  it('debería aceptar coma y hasta 2 decimales', () => {
    expect(limpiarTextoCantidad('1,5')).toBe('1,5')
    expect(limpiarTextoCantidad('1,567')).toBe('1,56')
    expect(limpiarTextoCantidad('1,')).toBe('1,')
    expect(limpiarTextoCantidad('1a,2,3')).toBe('1,23')
    // El punto también es separador decimal y se muestra como coma
    expect(limpiarTextoCantidad('0.5')).toBe('0,5')
    expect(limpiarTextoCantidad('1.25')).toBe('1,25')
    expect(limpiarTextoCantidad('1.2,3')).toBe('1,23')
  })

  it('debería convertir el texto a número', () => {
    expect(cantidadDesdeTexto('1,5')).toBe(1.5)
    expect(cantidadDesdeTexto('12')).toBe(12)
    expect(cantidadDesdeTexto('0.5')).toBe(0.5)
    expect(cantidadDesdeTexto('')).toBe(0)
    expect(cantidadDesdeTexto(',')).toBe(0)
  })

  it('debería mostrar la cantidad con coma y sin miles', () => {
    expect(formatCantidad(1.5)).toBe('1,5')
    expect(formatCantidad(1500)).toBe('1500')
    expect(formatCantidad(2.25)).toBe('2,25')
    expect(esCantidadEntera(2)).toBe(true)
    expect(esCantidadEntera(2.5)).toBe(false)
  })

  it('debería mostrar el precio unitario exacto con hasta 2 decimales', () => {
    expect(formatPrecioUnitario(12333.3333)).toBe('$12.333,33')
    expect(formatPrecioUnitario(18500)).toBe('$18.500')
    expect(formatPrecioUnitario(0.5)).toBe('$0,5')
  })
})

describe('fecha de entrega', () => {
  // 27-10-2026 01:00 UTC = 26-10-2026 en Chile (UTC-3)
  const nocheUtc = new Date('2026-10-27T01:00:00Z')

  it('debería usar el día de Chile', () => {
    expect(hoyChileFechaEntrega(nocheUtc)).toBe('26-10-2026')
  })

  it('debería validar el formato y fechas reales', () => {
    expect(fechaEntregaISO('27-10-2026')).toBe('2026-10-27')
    expect(fechaEntregaISO('31-02-2026')).toBeNull()
    expect(fechaEntregaISO('2026-10-27')).toBeNull()
  })

  it('no debería aceptar fechas pasadas', () => {
    expect(errorFechaEntrega('25-10-2026', nocheUtc)).toMatch(/anterior a hoy/)
    expect(errorFechaEntrega('26-10-2026', nocheUtc)).toBeNull()
    expect(errorFechaEntrega('30-11-2026', nocheUtc)).toBeNull()
    expect(errorFechaEntrega('xx', nocheUtc)).toMatch(/inválida/)
  })
})
