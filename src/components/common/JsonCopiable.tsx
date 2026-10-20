import { useState } from 'react'
import { Button, FlexBox, Label } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/copy.js'
import { useModoTecnico } from '@/hooks/useModoTecnico'

// Bloque JSON con botón "Copiar" (ej. JSON enviado a SAP y respuesta de SAP en
// los modales de resultado), para compartirlo con Arquitectura tal cual.
// Solo se muestra en modo técnico: los usuarios de negocio no ven JSON.

interface JsonCopiableProps {
  titulo: string
  valor: unknown
  'data-testid'?: string
}

export function JsonCopiable(props: JsonCopiableProps) {
  return useModoTecnico() ? <BloqueJsonCopiable {...props} /> : null
}

function BloqueJsonCopiable({ titulo, valor, 'data-testid': testId = 'json-copiable' }: JsonCopiableProps) {
  const [copiado, setCopiado] = useState<'ok' | 'error' | null>(null)
  const texto = valor === undefined ? '(sin datos)' : JSON.stringify(valor, null, 2)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado('ok')
    } catch {
      // Sin permiso de portapapeles: se puede seleccionar el texto a mano
      setCopiado('error')
    }
  }

  return (
    <div data-testid={testId} style={{ marginBottom: '0.75rem' }}>
      <FlexBox justifyContent="SpaceBetween" alignItems="Center" style={{ marginBottom: '0.25rem' }}>
        <Label><b>{titulo}</b></Label>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          {copiado && (
            <span style={{ fontSize: '0.75rem' }} data-testid={`${testId}-estado`}>
              {copiado === 'ok' ? 'Copiado' : 'No se pudo copiar: seleccione el texto'}
            </span>
          )}
          <Button design="Transparent" icon="copy" onClick={copiar} data-testid={`${testId}-copiar`}>Copiar</Button>
        </FlexBox>
      </FlexBox>
      <pre
        style={{
          margin: 0,
          maxHeight: '35vh',
          overflow: 'auto',
          fontSize: '0.75rem',
          background: 'var(--sapList_Background)',
          padding: '0.75rem',
          borderRadius: '4px',
          userSelect: 'text',
        }}
      >
        {texto}
      </pre>
    </div>
  )
}
