import { useState, useRef, useCallback } from 'react'
import { Input, SuggestionItem, MessageStrip } from '@ui5/webcomponents-react'
import type { IArticulo } from '@/types/articulo'
import { buscarMaterialesSap } from '@/services/api/sapStock'

interface ArticuloSearchProps {
  onArticuloSeleccionado: (articulo: IArticulo) => void
  centro?: string
  disabled?: boolean
}

type EstadoBusqueda = 'idle' | 'buscando' | 'ok' | 'sin_resultados' | 'error'

export function ArticuloSearch({
  onArticuloSeleccionado,
  centro,
  disabled = false,
}: ArticuloSearchProps) {
  const [sugerencias, setSugerencias] = useState<IArticulo[]>([])
  const [query, setQuery] = useState('')
  const [estadoBusqueda, setEstadoBusqueda] = useState<EstadoBusqueda>('idle')
  const [terminoBuscado, setTerminoBuscado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sugerenciasRef = useRef<IArticulo[]>([])
  // Descarta respuestas de búsquedas viejas si una más nueva ya se disparó
  const requestIdRef = useRef(0)

  const buscar = useCallback(
    (texto: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (texto.length < 2) {
        requestIdRef.current++
        sugerenciasRef.current = []
        setSugerencias([])
        setEstadoBusqueda('idle')
        setError(null)
        return
      }
      timerRef.current = setTimeout(async () => {
        const requestId = ++requestIdRef.current
        setEstadoBusqueda('buscando')
        setError(null)
        setTerminoBuscado(texto)
        try {
          const results = await buscarMaterialesSap(texto, centro)
          if (requestId !== requestIdRef.current) return // llegó una respuesta vieja, descartar
          sugerenciasRef.current = results
          setSugerencias(results)
          setEstadoBusqueda(results.length === 0 ? 'sin_resultados' : 'ok')
        } catch (err) {
          if (requestId !== requestIdRef.current) return
          sugerenciasRef.current = []
          setSugerencias([])
          setError(err instanceof Error ? err.message : 'Error al buscar materiales en SAP')
          setEstadoBusqueda('error')
        }
      }, 300)
    },
    [centro]
  )

  const handleInput = (e: CustomEvent) => {
    const target = e.target as HTMLInputElement
    const val = target?.value ?? ''
    setQuery(val)
    buscar(val)
  }

  const handleSelect = (e: { detail: { item: HTMLElement | null } }) => {
    if (!e.detail.item) return
    const itemText = e.detail.item.getAttribute('text') ?? e.detail.item.textContent ?? ''
    const articulo = sugerenciasRef.current.find((a) => itemText.includes(a.codigoMaterial))
    if (articulo) {
      onArticuloSeleccionado(articulo)
      requestIdRef.current++
      setQuery('')
      sugerenciasRef.current = []
      setSugerencias([])
      setEstadoBusqueda('idle')
      setError(null)
    }
  }

  return (
    <div>
      <Input
        value={query}
        placeholder="Buscar artículo por código o descripción..."
        onInput={handleInput}
        onSelectionChange={handleSelect}
        showSuggestions
        disabled={disabled}
        style={{ width: '100%' }}
        aria-label="Buscar artículo"
      >
        {sugerencias.map((a) => (
          <SuggestionItem
            key={a.codigoMaterial}
            text={`${a.codigoMaterial} - ${a.descripcion}`}
            additionalText={`Stock: ${a.stockDisponible} ${a.unidadMedida}`}
          />
        ))}
      </Input>

      {estadoBusqueda === 'buscando' && (
        <MessageStrip design="Information" hideCloseButton style={{ marginTop: '0.5rem' }}>
          Buscando...
        </MessageStrip>
      )}

      {estadoBusqueda === 'sin_resultados' && (
        <MessageStrip design="Information" hideCloseButton style={{ marginTop: '0.5rem' }}>
          0 coincidencias encontradas para: {terminoBuscado}
        </MessageStrip>
      )}

      {estadoBusqueda === 'error' && (
        <MessageStrip design="Negative" hideCloseButton style={{ marginTop: '0.5rem' }}>
          <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
        </MessageStrip>
      )}
    </div>
  )
}
