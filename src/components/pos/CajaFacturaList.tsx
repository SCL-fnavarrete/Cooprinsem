import {
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  MessageStrip,
  Label,
  FlexBox,
  Icon,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/status-positive.js'
import '@ui5/webcomponents-icons/dist/status-critical.js'
import '@ui5/webcomponents-icons/dist/status-negative.js'
import type { IPartidaAbierta, Semaforo } from '@/types/caja'
import { formatCLP, formatFecha } from '@/utils/format'

interface CajaFacturaListProps {
  partidas: IPartidaAbierta[]
  partidasSeleccionadas: string[]
  onTogglePartida: (belnr: string) => void
  isLoading?: boolean
  /** Mapa opcional kunnr → nombre para mostrar columna Cliente */
  clienteNombres?: Record<string, string>
  /** Si true, muestra la columna Cliente (cuando hay partidas de múltiples clientes) */
  mostrarColumnaCliente?: boolean
  /** Callback para doble clic en una fila → navega a pantalla de detalle de pago */
  onDoubleClickPartida?: (partida: IPartidaAbierta) => void
  /** Callback para clic simple en una fila → navega a pantalla de detalle de pago */
  onClickPartida?: (partida: IPartidaAbierta) => void
}

const SEMAFORO_CONFIG = {
  verde:    { icon: 'status-positive', color: 'var(--sapPositiveColor, #2b7c2b)', text: 'Vigente' },
  amarillo: { icon: 'status-critical', color: 'var(--sapCriticalColor, #e9730c)', text: 'Por vencer' },
  rojo:     { icon: 'status-negative', color: 'var(--sapNegativeColor, #bb0000)', text: 'Vencida' },
  pagada:   { icon: 'status-positive', color: 'var(--sapNeutralColor, #6a6d70)', text: 'Pagada' },
} as const

function SemaforoLabel({ semaforo }: { semaforo: Semaforo }) {
  const { icon, color, text } = SEMAFORO_CONFIG[semaforo]
  return (
    <FlexBox style={{ gap: '0.25rem', alignItems: 'center' }}>
      <Icon name={icon} style={{ color }} aria-label={text} />
      <span style={{ color, fontSize: '0.85rem' }}>{text}</span>
    </FlexBox>
  )
}

export function CajaFacturaList({
  partidas,
  partidasSeleccionadas,
  onTogglePartida,
  isLoading = false,
  clienteNombres = {},
  mostrarColumnaCliente = false,
  onDoubleClickPartida,
  onClickPartida,
}: CajaFacturaListProps) {
  const totalSeleccionado = partidas
    .filter((p) => partidasSeleccionadas.includes(p.belnr))
    .reduce((acc, p) => acc + p.importe, 0)

  const totalGeneral = partidas.reduce((acc, p) => acc + p.importe, 0)

  if (isLoading) {
    return <MessageStrip design="Information">Cargando partidas abiertas...</MessageStrip>
  }

  if (partidas.length === 0) {
    return (
      <MessageStrip design="Information" data-testid="partidas-vacio">
        No hay documentos pendientes
      </MessageStrip>
    )
  }

  return (
    <div data-testid="caja-factura-list">
      <Table
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell>Estado</TableHeaderCell>
            {mostrarColumnaCliente && <TableHeaderCell>Cliente</TableHeaderCell>}
            <TableHeaderCell>Nº Documento</TableHeaderCell>
            <TableHeaderCell>Clase</TableHeaderCell>
            <TableHeaderCell>Fecha</TableHeaderCell>
            <TableHeaderCell>Vencimiento</TableHeaderCell>
            <TableHeaderCell>Días Mora</TableHeaderCell>
            <TableHeaderCell>Valor</TableHeaderCell>
          </TableHeaderRow>
        }
      >
        {partidas.map((p) => {
          const isSelected = partidasSeleccionadas.includes(p.belnr)
          const isVencidaGrave = p.diasMora > 30
          const clienteLabel = clienteNombres[p.kunnr]
            ? `${p.kunnr} — ${clienteNombres[p.kunnr]}`
            : p.kunnr
          return (
            <TableRow
              key={p.belnr}
              onClick={() => onClickPartida ? onClickPartida(p) : onTogglePartida(p.belnr)}
              onDoubleClick={() => onDoubleClickPartida?.(p)}
              style={{
                cursor: 'pointer',
                backgroundColor: isSelected
                  ? 'rgba(13, 106, 208, 0.08)'
                  : isVencidaGrave
                    ? 'var(--sapErrorBackground, #fff2f2)'
                    : undefined,
                borderLeft: isSelected
                  ? '3px solid var(--sapSelectedColor, #0d6ad0)'
                  : '3px solid transparent',
              }}
              data-testid={`partida-row-${p.belnr}`}
            >
              <TableCell><SemaforoLabel semaforo={p.semaforo} /></TableCell>
              {mostrarColumnaCliente && <TableCell>{clienteLabel}</TableCell>}
              <TableCell>{p.belnr}</TableCell>
              <TableCell>{p.claseDoc}</TableCell>
              <TableCell>{formatFecha(p.fechaDoc)}</TableCell>
              <TableCell>{formatFecha(p.fechaVenc)}</TableCell>
              <TableCell>
                <span style={{ color: p.diasMora > 0 ? 'var(--sapNegativeColor, #bb0000)' : undefined }}>
                  {p.diasMora}
                </span>
              </TableCell>
              <TableCell>{formatCLP(p.importe)}</TableCell>
            </TableRow>
          )
        })}
        {/* Fila de total general */}
        <TableRow
          style={{
            backgroundColor: 'var(--sapList_HeaderBackground, #f2f2f2)',
            borderTop: '2px solid var(--sapList_BorderColor, #e5e5e5)',
          }}
          data-testid="partida-row-total"
        >
          <TableCell />
          {mostrarColumnaCliente && <TableCell />}
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell>
            <span style={{ fontWeight: 'bold' }}>Total</span>
          </TableCell>
          <TableCell>
            <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
              {formatCLP(totalGeneral)}
            </span>
          </TableCell>
        </TableRow>
      </Table>

      {/* Leyenda de estados */}
      <FlexBox
        style={{ marginTop: '0.5rem', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}
        data-testid="leyenda-semaforo"
      >
        <FlexBox style={{ gap: '0.25rem', alignItems: 'center' }}>
          <Icon name="status-positive" style={{ color: 'var(--sapPositiveColor, #2b7c2b)' }} />
          <Label style={{ fontSize: '0.8rem' }}>Vigente</Label>
        </FlexBox>
        <FlexBox style={{ gap: '0.25rem', alignItems: 'center' }}>
          <Icon name="status-critical" style={{ color: 'var(--sapCriticalColor, #e9730c)' }} />
          <Label style={{ fontSize: '0.8rem' }}>Por vencer (≤7 días)</Label>
        </FlexBox>
        <FlexBox style={{ gap: '0.25rem', alignItems: 'center' }}>
          <Icon name="status-negative" style={{ color: 'var(--sapNegativeColor, #bb0000)' }} />
          <Label style={{ fontSize: '0.8rem' }}>Vencida</Label>
        </FlexBox>
        <FlexBox style={{ gap: '0.25rem', alignItems: 'center' }}>
          <Icon name="status-positive" style={{ color: 'var(--sapNeutralColor, #6a6d70)' }} />
          <Label style={{ fontSize: '0.8rem' }}>Pagada</Label>
        </FlexBox>
      </FlexBox>

      {partidasSeleccionadas.length > 0 && (
        <FlexBox
          justifyContent="End"
          style={{ marginTop: '0.5rem', gap: '1rem', alignItems: 'center' }}
        >
          <Label>{partidasSeleccionadas.length} documento(s) seleccionado(s)</Label>
          <Label style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
            Total: {formatCLP(totalSeleccionado)}
          </Label>
        </FlexBox>
      )}
    </div>
  )
}
