import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Title,
  FlexBox,
  Button,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Tag,
  Select,
  Option,
  DatePicker,
  MessageStrip,
  BusyIndicator,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/add.js'
import '@ui5/webcomponents-icons/dist/search.js'
import { getPedidos } from '@/services/api/pedidos'
import { formatCLP } from '@/utils/format'
import { useUser } from '@/stores/userContext'
import { ROLES } from '@/config/sap'
import type { IPedidoListItem, IFiltroPedidos } from '@/types/pedido'

function getDefaultDesde(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function getDefaultHasta(): string {
  return new Date().toISOString().slice(0, 10)
}

function estadoColor(estado: string): 'Set8' | 'Set6' | 'Set1' {
  switch (estado) {
    case 'Procesado': return 'Set8'  // green-ish
    case 'Anulado': return 'Set1'     // red-ish
    default: return 'Set6'            // blue-ish (Creado)
  }
}

export function PedidoListPage() {
  const navigate = useNavigate()
  const { usuario } = useUser()
  const rolCod = usuario?.rolCod ?? 0
  const canCreate = rolCod === ROLES.ADMINISTRADOR || rolCod === ROLES.VENTAS

  const [desde, setDesde] = useState(getDefaultDesde())
  const [hasta, setHasta] = useState(getDefaultHasta())
  const [estado, setEstado] = useState('')
  const [pedidos, setPedidos] = useState<IPedidoListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filtros: IFiltroPedidos = { desde, hasta }
      if (estado) filtros.estado = estado as IFiltroPedidos['estado']
      const results = await getPedidos(filtros)
      setPedidos(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error consultando pedidos')
    } finally {
      setIsLoading(false)
    }
  }, [desde, hasta, estado])

  useEffect(() => {
    buscar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- solo al montar

  return (
    <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
      <FlexBox justifyContent="SpaceBetween" alignItems="Center">
        <Title level="H3">Pedidos de Venta</Title>
        {canCreate && (
          <Button
            design="Emphasized"
            icon="add"
            onClick={() => navigate('/pedidos/nuevo')}
          >
            Nuevo Pedido
          </Button>
        )}
      </FlexBox>

      {/* Filtros */}
      <FlexBox wrap="Wrap" style={{ gap: '0.75rem' }} alignItems="End">
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Desde</label>
          <DatePicker
            value={desde}
            onChange={(e) => setDesde(e.detail.value)}
            style={{ width: '200px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Hasta</label>
          <DatePicker
            value={hasta}
            onChange={(e) => setHasta(e.detail.value)}
            style={{ width: '200px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Estado</label>
          <Select
            onChange={(e) => setEstado(e.detail.selectedOption?.getAttribute('data-value') ?? '')}
            style={{ width: '160px' }}
          >
            <Option data-value="" selected>Todos</Option>
            <Option data-value="Creado">Creado</Option>
            <Option data-value="Procesado">Procesado</Option>
            <Option data-value="Anulado">Anulado</Option>
          </Select>
        </div>
        <Button icon="search" design="Default" onClick={buscar}>
          Buscar
        </Button>
      </FlexBox>

      {error && <MessageStrip design="Negative">{error}</MessageStrip>}

      <BusyIndicator active={isLoading} size="M">
        {pedidos.length === 0 && !isLoading ? (
          <MessageStrip design="Information" hideCloseButton>
            No hay pedidos para el período seleccionado
          </MessageStrip>
        ) : (
          <Table
            overflowMode="Scroll"
            style={{ width: '100%' }}
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell width="130px">Nº Pedido</TableHeaderCell>
                <TableHeaderCell width="120px">Fecha</TableHeaderCell>
                <TableHeaderCell minWidth="150px">Cliente</TableHeaderCell>
                <TableHeaderCell width="130px">Tipo Doc</TableHeaderCell>
                <TableHeaderCell width="130px">Canal</TableHeaderCell>
                <TableHeaderCell width="120px">Total</TableHeaderCell>
                <TableHeaderCell width="100px">Estado</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {pedidos.map((p) => (
              <TableRow
                key={p.vbeln}
                onClick={() => navigate(`/pedidos/${p.vbeln}`)}
                style={{ cursor: 'pointer' }}
              >
                <TableCell>{p.vbeln}</TableCell>
                <TableCell>{p.fecha}</TableCell>
                <TableCell>{p.nombreCliente || p.kunnr}</TableCell>
                <TableCell>{p.tipoDoc}</TableCell>
                <TableCell>{p.canal}</TableCell>
                <TableCell>{formatCLP(p.total)}</TableCell>
                <TableCell>
                  <Tag colorScheme={estadoColor(p.estado)}>{p.estado}</Tag>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </BusyIndicator>
    </div>
  )
}
