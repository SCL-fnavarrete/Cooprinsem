import { describe, it, expect } from 'vitest'
import { validarRUT, limpiarRUT } from './validations'

describe('limpiarRUT', () => {
  it('elimina puntos y guión', () => {
    expect(limpiarRUT('12.345.678-9')).toBe('123456789')
  })

  it('convierte K a mayúscula', () => {
    expect(limpiarRUT('12.345.678-k')).toBe('12345678K')
  })

  it('retorna vacío para string vacío', () => {
    expect(limpiarRUT('')).toBe('')
  })
})

describe('validarRUT', () => {
  it('valida RUT válido con formato completo', () => {
    // 76.543.210-3 — DV correcto según módulo 11
    expect(validarRUT('76.543.210-3')).toBe(true)
  })

  it('valida RUT válido sin formato', () => {
    expect(validarRUT('765432103')).toBe(true)
  })

  it('valida RUT con dígito verificador K', () => {
    // 10.000.013-K — DV=K según módulo 11
    expect(validarRUT('10.000.013-K')).toBe(true)
    expect(validarRUT('10000013k')).toBe(true)
  })

  it('rechaza RUT con dígito verificador incorrecto', () => {
    expect(validarRUT('76.543.210-0')).toBe(false)
  })

  it('rechaza RUT vacío', () => {
    expect(validarRUT('')).toBe(false)
  })

  it('rechaza RUT de un solo dígito', () => {
    expect(validarRUT('5')).toBe(false)
  })

  it('rechaza string no numérico en el cuerpo', () => {
    expect(validarRUT('ABC-1')).toBe(false)
  })
})
