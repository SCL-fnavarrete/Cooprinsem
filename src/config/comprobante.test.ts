import { describe, it, expect } from 'vitest'
import { comprobanteDeClase, clienteBoletaNoPermitido, correspondeFacturar } from './comprobante'

describe('comprobanteDeClase', () => {
  it('debería clasificar ZV01 y ZV02 como boleta, ZV04/06/07/15 como factura y el resto por definir', () => {
    expect(comprobanteDeClase('ZV01')).toBe('Boleta')
    expect(comprobanteDeClase('ZV02')).toBe('Boleta')
    for (const c of ['ZV04', 'ZV06', 'ZV07', 'ZV15']) expect(comprobanteDeClase(c)).toBe('Factura')
    for (const c of ['ZC01', 'ZD01', 'ZN01', 'ZN02', 'ZN05', '', undefined]) expect(comprobanteDeClase(c)).toBe('Por definir')
  })
})

describe('clienteBoletaNoPermitido', () => {
  it('debería permitir el Cliente Boleta solo en ventas boleta', () => {
    expect(clienteBoletaNoPermitido('999999', 'ZV01')).toBe(false)
    expect(clienteBoletaNoPermitido('0000999999', 'ZV02')).toBe(false)
    expect(clienteBoletaNoPermitido('999999', 'ZV04')).toBe(true)
    expect(clienteBoletaNoPermitido('999999', 'ZC01')).toBe(true)
    expect(clienteBoletaNoPermitido('10000003', 'ZV04')).toBe(false)
  })
})

describe('correspondeFacturar', () => {
  it('no debería facturar automáticamente ninguna clase por ahora (ZV01 es boleta; facturas pendientes)', () => {
    for (const c of ['ZV01', 'ZV02', 'ZV04', 'ZV06', 'ZV07', 'ZV15', 'ZC01']) expect(correspondeFacturar(c)).toBe(false)
  })
})
