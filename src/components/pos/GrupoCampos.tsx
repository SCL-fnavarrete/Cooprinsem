import type { ReactNode } from 'react'
import { Title } from '@ui5/webcomponents-react'

// Caja con título para agrupar campos del pedido (Datos Generales, Descuentos
// y recargos, Transporte, Otros Datos, Totales). Varias cajas en un FlexBox con
// wrap quedan una al lado de otra y bajan de línea en pantallas angostas;
// dentro de cada caja los campos van uno bajo el otro.

const estiloGrupo = {
  border: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem 0.75rem',
  margin: 0,
  flex: '1 1 300px',
  minWidth: 0,
  display: 'grid',
  gap: '0.75rem',
  alignContent: 'start',
} as const

interface GrupoCamposProps {
  titulo: string
  children: ReactNode
  'data-testid'?: string
}

export function GrupoCampos({ titulo, children, 'data-testid': testId }: GrupoCamposProps) {
  return (
    <fieldset data-testid={testId} style={estiloGrupo}>
      <legend style={{ padding: '0 0.25rem' }}><Title level="H6">{titulo}</Title></legend>
      {children}
    </fieldset>
  )
}
