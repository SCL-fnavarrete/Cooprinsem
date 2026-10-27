import { useState, useRef, useCallback, type Ref } from 'react'
import { Input, SuggestionItem, MessageStrip, Label } from '@ui5/webcomponents-react'
import type { InputDomRef } from '@ui5/webcomponents-react'
import type { IArticulo } from '@/types/articulo'
import { buscarMaterialesSap } from '@/services/api/sapStock'

interface ArticuloSearchProps {
  onArticuloSeleccionado: (articulo: IArticulo) => void
  centro?: string
  disabled?: boolean
  // Para enfocar el buscador desde fuera (F2, Enter en la grilla de artículos)
  inputRef?: Ref<InputDomRef>
}

// Texto de cada sugerencia: también sirve para reconocer el artículo elegido
const textoSugerencia = (a: IArticulo) => `${a.codigoMaterial} - ${a.descripcion}`

type EstadoBusqueda = 'idle' | 'buscando' | 'ok' | 'sin_resultados' | 'error'

export function ArticuloSearch({
  onArticuloSeleccionado,
  centro,
  disabled = false,
  inputRef,
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

  // Solo Enter o clic agregan el artículo: UI5 dispara "change" con el texto de la
  // sugerencia elegida. "selection-change" no sirve: también se dispara al moverse
  // con las flechas (vista previa) y agregaba el artículo sin confirmarlo.
  const handleChange = (e: { target: unknown }) => {
    const texto = (e.target as InputDomRef | null)?.value ?? ''
    const articulo = sugerenciasRef.current.find((a) => textoSugerencia(a) === texto)
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
        ref={inputRef}
        value={query}
        placeholder="Buscar artículo por código o descripción..."
        onInput={handleInput}
        onChange={handleChange}
        showSuggestions
        disabled={disabled}
        style={{ width: '100%' }}
        aria-label="Buscar artículo"
      >
        {sugerencias.map((a) => (
          <SuggestionItem
            key={a.codigoMaterial}
            text={textoSugerencia(a)}
            additionalText={`Stock: ${a.stockDisponible} ${a.unidadMedida}`}
          />
        ))}
      </Input>
      <Label style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>
        ↑↓ moverse · Enter agregar · Esc cerrar · F2 volver al buscador
      </Label>

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
