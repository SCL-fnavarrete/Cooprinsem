import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePedido } from './usePedido'
import { crearArticuloMock } from '@/test/factories'

describe('usePedido', () => {
  it('inicia con estado vacío', () => {
    const { result } = renderHook(() => usePedido())
    expect(result.current.lineas).toHaveLength(0)
    expect(result.current.subtotal).toBe(0)
    expect(result.current.totalIVA).toBe(0)
    expect(result.current.total).toBe(0)
    expect(result.current.clienteSeleccionado).toBeNull()
  })

  describe('al agregar artículos', () => {
    it('asigna posición 10 al primer artículo', () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.agregarArticulo(crearArticuloMock({ precioUnitario: 10000 }))
      })
      expect(result.current.lineas).toHaveLength(1)
      expect(result.current.lineas[0].posicion).toBe('10')
    })

    it('asigna posiciones correlativas en múltiplos de 10', () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.agregarArticulo(crearArticuloMock())
        result.current.agregarArticulo(crearArticuloMock())
        result.current.agregarArticulo(crearArticuloMock())
      })
      const posiciones = result.current.lineas.map((l) => l.posicion)
      expect(posiciones).toEqual(['10', '20', '30'])
    })

    it('calcula el subtotal correctamente', () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.agregarArticulo(crearArticuloMock({ precioUnitario: 10000 }))
      })
      expect(result.current.subtotal).toBe(10000)
    })

    it('calcula el IVA 19% sobre el subtotal', () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.agregarArticulo(crearArticuloMock({ precioUnitario: 10000 }))
      })
      expect(result.current.totalIVA).toBe(1900)
      expect(result.current.total).toBe(11900)
    })
  })

  describe('actualizar cantidad', () => {
    it('recalcula el subtotal de la línea', () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.agregarArticulo(crearArticuloMock({ precioUnitario: 5000 }))
      })
      act(() => {
        result.current.actualizarCantidad('10', 3)
      })
      expect(result.current.lineas[0].subtotal).toBe(15000)
      expect(result.current.subtotal).toBe(15000)
    })
  })

  describe('eliminar línea', () => {
    it('elimina la línea sin renumerar posiciones (convención SAP)', () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.agregarArticulo(crearArticuloMock())
        result.current.agregarArticulo(crearArticuloMock())
        result.current.agregarArticulo(crearArticuloMock())
      })
      act(() => {
        result.current.eliminarLinea('20')
      })
      expect(result.current.lineas).toHaveLength(2)
      // Posiciones 10 y 30 se mantienen — no renumera
      expect(result.current.lineas.map((l) => l.posicion)).toEqual(['10', '30'])
    })
  })

  describe('seleccionar cliente', () => {
    it('actualiza el cliente y el código en el header', () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.seleccionarCliente({
          codigoCliente: '0001000001',
          nombre: 'Test',
          rut: '',
          condicionPago: 'CONT',
          estadoCredito: 'AL_DIA',
          creditoAsignado: 0,
          creditoUtilizado: 0,
          porcentajeAgotamiento: 0,
          sucursal: 'D190',
        })
      })
      expect(result.current.clienteSeleccionado?.codigoCliente).toBe('0001000001')
      expect(result.current.header.codigoCliente).toBe('0001000001')
    })
  })

  describe('limpiar', () => {
    it('resetea el pedido a estado vacío', () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.agregarArticulo(crearArticuloMock({ precioUnitario: 5000 }))
        result.current.limpiar()
      })
      expect(result.current.lineas).toHaveLength(0)
      expect(result.current.total).toBe(0)
      expect(result.current.clienteSeleccionado).toBeNull()
    })
  })

  describe('grabar', () => {
    it('lanza error si no hay cliente', async () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.agregarArticulo(crearArticuloMock())
      })
      await expect(result.current.grabar()).rejects.toThrow(/cliente/i)
    })

    it('lanza error si no hay líneas', async () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.seleccionarCliente({
          codigoCliente: '0001000001',
          nombre: 'Test',
          rut: '',
          condicionPago: 'CONT',
          estadoCredito: 'AL_DIA',
          creditoAsignado: 0,
          creditoUtilizado: 0,
          porcentajeAgotamiento: 0,
          sucursal: 'D190',
        })
      })
      await expect(result.current.grabar()).rejects.toThrow(/artículo/i)
    })

    it('retorna VBELN al grabar exitosamente', async () => {
      const { result } = renderHook(() => usePedido())
      act(() => {
        result.current.seleccionarCliente({
          codigoCliente: '0001000001',
          nombre: 'Test',
          rut: '',
          condicionPago: 'CONT',
          estadoCredito: 'AL_DIA',
          creditoAsignado: 0,
          creditoUtilizado: 0,
          porcentajeAgotamiento: 0,
          sucursal: 'D190',
        })
        result.current.agregarArticulo(crearArticuloMock({ precioUnitario: 10000 }))
      })
      let vbeln: string = ''
      await act(async () => {
        vbeln = await result.current.grabar()
      })
      expect(vbeln).toBeTruthy()
      expect(result.current.resultado?.VBELN).toBe(vbeln)
    })
  })
})
