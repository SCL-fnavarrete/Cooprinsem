import '@ui5/webcomponents-icons/dist/delete.js'
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

interface ArticuloGridProps {
  lineas: ILineaPedido[]
  onCantidadChange: (posicion: string, cantidad: number) => void
  onLineaChange: (posicion: string, campo: Partial<ILineaPedido>) => void
  onEliminarLinea: (posicion: string) => void
  stockInfo?: Record<string, number>
}

export function ArticuloGrid({
  lineas,
  onCantidadChange,
  onLineaChange,
  onEliminarLinea,
  stockInfo,
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
            <TableCell>{formatCLP(linea.precioUnitario)}</TableCell>
            <TableCell>
              <Input
                type="Number"
                value={String(linea.descuentoLinea || '')}
                onInput={(e: { target: { value: string } }) => onLineaChange(linea.posicion, { descuentoLinea: Number(e.target.value) || 0 })}
                style={{ width: '4rem' }}
                placeholder="0"
                aria-label="Descuento línea"
              />
            </TableCell>
            <TableCell>
              <Input
                type="Number"
                value={String(linea.recargo || '')}
                onInput={(e: { target: { value: string } }) => onLineaChange(linea.posicion, { recargo: Number(e.target.value) || 0 })}
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
            <TableCell>{formatCLP(linea.subtotal)}</TableCell>
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