import { describe, it, expect } from 'vitest'
import { codigosInterlocutor, eleccionAutomatica, interlocutoresUnicos, type IInterlocutor } from './posMaestros'

const fila = (id: number, PartnerFunction: string, BPCustomerNumber: string, SalesOrganization = 'COOP'): IInterlocutor => ({
  id, Customer: '10000003', SalesOrganization, DistributionChannel: '00', Division: '00', PartnerCounter: '0',
  PartnerFunction, BPCustomerNumber, CustomerPartnerDescription: '', DefaultPartner: false,
})

// La tabla repite la misma relación por cada área de venta
const filas = [fila(1, 'SH', '10000003'), fila(2, 'SH', '10000003', 'OTRA'), fila(3, 'SP', '10000003'), fila(4, 'ZB', '90001424')]

describe('interlocutores de Nuevo Pedido', () => {
  it('debería contar cada código una sola vez por función', () => {
    expect(codigosInterlocutor(filas, 'SH')).toEqual(['10000003'])
    expect(interlocutoresUnicos(filas, 'SH').map((i) => i.id)).toEqual([1])
  })

  it('debería elegir automáticamente solo cuando hay uno', () => {
    expect(eleccionAutomatica(['10000003'])).toBe('10000003')
    expect(eleccionAutomatica([])).toBe('')
    expect(eleccionAutomatica(['10000003', '80000344'])).toBe('')
  })

  it('debería preferir el destinatario elegido en Clientes si está en la lista', () => {
    expect(eleccionAutomatica(['10000003', '80000344'], '80000344')).toBe('80000344')
    expect(eleccionAutomatica(['10000003'], '99999999')).toBe('10000003')
  })
})
