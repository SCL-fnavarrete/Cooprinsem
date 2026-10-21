import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFueraDeVista } from './useFueraDeVista'
import { instalarIntersectionObserverMock } from '@/test/intersectionObserverMock'

describe('useFueraDeVista', () => {
  let mock: ReturnType<typeof instalarIntersectionObserverMock> | null = null
  afterEach(() => { mock?.quitar(); mock = null })

  it('debería indicar true cuando el elemento queda arriba, fuera de la vista, y false al volver', () => {
    mock = instalarIntersectionObserverMock()
    const ref = { current: document.createElement('div') }
    const { result } = renderHook(() => useFueraDeVista(ref))
    expect(result.current).toBe(false)
    act(() => mock!.simular(true))
    expect(result.current).toBe(true)
    act(() => mock!.simular(false))
    expect(result.current).toBe(false)
  })

  it('debería devolver false si el navegador no tiene IntersectionObserver', () => {
    const ref = { current: document.createElement('div') }
    const { result } = renderHook(() => useFueraDeVista(ref))
    expect(result.current).toBe(false)
  })
})
