import { useState } from 'react'
import {
  Button,
  FlexBox,
  Label,
  Input,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  MessageBox,
} from '@ui5/webcomponents-react'
import { formatCLP } from '@/utils/format'
import { ALMACENES } from '@/config/sap'

interface PedidoTotalsProps {
  subtotal: number
  totalIVA: number
  total: number
  observaciones: string
  onObservacionesChange: (obs: string) => void
  ubicacionPredio: string
  onUbicacionPredioChange: (val: string) => void
  onGrabar: () => void
  onLimpiar: () => void
  isGrabando: boolean
  canGrabar: boolean
  stockPorCentro?: Record<string, number>
  articuloSeleccionado?: string
}

export function PedidoTotals({
  subtotal,
  totalIVA,
  total,
  observaciones,
  onObservacionesChange,
  ubicacionPredio,
  onUbicacionPredioChange,
  onGrabar,
  onLimpiar,
  isGrabando,
  canGrabar,
  stockPorCentro,
}: PedidoTotalsProps) {
  const [showConfirmLimpiar, setShowConfirmLimpiar] = useState(false)

  return (
    <div data-testid="pedido-totals" style={{ display: 'grid', gap: '1rem' }}>
      {/* Stock por almacén */}
      {stockPorCentro && (
        <div>
          <Label>Stock por Almacén</Label>
          <Table
            headerRow={
              <TableHeaderRow>
                {ALMACENES.map((a) => (
                  <TableHeaderCell key={a}>{a}</TableHeaderCell>
                ))}
              </TableHeaderRow>
            }
          >
            <TableRow>
              {ALMACENES.map((a) => (
                <TableCell key={a}>{stockPorCentro[a] ?? 0}</TableCell>
              ))}
            </TableRow>
          </Table>
        </div>
      )}

      {/* Totales */}
      <FlexBox
        direction="Column"
        style={{ alignItems: 'flex-end', gap: '0.25rem' }}
      >
        <Label>Subtotal: {formatCLP(subtotal)}</Label>
        <Label>IVA 19%: {formatCLP(totalIVA)}</Label>
        <Label style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          Total: {formatCLP(total)}
        </Label>
      </FlexBox>

      {/* Observaciones */}
      <div>
        <Label>Observaciones de Factura</Label>
        <Input
          value={observaciones}
          onInput={(e: { target: { value: string } }) =>
            onObservacionesChange(e.target.value)
          }
          placeholder="Observaciones (opcional)"
          style={{ width: '100%' }}
          aria-label="Observaciones"
        />
      </div>

      {/* Ubicación Predio */}
      <div>
        <Label>Ubicación Predio</Label>
        <Input
          value={ubicacionPredio}
          onInput={(e: { target: { value: string } }) =>
            onUbicacionPredioChange(e.target.value)
          }
          placeholder="Ubicación del predio (opcional)"
          style={{ width: '100%' }}
          maxlength={1000}
          aria-label="Ubicación Predio"
        />
      </div>

      {/* Botones */}
      <FlexBox style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
        <Button
          design="Transparent"
          onClick={() => setShowConfirmLimpiar(true)}
        >
          Limpiar
        </Button>
        <Button
          design="Emphasized"
          onClick={onGrabar}
          disabled={!canGrabar || isGrabando}
          icon={isGrabando ? 'synchronize' : undefined}
        >
          {isGrabando ? 'Grabando...' : 'Grabar (F9)'}
        </Button>
      </FlexBox>

      {/* Confirm dialog para limpiar */}
      {showConfirmLimpiar && (
        <MessageBox
          type="Confirm"
          open
          onClose={(action) => {
            if (action === 'OK') {
              onLimpiar()
            }
            setShowConfirmLimpiar(false)
          }}
        >
          ¿Está seguro de limpiar el pedido? Se perderán todos los datos ingresados.
        </MessageBox>
      )}
    </div>
  )
}
