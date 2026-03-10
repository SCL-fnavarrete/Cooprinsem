import { useState, useEffect, useCallback } from 'react'
import {
  Title,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Button,
  FlexBox,
  BusyIndicator,
  MessageStrip,
  Toolbar,
  ToolbarSpacer,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/refresh.js'
import '@ui5/webcomponents-icons/dist/print.js'
import { getPagares } from '@/services/api/pagares'
import { formatCLP } from '@/utils/format'
import type { IPagare } from '@/types/pagare'

export function ListPagaresPanel() {
  const [pagares, setPagares] = useState<IPagare[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarPagares = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getPagares()
      setPagares(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagarés. Intente nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarPagares()
  }, [cargarPagares])

  const handleImprimir = useCallback(() => {
    window.print()
  }, [])

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Title level="H3">Listado de Pagarés</Title>

      <Toolbar>
        <ToolbarSpacer />
        <Button icon="refresh" onClick={cargarPagares} disabled={isLoading}>
          Actualizar
        </Button>
        <Button icon="print" onClick={handleImprimir} disabled={isLoading || pagares.length === 0}>
          Imprimir
        </Button>
      </Toolbar>

      {error && (
        <MessageStrip design="Negative" hideCloseButton>
          {error}
        </MessageStrip>
      )}

      {isLoading ? (
        <FlexBox justifyContent="Center" style={{ padding: '2rem' }}>
          <BusyIndicator active size="M" data-testid="loading-indicator" />
        </FlexBox>
      ) : !error && pagares.length === 0 ? (
        <MessageStrip design="Information" hideCloseButton>
          No hay pagarés registrados
        </MessageStrip>
      ) : !error ? (
        <Table>
          <TableHeaderRow slot="headerRow">
            <TableHeaderCell>Cliente</TableHeaderCell>
            <TableHeaderCell>Nombre</TableHeaderCell>
            <TableHeaderCell>RUT</TableHeaderCell>
            <TableHeaderCell>Referencia</TableHeaderCell>
            <TableHeaderCell>Cuota</TableHeaderCell>
            <TableHeaderCell>Valor Pagaré</TableHeaderCell>
            <TableHeaderCell>Fecha Vencimiento</TableHeaderCell>
          </TableHeaderRow>
          {pagares.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.kunnr}</TableCell>
              <TableCell>{p.nombre}</TableCell>
              <TableCell>{p.rut}</TableCell>
              <TableCell>{p.referencia}</TableCell>
              <TableCell>{p.cuota}</TableCell>
              <TableCell>{formatCLP(p.valorPagare)}</TableCell>
              <TableCell>{p.fechaVencimiento}</TableCell>
            </TableRow>
          ))}
        </Table>
      ) : null}
    </div>
  )
}
