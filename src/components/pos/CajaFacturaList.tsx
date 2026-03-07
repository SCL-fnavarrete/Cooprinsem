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
}

function SemaforoIcon({ semaforo }: { semaforo: Semaforo }) {
  switch (semaforo) {
    case 'verde':
      return <Icon name="status-positive" style={{ color: 'var(--sapPositiveColor, #2b7c2b)' }} aria-label="Vigente" />
    case 'amarillo':
      return <Icon name="status-critical" style={{ color: 'var(--sapCriticalColor, #e9730c)' }} aria-label="Por vencer" />
    case 'rojo':
      return <Icon name="status-negative" style={{ color: 'var(--sapNegativeColor, #bb0000)' }} aria-label="Vencida" />
  }
}

export function CajaFacturaList({
  partidas,
  partidasSeleccionadas,
  onTogglePartida,
  isLoading = false,
}: CajaFacturaListProps) {
  const totalSeleccionado = partidas
    .filter((p) => partidasSeleccionadas.includes(p.belnr))
    .reduce((acc, p) => acc + p.importe, 0)

  if (isLoading) {
    return <MessageStrip design="Information">Cargando partidas abiertas...</MessageStrip>
  }

  if (partidas.length === 0) {
    return (
      <MessageStrip design="Information" data-testid="partidas-vacio">
        El cliente no tiene documentos pendientes
      </MessageStrip>
    )
  }

  return (
    <div data-testid="caja-factura-list">
      <Table
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell>Estado</TableHeaderCell>
            <TableHeaderCell>Nº Documento</TableHeaderCell>
            <TableHeaderCell>Clase</TableHeaderCell>
            <TableHeaderCell>Fecha</TableHeaderCell>
            <TableHeaderCell>Vencimiento</TableHeaderCell>
            <TableHeaderCell>Días Mora</TableHeaderCell>
            <TableHeaderCell>Importe</TableHeaderCell>
          </TableHeaderRow>
        }
      >
        {partidas.map((p) => {
          const isSelected = partidasSeleccionadas.includes(p.belnr)
          const isVencidaGrave = p.diasMora > 30
          return (
            <TableRow
              key={p.belnr}
              selected={isSelected}
              onClick={() => onTogglePartida(p.belnr)}
              style={{
                cursor: 'pointer',
                backgroundColor: isVencidaGrave ? 'var(--sapErrorBackground, #fff2f2)' : undefined,
              }}
              data-testid={`partida-row-${p.belnr}`}
            >
              <TableCell><SemaforoIcon semaforo={p.semaforo} /></TableCell>
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
      </Table>

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
