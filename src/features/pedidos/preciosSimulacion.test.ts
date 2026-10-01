import { describe, it, expect } from 'vitest'
import type { ILineaPedido } from '@/types/pedido'
import { aplicarPreciosPorPosicion, aplicarPreciosSimulacion, obtenerItemSimuladoSap, precioLineaSap } from './preciosSimulacion'

const linea = (overrides: Partial<ILineaPedido>): ILineaPedido => ({
  posicion: '10',
  codigoMaterial: '14700006',
  descripcion: 'PRUEBA DENTAL TREAT PERRO M 134 g',
  cantidad: 2,
  unidadMedida: 'ST',
  precioUnitario: 0,
  subtotal: 0,
  centroSuministrador: '',
  almacen: '',
  recargo: 0,
  descuentoLinea: 0,
  fechaEntrega: '',
  ...overrides,
})

// Forma real de la respuesta de A_SalesOrderSimulation (to_Item.results, montos como string)
const simulacion = {
  to_Item: {
    results: [
      { Material: '14700006', RequestedQuantity: '2', NetAmount: '10908', TaxAmount: '2073' },
      { Material: '000000000014700007', RequestedQuantity: '1', NetAmount: '15000', TaxAmount: '2850' },
    ],
  },
}

describe('precioLineaSap', () => {
  it('debería derivar el precio unitario de NetAmount / RequestedQuantity', () => {
    expect(precioLineaSap({ RequestedQuantity: '2', NetAmount: '10908', TaxAmount: '2073' }))
      .toEqual({ precioUnitario: 5454, neto: 10908, iva: 2073 })
  })

  it('debería retornar null cuando SAP no informa montos', () => {
    expect(precioLineaSap({ RequestedQuantity: '2' })).toBeNull()
    expect(precioLineaSap(undefined)).toBeNull()
  })

  it('debería retornar null cuando la cantidad es 0', () => {
    expect(precioLineaSap({ RequestedQuantity: '0', NetAmount: '100' })).toBeNull()
  })
})

describe('obtenerItemSimuladoSap', () => {
  it('debería encontrar el ítem por material aunque SAP lo devuelva con ceros a la izquierda', () => {
    expect(obtenerItemSimuladoSap(simulacion, 0, '14700007')?.NetAmount).toBe('15000')
  })

  it('debería caer a la posición por índice si el material no coincide', () => {
    expect(obtenerItemSimuladoSap(simulacion, 1, '99999999')?.NetAmount).toBe('15000')
  })
})

describe('aplicarPreciosSimulacion', () => {
  it('debería copiar precio unitario, subtotal e IVA de SAP a cada línea', () => {
    const lineas = [linea({}), linea({ posicion: '20', codigoMaterial: '14700007', cantidad: 1 })]
    const resultado = aplicarPreciosSimulacion(lineas, simulacion)
    expect(resultado[0]).toMatchObject({ precioUnitario: 5454, subtotal: 10908, ivaSap: 2073 })
    expect(resultado[1]).toMatchObject({ precioUnitario: 15000, subtotal: 15000, ivaSap: 2850 })
  })

  it('debería dejar sin cambios las líneas cuando la simulación no trae ítems', () => {
    const lineas = [linea({})]
    expect(aplicarPreciosSimulacion(lineas, {})).toEqual(lineas)
  })
})

describe('aplicarPreciosPorPosicion', () => {
  it('debería asignar el precio a cada línea por número de posición aunque haya huecos', () => {
    const lineas = [linea({ posicion: '10', cantidad: 3 }), linea({ posicion: '30', codigoMaterial: '14700007', cantidad: 2 })]
    const resultado = aplicarPreciosPorPosicion(lineas, [
      { posicion: '30', precioUnitario: 15000, neto: 30000, iva: 5700 },
      { posicion: '10', precioUnitario: 5454, neto: 16362, iva: 3109 },
    ])
    expect(resultado[0]).toMatchObject({ precioUnitario: 5454, subtotal: 16362, ivaSap: 3109, estadoPrecio: 'ok' })
    expect(resultado[1]).toMatchObject({ precioUnitario: 15000, subtotal: 30000, ivaSap: 5700, estadoPrecio: 'ok' })
  })

  it('debería marcar con error solo la línea que SAP no pudo calcular', () => {
    const lineas = [linea({ posicion: '10' }), linea({ posicion: '20', codigoMaterial: '11000074' })]
    const resultado = aplicarPreciosPorPosicion(lineas, [
      { posicion: '10', precioUnitario: 5454, neto: 10908, iva: 2073 },
      { posicion: '20', error: 'Tipo de posición Z001 no está definido' },
    ])
    expect(resultado[0].estadoPrecio).toBe('ok')
    expect(resultado[1]).toMatchObject({ estadoPrecio: 'error', errorPrecio: 'Tipo de posición Z001 no está definido' })
  })

  it('debería quitar el estado "consultando" de las líneas que no vinieron en la respuesta', () => {
    const lineas = [linea({ posicion: '10', cantidad: 0, estadoPrecio: 'consultando' })]
    expect(aplicarPreciosPorPosicion(lineas, [])[0].estadoPrecio).toBeUndefined()
  })
})
