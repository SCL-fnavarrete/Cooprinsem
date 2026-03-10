import '@ui5/webcomponents-icons/dist/delete.js'
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
import type { ILineaPedido } from '@/types/pedido'
import { formatCLP } from '@/utils/format'

interface ArticuloGridProps {
  lineas: ILineaPedido[]
  onCantidadChange: (posicion: string, cantidad: number) => void
  onEliminarLinea: (posicion: string) => void
  stockInfo?: Record<string, number> // codigoMaterial -> stock disponible
}

export function ArticuloGrid({
  lineas,
  onCantidadChange,
  onEliminarLinea,
  stockInfo,
}: ArticuloGridProps) {
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
          <TableHeaderCell>Precio</TableHeaderCell>
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
            <TableCell>{formatCLP(linea.precioUnitario)}</TableCell>
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
