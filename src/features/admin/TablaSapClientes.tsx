import { Table, TableHeaderRow, TableHeaderCell, TableRow, TableCell, Tag, MessageStrip } from '@ui5/webcomponents-react'
import type { ISapClienteMaestro } from '@/types/sapMaestro'
import { usePaginacion } from '@/hooks/usePaginacion'
import { FilaSinDatos, PaginadorTabla } from './TablasSapImpresoras'

// Admin > Tablas SAP > Clientes: maestro Sap_cliente (sync de Arquitectura SAP,
// solo lectura) con TODOS sus campos. Paginado en el navegador como Perfiles
// Usuario; la búsqueda se hace en el backend (máximo de filas con aviso).

const COLUMNAS = 18

// Fecha del sync (ISO) → "14-10-2026 09:00" en hora de Chile.
function fechaHora(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso || '—'
  return d.toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SiNo({ valor }: { valor: boolean }) {
  return <Tag colorScheme={valor ? '1' : '8'}>{valor ? 'Sí' : 'No'}</Tag>
}

function categoria(c: string): string {
  if (c === '1') return '1 · Persona'
  if (c === '2') return '2 · Organización'
  return c || '—'
}

export function TablaSapClientes({ filas, truncado, maximo }: { filas: ISapClienteMaestro[]; truncado: boolean; maximo: number }) {
  const p = usePaginacion(filas)
  return (
    <>
      <MessageStrip design="Information" hideCloseButton>
        Tabla <code>Sap_cliente</code> con todos sus campos. Distinta de Maestros POS &gt; Clientes, que lista la copia local
        de la tabla de clientes del POC.
      </MessageStrip>
      {truncado && (
        <MessageStrip design="Critical" hideCloseButton data-testid="clientes-sap-truncado">
          Se muestran los primeros {maximo} clientes. Use el buscador (cliente, BP, nombre, RUT, sucursal o grupo) para acotar.
        </MessageStrip>
      )}
      <Table
        overflowMode="Scroll"
        style={{ width: '100%' }}
        data-testid="tabla-clientes-sap"
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell minWidth="110px">Cliente (Customer)</TableHeaderCell>
            <TableHeaderCell minWidth="110px">BP</TableHeaderCell>
            <TableHeaderCell minWidth="200px">Nombre (CustomerName)</TableHeaderCell>
            <TableHeaderCell minWidth="280px">Nombre completo (CustomerFullName)</TableHeaderCell>
            <TableHeaderCell minWidth="120px">RUT (CliRut)</TableHeaderCell>
            <TableHeaderCell minWidth="100px">Sucursal (CliSucursal)</TableHeaderCell>
            <TableHeaderCell minWidth="110px">IDCliente</TableHeaderCell>
            <TableHeaderCell minWidth="130px">Grupo cuentas (CustomerAccountGroup)</TableHeaderCell>
            <TableHeaderCell minWidth="150px">Categoría BP (BusinessPartnerCategory)</TableHeaderCell>
            <TableHeaderCell minWidth="130px">Grupo BP (BusinessPartnerGrouping)</TableHeaderCell>
            <TableHeaderCell minWidth="110px">Bloq. contab. (PostingIsBlocked)</TableHeaderCell>
            <TableHeaderCell minWidth="110px">Bloq. entrega (DeliveryIsBlocked)</TableHeaderCell>
            <TableHeaderCell minWidth="110px">Bloq. factura (BillingIsBlockedForCustomer)</TableHeaderCell>
            <TableHeaderCell minWidth="110px">Bloq. pedido (OrderIsBlockedForCustomer)</TableHeaderCell>
            <TableHeaderCell minWidth="110px">Marca borrado (DeletionIndicator)</TableHeaderCell>
            <TableHeaderCell minWidth="150px">Creado (created_at)</TableHeaderCell>
            <TableHeaderCell minWidth="150px">Actualizado (updated_at)</TableHeaderCell>
            <TableHeaderCell minWidth="70px">id</TableHeaderCell>
          </TableHeaderRow>
        }
      >
        {filas.length === 0
          ? <FilaSinDatos columnas={COLUMNAS} />
          : p.itemsPagina.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.Customer}</TableCell>
              <TableCell>{c.BusinessPartner || '—'}</TableCell>
              <TableCell>{c.CustomerName || '—'}</TableCell>
              <TableCell>{c.CustomerFullName || '—'}</TableCell>
              <TableCell>{c.CliRut || '—'}</TableCell>
              <TableCell>{c.CliSucursal || '—'}</TableCell>
              <TableCell>{c.IDCliente || '—'}</TableCell>
              <TableCell>{c.CustomerAccountGroup || '—'}</TableCell>
              <TableCell>{categoria(c.BusinessPartnerCategory)}</TableCell>
              <TableCell>{c.BusinessPartnerGrouping || '—'}</TableCell>
              <TableCell><SiNo valor={c.PostingIsBlocked} /></TableCell>
              <TableCell>{c.DeliveryIsBlocked || '—'}</TableCell>
              <TableCell>{c.BillingIsBlockedForCustomer || '—'}</TableCell>
              <TableCell>{c.OrderIsBlockedForCustomer || '—'}</TableCell>
              <TableCell><SiNo valor={c.DeletionIndicator} /></TableCell>
              <TableCell>{fechaHora(c.created_at)}</TableCell>
              <TableCell>{fechaHora(c.updated_at)}</TableCell>
              <TableCell>{c.id}</TableCell>
            </TableRow>
          ))
        }
      </Table>
      <PaginadorTabla p={p} etiqueta="clientes" testId="paginador-clientes-sap" />
    </>
  )
}
