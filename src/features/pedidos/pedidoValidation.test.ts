import { describe, it, expect } from 'vitest'
import { validarPedido } from './pedidoValidation'
import type { IPedido } from '@/types/pedido'

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
      descripcion: 'Test',
      cantidad: 5,
      unidadMedida: 'UN',
      precioUnitario: 1000,
      subtotal: 5000,
    },
  ],
}

describe('validarPedido', () => {
  it('retorna válido para un pedido completo', () => {
    const result = validarPedido(pedidoValido)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rechaza pedido sin cliente', () => {
    const pedido: IPedido = {
      ...pedidoValido,
      header: { ...pedidoValido.header, codigoCliente: '' },
    }
    const result = validarPedido(pedido)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Debe seleccionar un cliente')
  })

  it('rechaza pedido sin líneas', () => {
    const pedido: IPedido = { ...pedidoValido, lineas: [] }
    const result = validarPedido(pedido)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Debe agregar al menos un artículo')
  })

  it('rechaza pedido con cantidad 0', () => {
    const pedido: IPedido = {
      ...pedidoValido,
      lineas: [{ ...pedidoValido.lineas[0], cantidad: 0 }],
    }
    const result = validarPedido(pedido)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('cantidad debe ser mayor a 0')
  })

  it('rechaza pedido sin canal de distribución', () => {
    const pedido: IPedido = {
      ...pedidoValido,
      header: { ...pedidoValido.header, canalDistribucion: '' as never },
    }
    const result = validarPedido(pedido)
    expect(result.valid).toBe(false)
  })

  it('rechaza pedido sin tipo de documento', () => {
    const pedido: IPedido = {
      ...pedidoValido,
      header: { ...pedidoValido.header, tipoDocumento: '' as never },
    }
    const result = validarPedido(pedido)
    expect(result.valid).toBe(false)
  })
})
