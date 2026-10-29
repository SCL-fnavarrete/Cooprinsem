import { describe, it, expect } from 'vitest'
import { comprobanteDeClase, clienteBoletaNoPermitido, correspondeFacturar } from './comprobante'

describe('comprobanteDeClase', () => {
  it('debería clasificar ZV02 como boleta, ZV01/04/06/07/15 como factura y el resto por definir', () => {
    expect(comprobanteDeClase('ZV02')).toBe('Boleta')
    for (const c of ['ZV01', 'ZV04', 'ZV06', 'ZV07', 'ZV15']) expect(comprobanteDeClase(c)).toBe('Factura')
    for (const c of ['ZC01', 'ZD01', 'ZN01', 'ZN02', 'ZN05', '', undefined]) expect(comprobanteDeClase(c)).toBe('Por definir')
  })
})

describe('clienteBoletaNoPermitido', () => {
  it('debería permitir el Cliente Boleta solo en ventas boleta', () => {
    expect(clienteBoletaNoPermitido('999999', 'ZV01')).toBe(true)
    expect(clienteBoletaNoPermitido('0000999999', 'ZV02')).toBe(false)
    expect(clienteBoletaNoPermitido('999999', 'ZV04')).toBe(true)
    expect(clienteBoletaNoPermitido('999999', 'ZC01')).toBe(true)
    expect(clienteBoletaNoPermitido('10000003', 'ZV04')).toBe(false)
  })
})

describe('correspondeFacturar', () => {
  it('debería facturar automáticamente solo Venta normal (ZV01)', () => {
    expect(correspondeFacturar('ZV01')).toBe(true)
    expect(correspondeFacturar(' zv01 ')).toBe(true)
    for (const c of ['ZV02', 'ZV04', 'ZV06', 'ZV07', 'ZV15', 'ZC01']) expect(correspondeFacturar(c)).toBe(false)
  })
})
