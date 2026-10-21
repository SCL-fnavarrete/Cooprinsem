import type { ReactNode } from 'react'
import { Button, FlexBox, Label } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/navigation-up-arrow.js'

export interface IDatoResumen {
  etiqueta: string
  valor: ReactNode
}

interface ResumenFlotanteProps {
  visible: boolean
  titulo: string
  datos: IDatoResumen[]
  // Botones propios de la pantalla (ej. "Pagos (2)").
  acciones?: ReactNode
  // "Modificar búsqueda": normalmente vuelve al formulario con scrollIntoView.
  onVolverArriba?: () => void
  textoVolver?: string
  // Distancia al borde superior del área con scroll. Si ese contenedor tiene
  // padding, usar el negativo del padding para que la barra quede pegada al borde
  // (ej. CajaPage: <main> con padding 1rem → '-1rem').
  top?: string
  'data-testid'?: string
}

const estiloBarra = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.25rem 0.5rem',
  padding: '0.375rem 1rem',
  background: 'var(--sapGroup_ContentBackgroundColor, #fff)',
  border: '1px solid var(--sapGroup_ContentBorderColor, #d9d9d9)',
  borderRadius: '0 0 0.75rem 0.75rem',
  boxShadow: 'var(--sapContent_Shadow2, 0 4px 12px rgba(0, 0, 0, 0.15))',
  fontSize: '0.875rem',
} as const

/**
 * Resumen flotante de un formulario de búsqueda: cuando el formulario sale de
 * la vista (useFueraDeVista), muestra arriba los datos con que se buscó y las
 * acciones principales, para seguir viéndolos mientras se recorre la tabla.
 * Reutilizable en cualquier pantalla formulario + tabla.
 *
 * Uso:
 *   const refForm = useRef<HTMLDivElement>(null)
 *   const fuera = useFueraDeVista(refForm)
 *   <ResumenFlotante visible={fuera} titulo="…" datos={[…]} onVolverArriba={() => refForm.current?.scrollIntoView({ behavior: 'smooth' })} />
 *   <div ref={refForm}>…formulario…</div>
 */
export function ResumenFlotante({
  visible, titulo, datos, acciones, onVolverArriba, textoVolver = 'Modificar búsqueda', top = '0', 'data-testid': testId = 'resumen-flotante',
}: ResumenFlotanteProps) {
  if (!visible) return null
  return (
    // Ancla de alto 0 pegada arriba del área con scroll: la barra se dibuja
    // encima del contenido sin empujarlo (si ocupara espacio, al aparecer movería
    // la página y el formulario podría volver a verse y ocultarla otra vez).
    <div style={{ position: 'sticky', top, height: 0, zIndex: 10 }}>
      <div role="region" aria-label={`Resumen: ${titulo}`} style={estiloBarra} data-testid={testId}>
        {/* Datos a la izquierda y acciones a la derecha; en pantallas angostas las acciones bajan */}
        <div style={{ flex: '1 1 28rem', minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.25rem 1rem' }}>
          <Label style={{ fontWeight: 'bold' }}>{titulo}</Label>
          {datos.map((d) => (
            <span key={d.etiqueta} style={{ whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--sapContent_LabelColor, #556b82)' }}>{d.etiqueta}: </span>
              <strong>{d.valor}</strong>
            </span>
          ))}
        </div>
        <FlexBox style={{ gap: '0.25rem', flexShrink: 0, marginLeft: 'auto' }} alignItems="Center">
          {acciones}
          {onVolverArriba && (
            <Button design="Transparent" icon="navigation-up-arrow" onClick={onVolverArriba} data-testid={`${testId}-volver`}>
              {textoVolver}
            </Button>
          )}
        </FlexBox>
      </div>
    </div>
  )
}
