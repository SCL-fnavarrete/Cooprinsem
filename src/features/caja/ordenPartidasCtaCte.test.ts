import { describe, it, expect } from 'vitest'
import { ordenarPartidasCtaCte, siguienteOrden, ORDEN_CTACTE_DEFECTO } from './ordenPartidasCtaCte'
import type { IPartidaCtaCte } from '@/types/ctaCte'

function partida(documento: string, fechaVencimiento: string, monto: number, diasMora: number, extra: Partial<IPartidaCtaCte> = {}): IPartidaCtaCte {
  return {
    documento, posicion: '001', ejercicio: '2026', tipoDocumento: 'D1', tipoDocumentoNombre: 'Factura', folio: '',
    documentoFacturacion: '', debeHaber: 'S', moneda: 'CLP', monto, monedaDocumento: 'CLP', montoDocumento: monto,
    fechaDocumento: '2026-09-01', fechaVencimiento, diasMora, bloqueoPago: '', sucursal: '', ...extra,
  }
}

const docs = (lista: IPartidaCtaCte[]) => lista.map((p) => p.documento)

describe('ordenarPartidasCtaCte', () => {
  const partidas = [
    partida('B', '2026-12-31', 500, -80),
    partida('A', '2026-08-26', 100, 40),
    partida('C', '2026-10-12', 300, -5),
    partida('D', '', 200, 0),
  ]

  it('debería ordenar por defecto con la fecha de vencimiento más próxima primero y las sin fecha al final', () => {
    expect(docs(ordenarPartidasCtaCte(partidas, ORDEN_CTACTE_DEFECTO))).toEqual(['A', 'C', 'B', 'D'])
  })

  it('debería dejar las sin fecha al final también en orden descendente', () => {
    expect(docs(ordenarPartidasCtaCte(partidas, { columna: 'fechaVencimiento', direccion: 'desc' }))).toEqual(['B', 'C', 'A', 'D'])
  })

  it('debería ordenar montos como números', () => {
    expect(docs(ordenarPartidasCtaCte(partidas, { columna: 'monto', direccion: 'asc' }))).toEqual(['A', 'D', 'C', 'B'])
  })

  it('debería ordenar el estado de más días de mora a menos, con las pagadas al final', () => {
    const conPagada = [...partidas, partida('E', '2026-08-01', 50, 60, { pagoPendiente: '1400000059' })]
    expect(docs(ordenarPartidasCtaCte(conPagada, { columna: 'estado', direccion: 'asc' }))).toEqual(['A', 'D', 'C', 'B', 'E'])
  })

  it('no debería modificar el arreglo original', () => {
    const copia = [...partidas]
    ordenarPartidasCtaCte(partidas, { columna: 'monto', direccion: 'desc' })
    expect(partidas).toEqual(copia)
  })
})

describe('siguienteOrden', () => {
  it('debería invertir la dirección al hacer clic en la misma columna', () => {
    expect(siguienteOrden(ORDEN_CTACTE_DEFECTO, 'fechaVencimiento')).toEqual({ columna: 'fechaVencimiento', direccion: 'desc' })
  })

  it('debería partir ascendente al cambiar de columna', () => {
    expect(siguienteOrden({ columna: 'monto', direccion: 'desc' }, 'documento')).toEqual({ columna: 'documento', direccion: 'asc' })
  })
})
