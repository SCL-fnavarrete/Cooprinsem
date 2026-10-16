import { useEffect, useRef, useState } from 'react'
import { Button } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/download.js'
import { exportarTabla, type ColumnaExport, type FormatoExport } from '@/utils/exportarTabla'

// Botón "Exportar tabla" reutilizable: exporta TODAS las filas que recibe (las
// filtradas, de todas las páginas, no solo la visible) a texto plano, CSV o
// Excel. Cada pantalla pasa sus columnas con los mismos títulos que muestra.

interface ExportarTablaProps<T> {
  filas: T[]
  columnas: ColumnaExport<T>[]
  /** Base del nombre del archivo, ej. "Caja listado documentos" */
  nombreArchivo: string
  /** Nombre de la hoja Excel (máx. 31 caracteres); por defecto nombreArchivo */
  nombreHoja?: string
  'data-testid'?: string
}

const OPCIONES: { formato: FormatoExport; texto: string }[] = [
  { formato: 'txt', texto: 'Texto plano (.txt)' },
  { formato: 'csv', texto: 'CSV (.csv)' },
  { formato: 'xlsx', texto: 'Excel (.xlsx)' },
]

export function ExportarTabla<T>({ filas, columnas, nombreArchivo, nombreHoja, 'data-testid': testId = 'exportar-tabla' }: ExportarTablaProps<T>) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false)
    }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  const exportar = (formato: FormatoExport) => {
    setAbierto(false)
    exportarTabla(formato, filas, columnas, nombreArchivo, nombreHoja)
  }

  return (
    <div ref={contenedor} style={{ position: 'relative', display: 'inline-block' }} data-testid={testId}>
      <Button
        icon="download"
        onClick={() => setAbierto((a) => !a)}
        disabled={filas.length === 0}
        tooltip={filas.length === 0 ? 'No hay filas para exportar' : `Exportar ${filas.length} fila(s)`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        data-testid={`${testId}-boton`}
      >
        Exportar tabla
      </Button>
      {abierto && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 10,
            marginTop: '0.25rem',
            minWidth: '11rem',
            display: 'grid',
            padding: '0.25rem',
            background: 'var(--sapGroup_ContentBackground, #fff)',
            border: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)',
            borderRadius: '0.5rem',
            boxShadow: 'var(--sapContent_Shadow1, 0 2px 8px rgba(0,0,0,0.15))',
          }}
        >
          {OPCIONES.map((o) => (
            <Button
              key={o.formato}
              role="menuitem"
              design="Transparent"
              onClick={() => exportar(o.formato)}
              style={{ justifyContent: 'flex-start' }}
              data-testid={`${testId}-${o.formato}`}
            >
              {o.texto}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
