import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCaja } from './useCaja'
import { crearClienteMock } from '@/test/factories'

describe('useCaja', () => {
  it('inicia con estado vacío', () => {
    const { result } = renderHook(() => useCaja())
    expect(result.current.clienteSeleccionado).toBeNull()
    expect(result.current.partidas).toEqual([])
    expect(result.current.partidasSeleccionadas).toEqual([])
    expect(result.current.totalSeleccionado).toBe(0)
    expect(result.current.isCobrando).toBe(false)
  })

  it('carga partidas al seleccionar cliente', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    await act(async () => {
      await result.current.seleccionarCliente(cliente)
    })

    expect(result.current.clienteSeleccionado).toEqual(cliente)
    expect(result.current.partidas.length).toBeGreaterThan(0)
  })

  it('retorna array vacío para cliente sin partidas', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0009999999' })

    await act(async () => {
      await result.current.seleccionarCliente(cliente)
    })

    expect(result.current.partidas).toEqual([])
  })

  it('togglea selección de partida', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    await act(async () => {
      await result.current.seleccionarCliente(cliente)
    })

    const belnr = result.current.partidas[0]?.belnr
    if (!belnr) return

    // Seleccionar
    act(() => {
      result.current.togglePartida(belnr)
    })
    expect(result.current.partidasSeleccionadas).toContain(belnr)

    // Deseleccionar
    act(() => {
      result.current.togglePartida(belnr)
    })
    expect(result.current.partidasSeleccionadas).not.toContain(belnr)
  })

  it('calcula total seleccionado correctamente', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    await act(async () => {
      await result.current.seleccionarCliente(cliente)
    })

    // Seleccionar todas las partidas
    act(() => {
      result.current.partidas.forEach((p) => {
        result.current.togglePartida(p.belnr)
      })
    })

    const expectedTotal = result.current.partidas.reduce((acc, p) => acc + p.importe, 0)
    expect(result.current.totalSeleccionado).toBe(expectedTotal)
  })

  it('registra cobro efectivo exitosamente', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    await act(async () => {
      await result.current.seleccionarCliente(cliente)
    })

    const belnr = result.current.partidas[0]?.belnr
    if (!belnr) return

    act(() => {
      result.current.togglePartida(belnr)
    })

    let res
    await act(async () => {
      res = await result.current.confirmarCobroEfectivo(result.current.totalSeleccionado)
    })

    expect(res).toBeDefined()
    expect(result.current.resultadoCobro?.BLART).toBe('W')
    expect(result.current.resultadoCobro?.BUKRS).toBe('COOP')
  })

  it('resetea todo el estado', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    await act(async () => {
      await result.current.seleccionarCliente(cliente)
    })

    act(() => {
      result.current.resetear()
    })

    expect(result.current.clienteSeleccionado).toBeNull()
    expect(result.current.partidas).toEqual([])
    expect(result.current.partidasSeleccionadas).toEqual([])
    expect(result.current.totalSeleccionado).toBe(0)
  })

  it('limpia partidas al deseleccionar cliente', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    await act(async () => {
      await result.current.seleccionarCliente(cliente)
    })

    act(() => {
      result.current.deseleccionarCliente()
    })

    expect(result.current.clienteSeleccionado).toBeNull()
    expect(result.current.partidas).toEqual([])
  })
})
