import { useState, useEffect, useMemo, useCallback } from 'react'

// Paginación en el navegador para tablas que ya tienen todas sus filas cargadas
// (ej. Admin > Tablas SAP > Perfiles Usuario).

export const TAMANOS_PAGINA = [10, 30, 50, 100] as const
export type TamanoPagina = (typeof TAMANOS_PAGINA)[number]

export type ItemPaginador = number | 'separador'

/**
 * Números de página a mostrar: siempre la primera y la última, la actual y sus
 * vecinas; los saltos se marcan con 'separador' (se muestra "…").
 */
export function paginasVisibles(actual: number, total: number): ItemPaginador[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const paginas = new Set([1, total, actual - 1, actual, actual + 1])
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const resultado: ItemPaginador[] = []
  ordenadas.forEach((p, i) => {
    if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push('separador')
    resultado.push(p)
  })
  return resultado
}

export function usePaginacion<T>(items: T[], tamanoInicial: TamanoPagina = 10) {
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState<TamanoPagina>(tamanoInicial)

  // Lista nueva (buscar, limpiar, recargar) → volver a la página 1
  useEffect(() => { setPagina(1) }, [items])

  const total = items.length
  const totalPaginas = Math.max(1, Math.ceil(total / tamano))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * tamano

  const itemsPagina = useMemo(() => items.slice(inicio, inicio + tamano), [items, inicio, tamano])

  const irAPagina = useCallback((p: number) => {
    setPagina(Math.min(Math.max(1, p), totalPaginas))
  }, [totalPaginas])

  // Cambiar filas por página vuelve a la página 1
  const cambiarTamano = useCallback((t: TamanoPagina) => {
    setTamano(t)
    setPagina(1)
  }, [])

  return {
    itemsPagina,
    pagina: paginaActual,
    totalPaginas,
    tamano,
    total,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + tamano, total),
    irAPagina,
    cambiarTamano,
  }
}
