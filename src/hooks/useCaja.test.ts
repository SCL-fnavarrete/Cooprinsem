import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCaja } from './useCaja'
import { crearClienteMock, PARTIDAS_MOCK } from '@/test/factories'

describe('useCaja', () => {
  it('carga todas las partidas al montar (sin filtro de cliente)', async () => {
    const { result } = renderHook(() => useCaja())

    // Esperar a que se carguen las partidas
    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    // Debe tener todas las partidas del mock
    expect(result.current.partidas.length).toBe(PARTIDAS_MOCK.length)
    expect(result.current.clienteSeleccionado).toBeNull()
    expect(result.current.partidasSeleccionadas).toEqual([])
    expect(result.current.totalSeleccionado).toBe(0)
    expect(result.current.isCobrando).toBe(false)
  })

  it('filtra partidas al seleccionar cliente', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    // Esperar carga inicial
    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    act(() => {
      result.current.seleccionarCliente(cliente)
    })

    expect(result.current.clienteSeleccionado).toEqual(cliente)
    // Solo las partidas del cliente 0001000001
    expect(result.current.partidas.length).toBeGreaterThan(0)
    expect(result.current.partidas.every((p) => p.kunnr === '0001000001')).toBe(true)
  })

  it('retorna array vacío para cliente sin partidas', async () => {
    const { result } = renderHook(() => useCaja())

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    const cliente = crearClienteMock({ codigoCliente: '0009999999' })
    act(() => {
      result.current.seleccionarCliente(cliente)
    })

    expect(result.current.partidas).toEqual([])
  })

  it('togglea selección de partida', async () => {
    const { result } = renderHook(() => useCaja())

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
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

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    act(() => {
      result.current.seleccionarCliente(cliente)
    })

    // Seleccionar todas las partidas del cliente
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

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    act(() => {
      result.current.seleccionarCliente(cliente)
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

  it('resetea estado y recarga todas las partidas', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    act(() => {
      result.current.seleccionarCliente(cliente)
    })

    await act(async () => {
      result.current.resetear()
    })

    expect(result.current.clienteSeleccionado).toBeNull()
    expect(result.current.partidasSeleccionadas).toEqual([])
    expect(result.current.totalSeleccionado).toBe(0)

    // Tras resetear, se recargan todas las partidas
    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })
    expect(result.current.partidas.length).toBe(PARTIDAS_MOCK.length)
  })

  it('muestra todas las partidas al deseleccionar cliente', async () => {
    const { result } = renderHook(() => useCaja())
    const cliente = crearClienteMock({ codigoCliente: '0001000001' })

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    act(() => {
      result.current.seleccionarCliente(cliente)
    })

    // Filtradas por cliente
    const countFiltrado = result.current.partidas.length
    expect(countFiltrado).toBeGreaterThan(0)

    act(() => {
      result.current.deseleccionarCliente()
    })

    // Todas las partidas vuelven
    expect(result.current.clienteSeleccionado).toBeNull()
    expect(result.current.partidas.length).toBe(PARTIDAS_MOCK.length)
  })

  it('clienteDerivado es null cuando no hay partidas seleccionadas', async () => {
    const { result } = renderHook(() => useCaja())

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    expect(result.current.clienteDerivado).toBeNull()
  })

  it('clienteDerivado retorna kunnr cuando todas las partidas son del mismo cliente', async () => {
    const { result } = renderHook(() => useCaja())

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    // Seleccionar partidas del cliente 0001000001
    const partidasCliente = result.current.partidas.filter(p => p.kunnr === '0001000001')
    expect(partidasCliente.length).toBeGreaterThan(0)

    act(() => {
      partidasCliente.forEach(p => result.current.togglePartida(p.belnr))
    })

    expect(result.current.clienteDerivado).toEqual({ kunnr: '0001000001' })
  })

  it('clienteDerivado retorna MULTIPLE cuando hay partidas de distintos kunnr', async () => {
    const { result } = renderHook(() => useCaja())

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    // Seleccionar una partida de cada cliente distinto
    const kunnrs = [...new Set(result.current.partidas.map(p => p.kunnr))]
    expect(kunnrs.length).toBeGreaterThan(1)

    const belnrs = kunnrs.map(k => result.current.partidas.find(p => p.kunnr === k)!.belnr)
    act(() => {
      belnrs.forEach(b => result.current.togglePartida(b))
    })

    expect(result.current.clienteDerivado).toBe('MULTIPLE')
  })

  it('filtra por código de cliente', async () => {
    const { result } = renderHook(() => useCaja())

    await waitFor(() => {
      expect(result.current.isLoadingPartidas).toBe(false)
    })

    act(() => {
      result.current.setFiltroCliente('999999')
    })

    // Solo partidas del cliente boleta
    expect(result.current.partidas.length).toBe(3)
    expect(result.current.partidas.every((p) => p.kunnr === '999999')).toBe(true)
  })
})
