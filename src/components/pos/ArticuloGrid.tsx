import '@ui5/webcomponents-icons/dist/delete.js'
import '@ui5/webcomponents-icons/dist/bar-code.js'
import { useRef, useEffect } from 'react'
import {
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Input,
  Button,
  MessageStrip,
} from '@ui5/webcomponents-react'
import type { InputDomRef } from '@ui5/webcomponents-react'
import type { ILineaPedido } from '@/types/pedido'
import { formatCLP } from '@/utils/format'
import { porcentajeDesdeTexto, montoDesdeTexto } from '@/utils/numeros'

// Precio/subtotal de la línea según el estado de la consulta automática a SAP.
function MontoLinea({ linea, monto }: { linea: ILineaPedido; monto: number }) {
  if (linea.estadoPrecio === 'consultando') {
    return <span style={{ fontStyle: 'italic', color: 'var(--sapContent_LabelColor)' }}>Consultando…</span>
  }
  if (linea.estadoPrecio === 'error') {
    return (
      <span title={linea.errorPrecio} style={{ color: 'var(--sapNegativeTextColor)' }}>
        Sin precio
      </span>
    )
  }
  return <>{formatCLP(monto)}</>
}

interface ArticuloGridProps {
  lineas: ILineaPedido[]
  onCantidadChange: (posicion: string, cantidad: number) => void
  onLineaChange: (posicion: string, campo: Partial<ILineaPedido>) => void
  onEliminarLinea: (posicion: string) => void
  stockInfo?: Record<string, number>
  // Abre la ventana de series de la línea (PE-23). Sin esta prop no se muestra
  // la columna Series (ej. cotizaciones: las series aplican solo a pedidos).
  onSeries?: (posicion: string) => void
}

