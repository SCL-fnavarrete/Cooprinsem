import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ICliente } from '@/types/cliente'

// Lista de sugerencias de clientes del panel Clientes (pestañas Buscar y Ficha),
// con teclado como el buscador de Nuevo Pedido (27-10-2026): ↑/↓ marcan un
// cliente, Enter o clic lo eligen, Esc cierra la lista.

/**
 * Estado del teclado de la lista. `alPresionarTecla` va en el onKeyDown del campo
 * de búsqueda; devuelve true si la tecla fue de la lista (para no hacer nada más).
 */
export function useTecladoSugerencias(
  clientes: ICliente[],
  abierta: boolean,
  onElegir: (cliente: ICliente) => void,
  onCerrar: () => void,
) {
  const [indice, setIndice] = useState(-1)
  // Lista nueva → sin marca
  useEffect(() => setIndice(-1), [clientes])

  const alPresionarTecla = (e: KeyboardEvent<HTMLElement>): boolean => {
    if (!abierta || clientes.length === 0) return false
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setIndice((i) => (e.key === 'ArrowDown' ? Math.min(clientes.length - 1, i + 1) : Math.max(0, i - 1)))
      return true
    }
    if (e.key === 'Enter' && indice >= 0 && clientes[indice]) {
      e.preventDefault()
      onElegir(clientes[indice])
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCerrar()
      return true
    }
    return false
  }

  return { indice, setIndice, alPresionarTecla }
}

interface Props {
  clientes: ICliente[]
  indice: number
  onElegir: (cliente: ICliente) => void
  onMarcar: (indice: number) => void
  'data-testid'?: string
}

export function ListaSugerenciasClientes({ clientes, indice, onElegir, onMarcar, 'data-testid': testId }: Props) {
  const filasRef = useRef<(HTMLDivElement | null)[]>([])

  // La marcada siempre visible al moverse con las flechas
  useEffect(() => {
    if (indice >= 0) filasRef.current[indice]?.scrollIntoView?.({ block: 'nearest' })
  }, [indice])

  return (
    <div
      role="listbox"
      data-testid={testId}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        width: '400px',
        maxHeight: '250px',
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 100,
      }}
    >
      {clientes.map((c, i) => {
        const marcada = i === indice
        return (
          <div
            key={c.codigoCliente}
            ref={(el) => { filasRef.current[i] = el }}
            role="option"
            aria-selected={marcada}
            // El clic no quita el foco del campo: se puede seguir con el teclado
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onElegir(c)}
            onMouseEnter={() => onMarcar(i)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
              fontSize: '13px',
              background: marcada ? 'var(--sapList_SelectionBackgroundColor, #e5f0fa)' : '#fff',
              boxShadow: marcada ? 'inset 3px 0 0 var(--sapList_SelectionBorderColor, #0064d9)' : undefined,
            }}
          >
            <div style={{ fontWeight: 600 }}>{c.codigoCliente} — {c.nombre}</div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>{c.rut || 'Sin RUT'} · {c.condicionPago} · {c.sucursal}</div>
          </div>
        )
      })}
    </div>
  )
}
