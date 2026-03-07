import { describe, it, expect } from 'vitest'
import { crearPedido } from './pedidos'
import type { IPedido } from '@/types/pedido'

describe('crearPedido', () => {
  const pedidoValido: IPedido = {
    header: {
      codigoCliente: '0001000001',
      canalDistribucion: 'Venta Mesón',
      tipoDocumento: 'Venta Normal',
      referencia: '',
      observaciones: '',
    },
    lineas: [
      {
        posicion: '10',
        codigoMaterial: 'MAT000001',
        descripcion: 'Clavo de acero 3"',
        cantidad: 5,
        unidadMedida: 'UN',
        precioUnitario: 2490,
        subtotal: 12450,
      },
    ],
  }

  it('crea un pedido y retorna VBELN', async () => {
    const result = await crearPedido(pedidoValido)
    expect(result.VBELN).toBeTruthy()
    expect(result.BLART).toBe('ZPOS')
  })

  it('lanza error cuando faltan datos requeridos', async () => {
    const pedidoSinLineas: IPedido = {
      ...pedidoValido,
      lineas: [],
    }
    await expect(crearPedido(pedidoSinLineas)).rejects.toThrow()
  })
})
