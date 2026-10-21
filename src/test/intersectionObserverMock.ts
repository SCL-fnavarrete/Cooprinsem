import { vi } from 'vitest'

// jsdom no trae IntersectionObserver: este doble permite simular que un
// elemento entra o sale de la vista (useFueraDeVista / ResumenFlotante).
type Callback = (entradas: Partial<IntersectionObserverEntry>[]) => void

export function instalarIntersectionObserverMock() {
  const observadores: { callback: Callback; elementos: Element[] }[] = []
  class IntersectionObserverMock {
    private registro: { callback: Callback; elementos: Element[] }
    constructor(callback: Callback) {
      this.registro = { callback, elementos: [] }
      observadores.push(this.registro)
    }
    observe(elemento: Element) { this.registro.elementos.push(elemento) }
    unobserve() {}
    disconnect() { this.registro.elementos = [] }
    takeRecords() { return [] }
  }
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)

  /** Simula que el elemento observado quedó arriba, fuera de la vista (true) o volvió a verse (false). */
  function simular(fueraArriba: boolean) {
    for (const o of observadores) {
      for (const elemento of o.elementos) {
        o.callback([{
          target: elemento,
          isIntersecting: !fueraArriba,
          boundingClientRect: { top: fueraArriba ? -300 : 100 } as DOMRectReadOnly,
          rootBounds: { height: 800 } as DOMRectReadOnly,
        }])
      }
    }
  }
  return { simular, quitar: () => vi.unstubAllGlobals() }
}
