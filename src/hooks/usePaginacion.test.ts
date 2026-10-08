import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePaginacion, paginasVisibles } from './usePaginacion'

const items = Array.from({ length: 67 }, (_, i) => i + 1)

describe('usePaginacion', () => {
  it('debería mostrar 10 por página por defecto', () => {
    const { result } = renderHook(() => usePaginacion(items))
    expect(result.current.itemsPagina).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result.current.totalPaginas).toBe(7)
    expect([result.current.desde, result.current.hasta, result.current.total]).toEqual([1, 10, 67])
  })

  it('debería mostrar la última página incompleta', () => {
    const { result } = renderHook(() => usePaginacion(items))
    act(() => result.current.irAPagina(7))
    expect(result.current.itemsPagina).toEqual([61, 62, 63, 64, 65, 66, 67])
    expect([result.current.desde, result.current.hasta]).toEqual([61, 67])
  })

  it('no debería salirse del rango de páginas', () => {
    const { result } = renderHook(() => usePaginacion(items))
    act(() => result.current.irAPagina(99))
    expect(result.current.pagina).toBe(7)
    act(() => result.current.irAPagina(0))
    expect(result.current.pagina).toBe(1)
  })

  it('debería volver a la página 1 al cambiar las filas por página', () => {
    const { result } = renderHook(() => usePaginacion(items))
    act(() => result.current.irAPagina(3))
    act(() => result.current.cambiarTamano(30))
    expect(result.current.pagina).toBe(1)
    expect(result.current.totalPaginas).toBe(3)
    expect(result.current.itemsPagina).toHaveLength(30)
  })

  it('debería volver a la página 1 cuando cambia la lista (ej. al buscar)', () => {
    const { result, rerender } = renderHook(({ lista }) => usePaginacion(lista), { initialProps: { lista: items } })
    act(() => result.current.irAPagina(5))
    rerender({ lista: items.slice(0, 15) })
    expect(result.current.pagina).toBe(1)
    expect(result.current.totalPaginas).toBe(2)
  })

  it('debería indicar 0 registros con la lista vacía', () => {
    const { result } = renderHook(() => usePaginacion([] as number[]))
    expect([result.current.desde, result.current.hasta, result.current.totalPaginas]).toEqual([0, 0, 1])
  })
})

describe('paginasVisibles', () => {
  it('debería listar todas las páginas cuando son 7 o menos', () => {
    expect(paginasVisibles(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('debería mostrar primera, última, la actual con sus vecinas y separadores', () => {
    expect(paginasVisibles(1, 10)).toEqual([1, 2, 'separador', 10])
    expect(paginasVisibles(5, 10)).toEqual([1, 'separador', 4, 5, 6, 'separador', 10])
    expect(paginasVisibles(10, 10)).toEqual([1, 'separador', 9, 10])
  })
})
