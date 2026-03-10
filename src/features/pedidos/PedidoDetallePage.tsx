import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Title,
  FlexBox,
  Button,
  Card,
  CardHeader,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Tag,
  BusyIndicator,
  MessageStrip,
  Label,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/nav-back.js'
import { getPedidoById } from '@/services/api/pedidos'
import { formatCLP } from '@/utils/format'
import type { IPedidoDetalle } from '@/types/pedido'

function estadoColor(estado: string): 'Set8' | 'Set6' | 'Set1' {
  switch (estado) {
    case 'Procesado': return 'Set8'
    case 'Anulado': return 'Set1'
    default: return 'Set6'
  }
}

export function PedidoDetallePage() {
  const { vbeln } = useParams<{ vbeln: string }>()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState<IPedidoDetalle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vbeln) return

    setIsLoading(true)
    setError(null)
    getPedidoById(vbeln)
      .then((data) => {
        if (!data) {
          setError(`Pedido ${vbeln} no encontrado`)
        } else {
          setPedido(data)
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error consultando pedido')
      })
      .finally(() => setIsLoading(false))
  }, [vbeln])

  return (
    <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
      <FlexBox alignItems="Center" style={{ gap: '0.75rem' }}>
        <Button
          icon="nav-back"
          design="Transparent"
          onClick={() => navigate('/pedidos')}
          aria-label="Volver"
        />
        <Title level="H3">Detalle Pedido {vbeln}</Title>
      </FlexBox>

      <BusyIndicator active={isLoading} size="L">
        {error && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <MessageStrip design="Negative">{error}</MessageStrip>
            <Button design="Default" onClick={() => navigate('/pedidos')}>
              Volver al listado
            </Button>
          </div>
        )}

        {pedido && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Cabecera */}
            <Card header={<CardHeader titleText="Datos del Pedido" />}>
              <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                <div>
                  <Label>Nº Pedido</Label>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{pedido.vbeln}</div>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <div>{pedido.fecha}</div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div><Tag colorScheme={estadoColor(pedido.estado)}>{pedido.estado}</Tag></div>
                </div>
                <div>
                  <Label>Cliente</Label>
                  <div>{pedido.rut ? `${pedido.rut} — ` : ''}{pedido.nombreCliente}</div>
                </div>
                <div>
                  <Label>Canal</Label>
                  <div>{pedido.canal}</div>
                </div>
                <div>
                  <Label>Tipo Documento</Label>
                  <div>{pedido.tipoDoc}</div>
                </div>
                <div>
                  <Label>Condición de Pago</Label>
                  <div>{pedido.condicionPago}</div>
                </div>
                <div>
                  <Label>Vendedor</Label>
                  <div>{pedido.vendedor}</div>
                </div>
              </div>
            </Card>

            {/* Líneas del pedido */}
            <Card header={<CardHeader titleText="Líneas del Pedido" />}>
              <Table
                overflowMode="Scroll"
                style={{ width: '100%' }}
                headerRow={
                  <TableHeaderRow>
                    <TableHeaderCell width="60px">Pos</TableHeaderCell>
                    <TableHeaderCell width="120px">Artículo</TableHeaderCell>
                    <TableHeaderCell minWidth="200px">Descripción</TableHeaderCell>
                    <TableHeaderCell width="80px">Cant.</TableHeaderCell>
                    <TableHeaderCell width="60px">UM</TableHeaderCell>
                    <TableHeaderCell width="120px">Precio Unit.</TableHeaderCell>
                    <TableHeaderCell width="120px">Subtotal</TableHeaderCell>
                  </TableHeaderRow>
                }
              >
                {pedido.lineas.map((l) => (
                  <TableRow key={l.posicion}>
                    <TableCell>{l.posicion}</TableCell>
                    <TableCell>{l.codigoMaterial}</TableCell>
                    <TableCell>{l.descripcion}</TableCell>
                    <TableCell>{l.cantidad}</TableCell>
                    <TableCell>{l.unidadMedida}</TableCell>
                    <TableCell>{formatCLP(l.precioUnitario)}</TableCell>
                    <TableCell>{formatCLP(l.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </Table>
            </Card>

            {/* Totales */}
            <FlexBox justifyContent="End">
              <div style={{ minWidth: '250px', display: 'grid', gap: '0.5rem', textAlign: 'right' }}>
                <FlexBox justifyContent="SpaceBetween">
                  <Label>Subtotal</Label>
                  <span>{formatCLP(pedido.subtotal)}</span>
                </FlexBox>
                <FlexBox justifyContent="SpaceBetween">
                  <Label>IVA 19%</Label>
                  <span>{formatCLP(pedido.totalIVA)}</span>
                </FlexBox>
                <hr style={{ margin: '0.25rem 0', border: 'none', borderTop: '1px solid #ccc' }} />
                <FlexBox justifyContent="SpaceBetween">
                  <Label style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Total</Label>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCLP(pedido.total)}</span>
                </FlexBox>
              </div>
            </FlexBox>
          </div>
        )}
      </BusyIndicator>
    </div>
  )
}
