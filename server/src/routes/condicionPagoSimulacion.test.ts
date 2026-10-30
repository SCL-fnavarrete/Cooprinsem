import { describe, it, expect } from 'vitest'
import { codigoCondicionPago, armarCondicionPago } from './condicionPagoSimulacion'

describe('codigoCondicionPago', () => {
  it('debería tomar CustomerPaymentTerms de la cabecera', () => {
    expect(codigoCondicionPago({ CustomerPaymentTerms: 'D001', to_Item: { results: [{ CustomerPaymentTerms: 'D002' }] } })).toBe('D001')
  })

  it('debería usar la primera posición que lo traiga si la cabecera viene vacía', () => {
    expect(codigoCondicionPago({ CustomerPaymentTerms: ' ', to_Item: { results: [{ CustomerPaymentTerms: '' }, { CustomerPaymentTerms: 'P030' }] } })).toBe('P030')
  })

  it('debería aceptar to_Item como arreglo directo', () => {
    expect(codigoCondicionPago({ to_Item: [{ CustomerPaymentTerms: 'D000' }] })).toBe('D000')
  })

  it('debería devolver null sin dato o sin simulación', () => {
    expect(codigoCondicionPago({ CustomerPaymentTerms: '' })).toBeNull()
    expect(codigoCondicionPago(null)).toBeNull()
  })
})

describe('armarCondicionPago', () => {
  it('debería unir código y descripción de condicion_pago', () => {
    expect(armarCondicionPago('D001', 'Credito Vcto. dia 12')).toEqual({ codigo: 'D001', descripcion: 'Credito Vcto. dia 12' })
  })

  it('debería dejar la descripción vacía si el código no está en la tabla', () => {
    expect(armarCondicionPago('ZZ99', null)).toEqual({ codigo: 'ZZ99', descripcion: '' })
  })

  it('debería devolver null sin código', () => {
    expect(armarCondicionPago(null, 'Contado')).toBeNull()
  })
})