export function ArticuloGrid({
  lineas,
  onCantidadChange,
  onLineaChange,
  onEliminarLinea,
  stockInfo,
  onSeries,
}: ArticuloGridProps) {
  const cantidadRefs = useRef(new Map<string, InputDomRef>())
  const prevLengthRef = useRef(lineas.length)

  // Al agregar un artículo nuevo (la lista crece), enfocar su input de Cantidad
  useEffect(() => {
    if (lineas.length > prevLengthRef.current) {
      const ultima = lineas[lineas.length - 1]
      setTimeout(() => cantidadRefs.current.get(ultima.posicion)?.focus(), 100)
    }
    prevLengthRef.current = lineas.length
  }, [lineas])

  if (lineas.length === 0) {
    return (
      <MessageStrip design="Information" hideCloseButton>
        Busque y agregue artículos al pedido
      </MessageStrip>
    )
  }

  return (
    <Table
      headerRow={
        <TableHeaderRow>
          <TableHeaderCell>Pos</TableHeaderCell>
          <TableHeaderCell>Material</TableHeaderCell>
          <TableHeaderCell>Descripción</TableHeaderCell>
          <TableHeaderCell>Cantidad</TableHeaderCell>
          <TableHeaderCell>UM</TableHeaderCell>
          <TableHeaderCell>Centro Sum.</TableHeaderCell>
          <TableHeaderCell>Almacén</TableHeaderCell>
          <TableHeaderCell>Precio</TableHeaderCell>
          <TableHeaderCell>Desc. %</TableHeaderCell>
          <TableHeaderCell>Recargo</TableHeaderCell>
          <TableHeaderCell>Fe. Entrega</TableHeaderCell>
          <TableHeaderCell>Subtotal</TableHeaderCell>
          {onSeries && <TableHeaderCell>Series</TableHeaderCell>}
          <TableHeaderCell>Acciones</TableHeaderCell>
        </TableHeaderRow>
      }
    >
      {lineas.map((linea) => {
        const stock = stockInfo?.[linea.codigoMaterial]
        const exceedsStock = stock !== undefined && linea.cantidad > stock
        return (
          <TableRow
            key={linea.posicion}
            style={exceedsStock ? { backgroundColor: '#fff3cd' } : undefined}
          >
            <TableCell>{linea.posicion}</TableCell>
            <TableCell>{linea.codigoMaterial}</TableCell>
            <TableCell>{linea.descripcion}</TableCell>
            <TableCell>
              <Input
                ref={(el) => {
                  if (el) cantidadRefs.current.set(linea.posicion, el)
                  else cantidadRefs.current.delete(linea.posicion)
                }}
                type="Number"
                value={String(linea.cantidad)}
                onInput={(e: { target: { value: string } }) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val > 0) {
                    onCantidadChange(linea.posicion, val)
                  }
                }}
                style={{ width: '5rem' }}
                aria-label={`Cantidad ${linea.descripcion}`}
              />
            </TableCell>
            <TableCell>{linea.unidadMedida}</TableCell>
            <TableCell>
              <Input
                value={linea.centroSuministrador}
                onInput={(e: { target: { value: string } }) => onLineaChange(linea.posicion, { centroSuministrador: e.target.value })}
                style={{ width: '5rem' }}
                placeholder="D190"
                aria-label="Centro suministrador"
              />
            </TableCell>
            <TableCell>
              <Input
                value={linea.almacen}
                onInput={(e: { target: { value: string } }) => onLineaChange(linea.posicion, { almacen: e.target.value })}
                style={{ width: '5rem' }}
                placeholder="B000"
                aria-label="Almacén"
              />
            </TableCell>
            <TableCell><MontoLinea linea={linea} monto={linea.precioUnitario} /></TableCell>
            <TableCell>
              {/* ZD02 de posición: solo números enteros 0-100; el precio lo recalcula SAP */}
              <Input
                value={linea.descuentoLinea ? String(linea.descuentoLinea) : ''}
                onInput={(e: { target: { value: string } }) => {
                  const valor = porcentajeDesdeTexto(e.target.value)
                  e.target.value = valor ? String(valor) : ''
                  onLineaChange(linea.posicion, { descuentoLinea: valor })
                }}
                style={{ width: '4rem' }}
                placeholder="0"
                aria-label="Descuento línea"
              />
            </TableCell>
            <TableCell>
              {/* ZFX3 (Flete Pes./Vol.): monto CLP entero; el precio lo recalcula SAP */}
              <Input
                value={linea.recargo ? String(linea.recargo) : ''}
                onInput={(e: { target: { value: string } }) => {
                  const valor = montoDesdeTexto(e.target.value)
                  e.target.value = valor ? String(valor) : ''
                  onLineaChange(linea.posicion, { recargo: valor })
                }}
                style={{ width: '5rem' }}
                placeholder="0"
                aria-label="Recargo"
              />
            </TableCell>
            <TableCell>
              <Input
                type="Text"
                value={linea.fechaEntrega}
                onInput={(e: { target: { value: string } }) => onLineaChange(linea.posicion, { fechaEntrega: e.target.value })}
                style={{ width: '7rem' }}
                placeholder="DD-MM-YYYY"
                aria-label="Fecha entrega"
              />
            </TableCell>
            <TableCell><MontoLinea linea={linea} monto={linea.subtotal} /></TableCell>
            {onSeries && (
              <TableCell>
                <Button
                  icon="bar-code"
                  design={linea.series?.length ? 'Positive' : 'Default'}
                  tooltip="Asignar números de serie"
                  onClick={() => onSeries(linea.posicion)}
                  aria-label={`Series ${linea.descripcion}`}
                >
                  {linea.series?.length ? `${linea.series.length}/${linea.cantidad}` : 'Serie'}
                </Button>
              </TableCell>
            )}
            <TableCell>
              <Button
                icon="delete"
                design="Negative"
                tooltip="Eliminar"
                onClick={() => onEliminarLinea(linea.posicion)}
                aria-label={`Eliminar ${linea.descripcion}`}
              />
            </TableCell>
          </TableRow>
        )
      })}
    </Table>
  )
}