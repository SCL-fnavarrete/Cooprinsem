import { Table, TableHeaderRow, TableHeaderCell, TableRow, TableCell, Tag, MessageStrip } from '@ui5/webcomponents-react'
import type { ISapImpresoraConfig, ISapUsuarioVendedor, ISapUsuarioImpresora } from '@/types/sapMaestro'
import { Paginador } from '@/components/common/Paginador'
import { usePaginacion } from '@/hooks/usePaginacion'

// Admin > Tablas SAP: tablas de impresoras y vendedores publicadas por
// Arquitectura SAP (13-10-2026). Solo lectura, paginadas en el navegador como
// Perfiles Usuario. La carga y el buscador están en AdminPage.

export function FilaSinDatos({ columnas }: { columnas: number }) {
  return (
    <TableRow>
      <TableCell>Sin datos disponibles</TableCell>
      {Array.from({ length: columnas - 1 }, (_, i) => <TableCell key={i}>—</TableCell>)}
    </TableRow>
  )
}

type Paginacion<T> = ReturnType<typeof usePaginacion<T>>

export function PaginadorTabla<T>({ p, etiqueta, testId }: { p: Paginacion<T>; etiqueta: string; testId: string }) {
  return (
    <Paginador
      pagina={p.pagina}
      totalPaginas={p.totalPaginas}
      tamano={p.tamano}
      total={p.total}
      desde={p.desde}
      hasta={p.hasta}
      onPagina={p.irAPagina}
      onTamano={p.cambiarTamano}
      etiqueta={etiqueta}
      data-testid={testId}
    />
  )
}

// Sap_impresora_config — impresoras por sociedad / oficina de ventas / usuario.
export function TablaImpresoraConfig({ filas }: { filas: ISapImpresoraConfig[] }) {
  const p = usePaginacion(filas)
  return (
    <>
      <Table
        overflowMode="Scroll"
        style={{ width: '100%' }}
        data-testid="tabla-impresora-config"
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell minWidth="110px">Sociedad (Bukrs)</TableHeaderCell>
            <TableHeaderCell minWidth="110px">Oficina (Vkbur)</TableHeaderCell>
            <TableHeaderCell minWidth="130px">Usuario (Uname)</TableHeaderCell>
            <TableHeaderCell minWidth="140px">Imp. Copago</TableHeaderCell>
            <TableHeaderCell minWidth="110px">Copago Activo</TableHeaderCell>
            <TableHeaderCell minWidth="140px">Imp. Cta. Cte.</TableHeaderCell>
            <TableHeaderCell minWidth="140px">Imp. Cotización</TableHeaderCell>
          </TableHeaderRow>
        }
      >
        {filas.length === 0
          ? <FilaSinDatos columnas={7} />
          : p.itemsPagina.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.Bukrs}</TableCell>
              <TableCell>{f.Vkbur}</TableCell>
              <TableCell>{f.Uname || 'Toda la oficina'}</TableCell>
              <TableCell>{f.ImpCopago || '—'}</TableCell>
              <TableCell><Tag colorScheme={f.CopagoActivo ? '8' : '10'}>{f.CopagoActivo ? 'Sí' : 'No'}</Tag></TableCell>
              <TableCell>{f.ImpCtaCte || '—'}</TableCell>
              <TableCell>{f.ImpCotizacion || '—'}</TableCell>
            </TableRow>
          ))
        }
      </Table>
      <PaginadorTabla p={p} etiqueta="registros" testId="paginador-impresora-config" />
    </>
  )
}

// Sap_usuario_vendedor — usuario SAP → bodega móvil (Zvendedor). Confirmado el
// 21-10-2026 con la venta de combustible: Zvendedor es el interlocutor SB
// ("Responsable stock especial", ej. MALVARADO → 60000364), no el código de
// vendedor; el vendedor (ZA) es Usuarios_pos.IdVendedor.
export function TablaUsuarioVendedor({ filas }: { filas: ISapUsuarioVendedor[] }) {
  const p = usePaginacion(filas)
  return (
    <>
      <MessageStrip design="Information" hideCloseButton data-testid="usuario-vendedor-bodega">
        Zvendedor es la bodega móvil del usuario (interlocutor SB, "Responsable stock especial"), que se envía en la
        venta de combustible (ZV15). No es el código de vendedor: el vendedor (ZA) es el Id Vendedor de Usuarios_pos.
      </MessageStrip>
      <Table
        overflowMode="Scroll"
        style={{ width: '100%' }}
        data-testid="tabla-usuario-vendedor"
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell minWidth="150px">Usuario SAP (Bname)</TableHeaderCell>
            <TableHeaderCell minWidth="150px">Bodega móvil (Zvendedor · SB)</TableHeaderCell>
            <TableHeaderCell minWidth="170px">Id Vendedor (ZA) en Usuarios_pos</TableHeaderCell>
          </TableHeaderRow>
        }
      >
        {filas.length === 0
          ? <FilaSinDatos columnas={3} />
          : p.itemsPagina.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.Bname}</TableCell>
              <TableCell>{f.Zvendedor || '—'}</TableCell>
              <TableCell>
                {f.idVendedorPos === null ? 'No está en Usuarios_pos' : (f.idVendedorPos || '(vacío)')}
              </TableCell>
            </TableRow>
          ))
        }
      </Table>
      <PaginadorTabla p={p} etiqueta="usuarios" testId="paginador-usuario-vendedor" />
    </>
  )
}

// Sap_usuario_impresora — impresora de red por usuario, centro y clase de mensaje.
export function TablaUsuarioImpresora({ filas, truncado, maximo }: { filas: ISapUsuarioImpresora[]; truncado: boolean; maximo: number }) {
  const p = usePaginacion(filas)
  return (
    <>
      {truncado && (
        <MessageStrip design="Critical" hideCloseButton data-testid="usuario-impresora-truncado">
          Se muestran las primeras {maximo} filas. Use el buscador (usuario, centro, clase de mensaje o impresora) para acotar.
        </MessageStrip>
      )}
      <Table
        overflowMode="Scroll"
        style={{ width: '100%' }}
        data-testid="tabla-usuario-impresora"
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell minWidth="150px">Usuario SAP (Bname)</TableHeaderCell>
            <TableHeaderCell minWidth="100px">Centro (Werks)</TableHeaderCell>
            <TableHeaderCell minWidth="140px">Clase mensaje (Kschl)</TableHeaderCell>
            <TableHeaderCell minWidth="240px">Impresora (Zip)</TableHeaderCell>
          </TableHeaderRow>
        }
      >
        {filas.length === 0
          ? <FilaSinDatos columnas={4} />
          : p.itemsPagina.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.Bname}</TableCell>
              <TableCell>{f.Werks}</TableCell>
              <TableCell>{f.Kschl}</TableCell>
              <TableCell>{f.Zip || '—'}</TableCell>
            </TableRow>
          ))
        }
      </Table>
      <PaginadorTabla p={p} etiqueta="registros" testId="paginador-usuario-impresora" />
    </>
  )
}
