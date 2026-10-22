import {
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Tag,
} from '@ui5/webcomponents-react'
import { formatCLP, formatFecha } from '@/utils/format'
import { clavePartidaCtaCte, motivoNoPagable, type IPartidaCtaCte } from '@/types/ctaCte'
import { estadoMostrado } from './columnasPartidasCtaCte'
import { siguienteOrden, type ColumnaOrdenCtaCte } from './ordenPartidasCtaCte'
import type { IBusquedaCtaCte } from './useBusquedaCtaCte'

// Columnas de la grilla "Listado de Documentos" (WebDynpro + Estado y N° Documento).
// "Cuota" omitida: la API no la trae. Todas ordenan al hacer clic.
const COLUMNAS_DOCUMENTOS: { titulo: string; orden: ColumnaOrdenCtaCte }[] = [
  { titulo: 'Estado', orden: 'estado' },
  { titulo: 'Sucursal', orden: 'sucursal' },
  { titulo: 'Tipo documento', orden: 'tipoDocumento' },
  { titulo: 'Nº Documento SAP', orden: 'documento' },
  { titulo: 'Folio', orden: 'folio' },
  { titulo: 'Moneda', orden: 'moneda' },
  { titulo: 'Monto', orden: 'monto' },
  { titulo: 'Moneda Doc.', orden: 'monedaDocumento' },
  { titulo: 'Monto Doc.', orden: 'montoDocumento' },
  { titulo: 'Fecha documento', orden: 'fechaDocumento' },  // DocumentDate de SAP (fecha de emisión)
  { titulo: 'Fecha de vencimiento', orden: 'fechaVencimiento' },
  { titulo: 'Bloqueo pago', orden: 'bloqueoPago' },
]

// Botón de cabecera: hereda la tipografía de la tabla, sin estilo de botón.
const estiloBotonCabecera = {
  background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit',
  cursor: 'pointer', textAlign: 'left', width: '100%',
} as const

interface TablaPartidasCtaCteProps {
  busqueda: IBusquedaCtaCte
  // Pago Cta. Cte.: columna "Sel." y clic en la fila; sin esto la tabla es de solo consulta (E° de Cuenta).
  seleccion?: { seleccionadas: string[]; onToggle: (p: IPartidaCtaCte) => void }
}

/**
 * Grilla "Listado de Documentos" con las partidas de useBusquedaCtaCte,
 * compartida por Pago Cta. Cte. (con selección) y E° de Cuenta (solo consulta).
 * Ordena por columna; overflowMode="Scroll" da el scroll horizontal (el
 * contenedor debe usar minmax(0, 1fr) para no desbordar la página).
 */
export function TablaPartidasCtaCte({ busqueda, seleccion }: TablaPartidasCtaCteProps) {
  const { partidasOrdenadas, orden, setOrden, isCargandoPartidas, cliente, fechaVencimiento } = busqueda
  return (
    <Table
      overflowMode="Scroll"
      style={{ width: '100%' }}
      data-testid="tabla-partidas-ctacte"
      headerRow={
        <TableHeaderRow>
          {seleccion && <TableHeaderCell minWidth="110px">Sel.</TableHeaderCell>}
          {COLUMNAS_DOCUMENTOS.map((col) => {
            const activa = orden.columna === col.orden
            return (
              <TableHeaderCell
                key={col.titulo}
                minWidth="110px"
                sortIndicator={activa ? (orden.direccion === 'asc' ? 'Ascending' : 'Descending') : 'None'}
              >
                <button
                  type="button"
                  style={estiloBotonCabecera}
                  onClick={() => setOrden((actual) => siguienteOrden(actual, col.orden))}
                  title={`Ordenar por ${col.titulo}`}
                  data-testid={`ctacte-orden-${col.orden}`}
                >
                  {col.titulo}
                </button>
              </TableHeaderCell>
            )
          })}
        </TableHeaderRow>
      }
      noData={
        <span style={{ padding: '1rem', display: 'block' }}>
          {isCargandoPartidas
            ? 'Consultando partidas abiertas en SAP…'
            : cliente
              ? `El cliente ${cliente.codigoCliente} no tiene partidas abiertas${fechaVencimiento ? ` que venzan hasta el ${formatFecha(fechaVencimiento)}` : ''}.`
              : 'Identifique al cliente para ver sus partidas abiertas.'}
        </span>
      }
    >
      {!isCargandoPartidas && partidasOrdenadas.map((p) => {
        const estado = estadoMostrado(p)
        const clave = clavePartidaCtaCte(p)
        const motivo = seleccion ? motivoNoPagable(p) : null
        return (
          <TableRow
            key={clave}
            title={motivo ?? undefined}
            onClick={seleccion ? () => seleccion.onToggle(p) : undefined}
            style={seleccion ? { cursor: motivo ? 'not-allowed' : 'pointer', opacity: motivo ? 0.6 : undefined } : undefined}
          >
            {seleccion && (
              <TableCell>
                <input
                  type="checkbox"
                  checked={seleccion.seleccionadas.includes(clave)}
                  disabled={!!motivo}
                  readOnly
                  aria-label={`Seleccionar documento ${p.documento}`}
                />
              </TableCell>
            )}
            <TableCell><Tag colorScheme={estado.color}>{estado.texto}</Tag></TableCell>
            <TableCell>{p.sucursal || 'No informado'}</TableCell>
            <TableCell>{p.tipoDocumentoNombre || p.tipoDocumento}</TableCell>
            <TableCell>{p.documento}</TableCell>
            <TableCell>{p.folio || '—'}</TableCell>
            <TableCell>{p.moneda}</TableCell>
            <TableCell>{formatCLP(p.monto)}</TableCell>
            <TableCell>{p.monedaDocumento}</TableCell>
            <TableCell>{formatCLP(p.montoDocumento)}</TableCell>
            <TableCell>{p.fechaDocumento ? formatFecha(p.fechaDocumento) : '—'}</TableCell>
            <TableCell>{p.fechaVencimiento ? formatFecha(p.fechaVencimiento) : '—'}</TableCell>
            <TableCell>{p.bloqueoPago ? `Bloqueado (${p.bloqueoPago})` : 'Autorizado el pago'}</TableCell>
          </TableRow>
        )
      })}
    </Table>
  )
}
