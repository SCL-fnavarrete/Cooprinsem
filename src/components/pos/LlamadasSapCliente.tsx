import { Tag, Label } from '@ui5/webcomponents-react'
import type { ILlamadaSapCliente } from '@/services/api/sapClientes'
import { useModoTecnico } from '@/hooks/useModoTecnico'

// Llamadas a SAP hechas al crear un cliente (Pedidos > Clientes > Crear): por
// cada una, URL, JSON enviado y respuesta (o error) de SAP. Mismo estilo que
// el JSON del pedido y del pago (PedidoPage / PagoSapDialog).

const estiloJson = {
  maxHeight: '30vh',
  overflow: 'auto',
  fontSize: '0.7rem',
  background: 'var(--sapList_Background)',
  padding: '0.5rem',
  borderRadius: '4px',
  margin: '0.25rem 0 0',
} as const

function BloqueJson({ titulo, valor, abierto = false, testId }: { titulo: string; valor: unknown; abierto?: boolean; testId?: string }) {
  if (valor === undefined || valor === null) return null
  return (
    <details open={abierto} data-testid={testId}>
      <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>{titulo}</summary>
      <pre style={estiloJson}>{JSON.stringify(valor, null, 2)}</pre>
    </details>
  )
}

export function LlamadasSapCliente(props: { llamadas: ILlamadaSapCliente[] }) {
  // JSON de las llamadas a SAP: solo para usuarios en modo técnico
  return useModoTecnico() ? <DetalleLlamadasSap {...props} /> : null
}

function DetalleLlamadasSap({ llamadas }: { llamadas: ILlamadaSapCliente[] }) {
  if (llamadas.length === 0) return null
  return (
    <div
      data-testid="llamadas-sap-cliente"
      style={{ display: 'grid', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--sapList_BorderColor)', borderRadius: '0.5rem' }}
    >
      <Label style={{ fontWeight: 'bold' }}>Llamadas a SAP ({llamadas.length})</Label>
      {llamadas.map((ll, i) => (
        <div key={i} style={{ display: 'grid', gap: '0.25rem' }} data-testid={`llamada-sap-${i}`}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.85rem' }}>{i + 1}. {ll.paso}</strong>
            <Tag colorScheme={ll.ok ? '8' : '1'}>{ll.ok ? 'OK' : 'Error'}{ll.status ? ` (${ll.status})` : ''}</Tag>
          </div>
          <span style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{ll.metodo} {ll.url}</span>
          <BloqueJson titulo="JSON enviado" valor={ll.body} testId={`json-enviado-${i}`} />
          <BloqueJson
            titulo={ll.ok ? 'JSON de respuesta de SAP' : 'Error de SAP'}
            valor={ll.ok ? ll.respuesta : ll.error}
            abierto={!ll.ok}
            testId={`json-respuesta-${i}`}
          />
        </div>
      ))}
    </div>
  )
}
