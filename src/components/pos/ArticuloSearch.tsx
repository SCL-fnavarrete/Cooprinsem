import { useState, useRef, useCallback } from 'react'
import { Input, SuggestionItem } from '@ui5/webcomponents-react'
import type { InputDomRef } from '@ui5/webcomponents-react'
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
  const [sugerencias, setSugerencias] = useState<IArticulo[]>([])
  const [_isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<InputDomRef>(null)
  const sugerenciasRef = useRef<IArticulo[]>([])

  const buscar = useCallback(
    (texto: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (texto.length < 2) {
        sugerenciasRef.current = []
        setSugerencias([])
        return
      }
      timerRef.current = setTimeout(async () => {
        setIsLoading(true)
        try {
          const results = await buscarMateriales(texto, centro)
          sugerenciasRef.current = results
          setSugerencias(results)
        } catch {
          sugerenciasRef.current = []
          setSugerencias([])
        } finally {
          setIsLoading(false)
        }
      }, 300)
    },
    [centro]
  )

  const handleInput = (e: CustomEvent) => {
    const target = e.target as HTMLInputElement
    const val = target?.value ?? ''
    buscar(val)
  }

  const handleSelect = (e: { detail: { item: HTMLElement | null } }) => {
    if (!e.detail.item) return
    const itemText = e.detail.item.getAttribute('text') ?? e.detail.item.textContent ?? ''
    const articulo = sugerenciasRef.current.find((a) => itemText.includes(a.codigoMaterial))
    if (articulo) {
      onArticuloSeleccionado(articulo)
      if (inputRef.current) inputRef.current.value = ''
      sugerenciasRef.current = []
      setSugerencias([])
    }
  }

  return (
    <Input
      ref={inputRef}
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
          additionalText={`${formatCLP(a.precioUnitario)} | Stock: ${a.stockDisponible} ${a.unidadMedida}`}
        />
      ))}
    </Input>
  )
}
