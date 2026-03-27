import { useState } from 'react'
import {
  Title,
  FlexBox,
  Button,
  Input,
  RadioButton,
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
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/print.js'
import '@ui5/webcomponents-icons/dist/nav-back.js'
import { getPedidoById } from '@/services/api/pedidos'
import { getPartidaPorBelnr } from '@/services/api/facturas'
import { formatCLP } from '@/utils/format'
import type { IPedidoDetalle } from '@/types/pedido'
import type { IPartidaAbierta } from '@/types/caja'

type TipoDocumento = 'pedido-cotizacion' | 'factura-nota-credito'

function estadoColor(estado: string): 'Set8' | 'Set6' | 'Set1' {
  switch (estado) {
    case 'Procesado': return 'Set8'
    case 'Anulado': return 'Set1'
    default: return 'Set6'
  }
}

export function BusquedaDocPanel() {
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>('pedido-cotizacion')
  const [docComercial, setDocComercial] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resultados
  const [pedido, setPedido] = useState<IPedidoDetalle | null>(null)
  const [partida, setPartida] = useState<IPartidaAbierta | null>(null)
  const [mostrarResultado, setMostrarResultado] = useState(false)

  const handleBuscar = async () => {
    if (!docComercial.trim()) return

    setIsLoading(true)
    setError(null)
    setPedido(null)
    setPartida(null)

    try {
      if (tipoDoc === 'pedido-cotizacion') {
        const result = await getPedidoById(docComercial.trim())
        if (!result) {
          setError(`Pedido/Cotización ${docComercial} no encontrado`)
        } else {
          setPedido(result)
        }
      } else {
        const result = await getPartidaPorBelnr(docComercial.trim())
        if (!result) {
          setError(`Factura/Nota Crédito ${docComercial} no encontrada`)
        } else {
          setPartida(result)
        }
      }
      setMostrarResultado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error buscando documento')
      setMostrarResultado(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVolver = () => {
    setMostrarResultado(false)
    setPedido(null)
    setPartida(null)
    setError(null)
  }

  // Vista resultado: detalle de pedido
  if (mostrarResultado && pedido) {
    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <FlexBox alignItems="Center" style={{ gap: '0.75rem' }}>
          <Button icon="nav-back" design="Transparent" onClick={handleVolver} aria-label="Volver" />
          <Title level="H3">Detalle Pedido {pedido.vbeln}</Title>
        </FlexBox>

        <Card header={<CardHeader titleText="Datos del Pedido" />}>
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            <div><Label>Nº Pedido</Label><div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{pedido.vbeln}</div></div>
            <div><Label>Fecha</Label><div>{pedido.fecha}</div></div>
            <div><Label>Estado</Label><div><Tag colorScheme={estadoColor(pedido.estado)}>{pedido.estado}</Tag></div></div>
            <div><Label>Cliente</Label><div>{pedido.rut ? `${pedido.rut} — ` : ''}{pedido.nombreCliente}</div></div>
            <div><Label>Canal</Label><div>{pedido.canal}</div></div>
            <div><Label>Tipo Documento</Label><div>{pedido.tipoDoc}</div></div>
            <div><Label>Condición de Pago</Label><div>{pedido.condicionPago}</div></div>
            <div><Label>Vendedor</Label><div>{pedido.vendedor}</div></div>
          </div>
        </Card>

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

        <FlexBox justifyContent="End">
          <div style={{ minWidth: '250px', display: 'grid', gap: '0.5rem', textAlign: 'right' }}>
            <FlexBox justifyContent="SpaceBetween">
              <Label>Subtotal</Label><span>{formatCLP(pedido.subtotal)}</span>
            </FlexBox>
            <FlexBox justifyContent="SpaceBetween">
              <Label>IVA 19%</Label><span>{formatCLP(pedido.totalIVA)}</span>
            </FlexBox>
            <hr style={{ margin: '0.25rem 0', border: 'none', borderTop: '1px solid #ccc' }} />
            <FlexBox justifyContent="SpaceBetween">
              <Label style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Total</Label>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCLP(pedido.total)}</span>
            </FlexBox>
          </div>
        </FlexBox>
      </div>
    )
  }

  // Vista resultado: detalle de factura/nota crédito
  if (mostrarResultado && partida) {
    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <FlexBox alignItems="Center" style={{ gap: '0.75rem' }}>
          <Button icon="nav-back" design="Transparent" onClick={handleVolver} aria-label="Volver" />
          <Title level="H3">Detalle Documento {partida.belnr}</Title>
        </FlexBox>

        <Card header={<CardHeader titleText="Datos del Documento" />}>
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            <div><Label>Nº Documento</Label><div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{partida.belnr}</div></div>
            <div><Label>Clase</Label><div>{partida.claseDoc}</div></div>
            <div><Label>Fecha Documento</Label><div>{partida.fechaDoc}</div></div>
            <div><Label>Fecha Vencimiento</Label><div>{partida.fechaVenc}</div></div>
            <div><Label>Cliente</Label><div>{partida.kunnr}{partida.nombreCliente ? ` — ${partida.nombreCliente}` : ''}</div></div>
            <div><Label>Valor</Label><div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCLP(partida.importe)}</div></div>
            <div><Label>Estado</Label><div>{partida.estado}</div></div>
            <div><Label>Días Mora</Label><div>{partida.diasMora}</div></div>
            {partida.vbeln && <div><Label>Nº Pedido Origen</Label><div>{partida.vbeln}</div></div>}
          </div>
        </Card>
      </div>
    )
  }

  // Vista resultado: error
  if (mostrarResultado && error) {
    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <FlexBox alignItems="Center" style={{ gap: '0.75rem' }}>
          <Button icon="nav-back" design="Transparent" onClick={handleVolver} aria-label="Volver" />
          <Title level="H3">Búsqueda de documentos</Title>
        </FlexBox>
        <MessageStrip design="Negative">{error}</MessageStrip>
      </div>
    )
  }

  // Vista principal: formulario de búsqueda
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Title level="H3">Búsqueda de documentos</Title>

      <Card>
        <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem', maxWidth: '500px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <RadioButton
              name="tipoDoc"
              text="Pedido / Cotización"
              checked={tipoDoc === 'pedido-cotizacion'}
              onChange={() => setTipoDoc('pedido-cotizacion')}
            />
            <RadioButton
              name="tipoDoc"
              text="Factura / Nota Crédito"
              checked={tipoDoc === 'factura-nota-credito'}
              onChange={() => setTipoDoc('factura-nota-credito')}
            />
          </div>

          <FlexBox alignItems="End" style={{ gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <Label>Doc. comercial:</Label>
              <Input
                value={docComercial}
                onInput={(e) => setDocComercial((e.target as unknown as { value: string }).value)}
                placeholder={tipoDoc === 'pedido-cotizacion' ? 'Nº Pedido (VBELN)' : 'Nº Documento (BELNR)'}
                style={{ width: '100%' }}
              />
            </div>
            <Button
              icon="search"
              design="Emphasized"
              onClick={handleBuscar}
              disabled={!docComercial.trim() || isLoading}
            >
              Buscar
            </Button>
            <Button
              icon="print"
              design="Default"
              disabled
              tooltip="Próximamente"
            >
              Imprimir
            </Button>
          </FlexBox>
        </div>
      </Card>

      <BusyIndicator active={isLoading} size="L">
        <div />
      </BusyIndicator>
    </div>
  )
}
