import { Table, TableHeaderRow, TableHeaderCell, TableRow, TableCell, Tag } from '@ui5/webcomponents-react'
import type { IDocumentoCaja, Semaforo } from '@/types/caja'
import { formatCLP, formatFecha } from '@/utils/format'

// Caja > Home — "Listado de Documentos" con las columnas del WebDynpro
// (zpos_wd_fun_001), precedidas por Sel. y Estado. La fuente de los documentos
// está pendiente: por ahora el Home la muestra vacía (ver PendientesHomeCaja).

const COLUMNAS = [
  'Sel.', 'Estado', 'Tipo documento', 'Folio', 'Rut', 'Cliente',
  'Moneda Doc.', 'Monto Doc.', 'Moneda', 'Monto', 'Fecha', 'Bloqueo pago',
]

const ESTADOS: Record<Semaforo, { texto: string; color: 'Set1' | 'Set2' | 'Set8' | '10' }> = {
  verde: { texto: 'Vigente', color: 'Set8' },
  amarillo: { texto: 'Por vencer', color: 'Set2' },
  rojo: { texto: 'Vencida', color: 'Set1' },
  pagada: { texto: 'Pagada', color: '10' },
}

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
        return (
          <TableRow key={d.id} onClick={() => onToggle(d.id)} style={{ cursor: 'pointer' }} data-testid={`documento-caja-${d.id}`}>
            <TableCell>
              <input
                type="checkbox"
                checked={seleccionado}
                readOnly
                aria-label={`Seleccionar documento ${d.folio || d.id}`}
              />
            </TableCell>
            <TableCell><Tag colorScheme={estado.color}>{estado.texto}</Tag></TableCell>
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
