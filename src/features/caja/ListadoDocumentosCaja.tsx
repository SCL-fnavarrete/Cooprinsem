import { Table, TableHeaderRow, TableHeaderCell, TableRow, TableCell, Tag } from '@ui5/webcomponents-react'
import type { IDocumentoCaja, Semaforo } from '@/types/caja'
import { formatCLP, formatFecha } from '@/utils/format'
import type { ColumnaExport } from '@/utils/exportarTabla'

// Caja > Home — "Listado de Documentos" con las columnas del WebDynpro
// (zpos_wd_fun_001), precedidas por Sel. y Estado. Documentos de SAP
// (FAR_CUSTOMER_LINE_ITEMS, ver PendientesHomeCaja). Los que el pago
// rechazaría (pagados, CME, abonos…) se muestran sin poder seleccionarse.

const COLUMNAS = [
  'Sel.', 'Estado', 'Sucursal', 'Tipo documento', 'Folio', 'Rut', 'Cliente',
  'Moneda Doc.', 'Monto Doc.', 'Moneda', 'Monto', 'Fecha', 'Bloqueo pago',
]

const ESTADOS: Record<Semaforo, { texto: string; color: 'Set1' | 'Set2' | 'Set8' | '10' }> = {
  verde: { texto: 'Vigente', color: 'Set8' },
  amarillo: { texto: 'Por vencer', color: 'Set2' },
  rojo: { texto: 'Vencida', color: 'Set1' },
  pagada: { texto: 'Pagada', color: '10' },
}

// Columnas para "Exportar tabla": las mismas de la grilla (sin Sel.), más el
// código del cliente. Montos como número entero (sin $ ni puntos).
export const COLUMNAS_EXPORT_DOCUMENTOS_CAJA: ColumnaExport<IDocumentoCaja>[] = [
  { titulo: 'Estado', valor: (d) => ESTADOS[d.estado].texto },
  { titulo: 'Sucursal', valor: (d) => d.sucursal || 'No informado' },
  { titulo: 'Tipo documento', valor: (d) => d.tipoDocumento },
  { titulo: 'Folio', valor: (d) => d.folio },
  { titulo: 'Rut', valor: (d) => d.rut },
  { titulo: 'Código cliente', valor: (d) => d.kunnr },
  { titulo: 'Cliente', valor: (d) => d.cliente },
  { titulo: 'Moneda Doc.', valor: (d) => d.monedaDocumento },
  { titulo: 'Monto Doc.', valor: (d) => d.montoDocumento },
  { titulo: 'Moneda', valor: (d) => d.moneda },
  { titulo: 'Monto', valor: (d) => d.monto },
  { titulo: 'Fecha', valor: (d) => (d.fecha ? formatFecha(d.fecha) : '') },
  { titulo: 'Bloqueo pago', valor: (d) => (d.bloqueoPago ? `Bloqueado (${d.bloqueoPago})` : 'Autorizado el pago') },
  { titulo: 'No seleccionable', valor: (d) => d.motivoNoSeleccionable ?? '' },
]

interface ListadoDocumentosCajaProps {
  documentos: IDocumentoCaja[]
  seleccionados: string[]
  onToggle: (id: string) => void
}

export function ListadoDocumentosCaja({ documentos, seleccionados, onToggle }: ListadoDocumentosCajaProps) {
  return (
    <Table
      overflowMode="Scroll"
      style={{ width: '100%' }}
      data-testid="listado-documentos-caja"
      headerRow={
        <TableHeaderRow>
          {COLUMNAS.map((col) => (
            <TableHeaderCell key={col} minWidth={col === 'Sel.' ? '60px' : '110px'}>{col}</TableHeaderCell>
          ))}
        </TableHeaderRow>
      }
      noData={<span style={{ padding: '1rem', display: 'block' }}>No hay documentos disponibles para pagar</span>}
    >
      {documentos.map((d) => {
        const estado = ESTADOS[d.estado]
        const seleccionado = seleccionados.includes(d.id)
        const motivo = d.motivoNoSeleccionable
        return (
          <TableRow
            key={d.id}
            onClick={() => { if (!motivo) onToggle(d.id) }}
            style={{ cursor: motivo ? 'not-allowed' : 'pointer', opacity: motivo ? 0.6 : 1 }}
            title={motivo}
            data-testid={`documento-caja-${d.id}`}
          >
            <TableCell>
              <input
                type="checkbox"
                checked={seleccionado}
                disabled={!!motivo}
                readOnly
                aria-label={`Seleccionar documento ${d.folio || d.id}`}
              />
            </TableCell>
            <TableCell><Tag colorScheme={estado.color}>{estado.texto}</Tag></TableCell>
            <TableCell>{d.sucursal || 'No informado'}</TableCell>
            <TableCell>{d.tipoDocumento || '—'}</TableCell>
            <TableCell>{d.folio || '—'}</TableCell>
            <TableCell>{d.rut || '—'}</TableCell>
            <TableCell>{d.cliente || d.kunnr}</TableCell>
            <TableCell>{d.monedaDocumento}</TableCell>
            <TableCell>{formatCLP(d.montoDocumento)}</TableCell>
            <TableCell>{d.moneda}</TableCell>
            <TableCell>{formatCLP(d.monto)}</TableCell>
            <TableCell>{d.fecha ? formatFecha(d.fecha) : '—'}</TableCell>
            <TableCell>{d.bloqueoPago ? `Bloqueado (${d.bloqueoPago})` : 'Autorizado el pago'}</TableCell>
          </TableRow>
        )
      })}
    </Table>
  )
}
