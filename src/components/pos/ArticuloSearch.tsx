import { useState, useRef, useCallback } from 'react'
import { Input, SuggestionItem } from '@ui5/webcomponents-react'
import type { IArticulo } from '@/types/articulo'
import { buscarMateriales } from '@/services/api/materiales'
import { formatCLP } from '@/utils/format'

interface ArticuloSearchProps {
  onArticuloSeleccionado: (articulo: IArticulo) => void
  centro?: string
  disabled?: boolean
}

export function ArticuloSearch({
  onArticuloSeleccionado,
  centro,
  disabled = false,
}: ArticuloSearchProps) {
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<IArticulo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback(
    (texto: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (texto.length < 2) {
        setSugerencias([])
        return
      }
      timerRef.current = setTimeout(async () => {
        setIsLoading(true)
        try {
          const results = await buscarMateriales(texto, centro)
          setSugerencias(results)
        } catch {
          setSugerencias([])
        } finally {
          setIsLoading(false)
        }
      }, 300)
    },
    [centro]
  )

  const handleInput = (e: { target: { value: string } }) => {
    const val = e.target.value
    setQuery(val)
    buscar(val)
  }

  const handleSelect = (e: { detail: { item: HTMLElement } }) => {
    const itemText = e.detail.item.getAttribute('text') ?? e.detail.item.textContent ?? ''
    const articulo = sugerencias.find((a) => itemText.includes(a.codigoMaterial))
    if (articulo) {
      onArticuloSeleccionado(articulo)
      setQuery('')
      setSugerencias([])
    }
  }

  return (
    <Input
      placeholder="Buscar artículo por código o descripción..."
      value={query}
      onInput={handleInput}
      onSelectionChange={handleSelect}
      showSuggestions
      disabled={disabled}
      loading={isLoading}
      style={{ width: '100%' }}
      aria-label="Buscar artículo"
    >
      {sugerencias.map((a) => (
        <SuggestionItem
          key={a.codigoMaterial}
          text={`${a.codigoMaterial} - ${a.descripcion}`}
          additionalText={`${formatCLP(a.precioUnitario)} | Stock: ${a.stockDisponible} ${a.unidadMedida}`}
        />
      ))}
    </Input>
  )
}
