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
  MessageStrip,
} from '@ui5/webcomponents-react'
import { formatCLP } from '@/utils/format'
import type { IStockMaterialSap } from '@/services/api/sapStock'

interface PedidoTotalsProps {
  subtotal: number
  totalIVA: number
  total: number
  // Descuento % y Recargo Flete de cabecera (montos de SAP, van solo en los totales)
  descuentoCabecera?: number
  descuentoPorcentaje?: number
  recargoFlete?: number
  observaciones: string
  onObservacionesChange: (obs: string) => void
  ubicacionPredio: string
  onUbicacionPredioChange: (val: string) => void
  onGrabar: () => void
  onLimpiar: () => void
  onCotizar: () => void
  isGrabando: boolean
  canGrabar: boolean
  isCotizando: boolean
  canCotizar: boolean
  stockMaterial?: IStockMaterialSap
  articuloSeleccionado?: string
  isConsultandoPrecios?: boolean
  errorPrecios?: string | null
}

// Cantidad de stock (no es moneda): miles con punto, hasta 3 decimales.
function formatearCantidad(cantidad: number): string {
  return cantidad.toLocaleString('es-CL', { maximumFractionDigits: 3 })
}

export function PedidoTotals({
  subtotal,
  totalIVA,
  total,
  descuentoCabecera = 0,
  descuentoPorcentaje = 0,
  recargoFlete = 0,
  observaciones,
  onObservacionesChange,
  ubicacionPredio,
  onUbicacionPredioChange,
  onGrabar,
  onLimpiar,
  onCotizar,
  isGrabando,
  canGrabar,
  isCotizando,
  canCotizar,
  stockMaterial,
  isConsultandoPrecios = false,
  errorPrecios = null,
}: PedidoTotalsProps) {
  const [showConfirmLimpiar, setShowConfirmLimpiar] = useState(false)

  return (
    <div data-testid="pedido-totals" style={{ display: 'grid', gap: '1rem' }}>
      {/* Stock del último artículo agregado (SAP ZUI_STOCK_SRV): almacenes de
          la sucursal según SAP (no una lista fija) + otras sucursales. */}
      {stockMaterial && (
        <div data-testid="stock-material" style={{ display: 'grid', gap: '0.5rem' }}>
          <Label>
            Stock {stockMaterial.material} — {stockMaterial.nombreCentro || stockMaterial.plant} ({stockMaterial.plant}):{' '}
            {formatearCantidad(stockMaterial.totalCentro)} {stockMaterial.unidad}
          </Label>
          {stockMaterial.almacenes.length === 0 ? (
            <Label>Sin stock registrado en {stockMaterial.plant}.</Label>
          ) : (
            <Table
              headerRow={
                <TableHeaderRow>
                  {stockMaterial.almacenes.map((a) => (
                    <TableHeaderCell key={a.almacen}>{a.almacen}</TableHeaderCell>
                  ))}
                </TableHeaderRow>
              }
            >
              <TableRow>
                {stockMaterial.almacenes.map((a) => (
                  <TableCell key={a.almacen}>{formatearCantidad(a.libre)}</TableCell>
                ))}
              </TableRow>
            </Table>
          )}
          {stockMaterial.otrosCentros.length > 0 && (
            <div>
              <Label>Otras sucursales:</Label>
              <FlexBox wrap="Wrap" style={{ gap: '0.25rem 1rem', marginTop: '0.25rem' }}>
                {stockMaterial.otrosCentros.map((c) => (
                  <span key={c.centro} style={{ fontSize: '0.875rem' }}>
                    {c.nombre || c.centro} ({c.centro}): <strong>{formatearCantidad(c.libre)}</strong>
                  </span>
                ))}
              </FlexBox>
            </div>
          )}
        </div>
      )}

      {/* Totales */}
      <FlexBox
        direction="Column"
        style={{ alignItems: 'flex-end', gap: '0.25rem' }}
      >
        {isConsultandoPrecios && (
          <Label style={{ fontStyle: 'italic' }}>Actualizando precios desde SAP…</Label>
        )}
        {errorPrecios && !isConsultandoPrecios && (
          <MessageStrip design="Critical" hideCloseButton>
            {errorPrecios} — pase el cursor sobre "Sin precio" para ver el motivo.
          </MessageStrip>
        )}
        <Label>Subtotal: {formatCLP(subtotal)}</Label>
        {descuentoCabecera !== 0 && (
          <Label data-testid="total-descuento-cabecera">
            Descuento{descuentoPorcentaje ? ` (${descuentoPorcentaje}%)` : ''}: {formatCLP(descuentoCabecera)}
          </Label>
        )}
        {recargoFlete !== 0 && (
          <Label data-testid="total-recargo-flete">Recargo Flete: {formatCLP(recargoFlete)}</Label>
        )}
        <Label>IVA 19%: {formatCLP(totalIVA)}</Label>
        <Label style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          Total: {formatCLP(total)}
        </Label>
      </FlexBox>

      {/* Obs. Nota de Venta — texto SAP Z001 (Z002 es la de factura, no se envía aún) */}
      <div>
        <Label>Obs. Nota de Venta</Label>
        <Input
          value={observaciones}
          onInput={(e: { target: { value: string } }) =>
            onObservacionesChange(e.target.value)
          }
          placeholder="Observaciones de la nota de venta (opcional)"
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
          onClick={onCotizar}
          disabled={!canCotizar || isCotizando}
          icon={isCotizando ? 'synchronize' : undefined}
        >
          {isCotizando ? 'Cotizando...' : 'Cotizar'}
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
