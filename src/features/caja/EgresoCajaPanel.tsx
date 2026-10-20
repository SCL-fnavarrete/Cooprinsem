import { useState, useEffect, useCallback } from 'react'
import {
  Title,
  FlexBox,
  Button,
  Label,
  MessageStrip,
  Dialog,
  Bar,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/add.js'
import '@ui5/webcomponents-icons/dist/refresh.js'
import { useUser } from '@/stores/userContext'
import { SUCURSALES, SAP_SOCIEDAD } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'
import { formatCLP } from '@/utils/format'
import { ExportarTabla } from '@/components/common/ExportarTabla'
import type { ColumnaExport } from '@/utils/exportarTabla'
import { usePaginacion } from '@/hooks/usePaginacion'
import { Paginador } from '@/components/common/Paginador'
import { EgresoCajaDialog } from '@/components/pos/EgresoCajaDialog'
import { PendientesEgresoCaja } from './PendientesEgresoCaja'
import { SoloModoTecnico } from '@/components/common/SoloModoTecnico'
import {
  getEgresosCaja,
  registrarEgresoCaja,
  type IEgresoRegistrado,
  type IEgresoCajaResult,
} from '@/services/api/sapCaja'
import { useSoloLectura, TEXTO_SOLO_LECTURA } from '@/hooks/useSoloLectura'

// Caja > Egr. de Caja (15-10-2026): listado de egreso_caja de la sucursal y
// formulario "Nuevo egreso" (mismo formato que la Apertura de Caja). El asiento
// en SAP está pendiente de confirmar: ver server/src/routes/sapCaja.ts.

// Hora del registro (ISO) en hora de Chile, ej. "14:32".
function horaChile(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' })
}

function hoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

const estiloJson = {
  maxHeight: '35vh',
  overflow: 'auto',
  fontSize: '0.75rem',
  background: 'var(--sapList_Background)',
  padding: '0.75rem',
  borderRadius: '4px',
  margin: 0,
} as const

// Columnas para "Exportar tabla" (las de la grilla). Monto como número.
const COLUMNAS_EXPORT_EGRESOS: ColumnaExport<IEgresoRegistrado>[] = [
  { titulo: 'Fecha', valor: (e) => e.fecha.split('-').reverse().join('-') },
  { titulo: 'Hora', valor: (e) => horaChile(e.creadoEn) },
  { titulo: 'Usuario', valor: (e) => e.usuario },
  { titulo: 'Sucursal', valor: (e) => e.sucursal },
  { titulo: 'Motivo', valor: (e) => e.motivo },
  { titulo: 'Descripción', valor: (e) => e.descripcion },
  { titulo: 'Monto', valor: (e) => e.monto },
  { titulo: 'Moneda', valor: (e) => e.moneda },
  { titulo: 'N° Documento SAP', valor: (e) => e.nroDocumento },
  { titulo: 'Ejercicio', valor: (e) => e.ejercicio },
  { titulo: 'ID', valor: (e) => e.id },
]

export function EgresoCajaPanel() {
  const soloLectura = useSoloLectura()
  const { usuario } = useUser()
  const sucursal = usuario?.sucursal ?? ''
  const nombreSucursal = SUCURSALES[sucursal as CodigoSucursal] ?? sucursal

  const [desde, setDesde] = useState(hoyChile)
  const [hasta, setHasta] = useState(hoyChile)
  const [egresos, setEgresos] = useState<IEgresoRegistrado[]>([])
  const [isCargando, setIsCargando] = useState(false)
  const [errorListado, setErrorListado] = useState<string | null>(null)
  const paginacion = usePaginacion(egresos)

  const [showDialog, setShowDialog] = useState(false)
  const [isGrabando, setIsGrabando] = useState(false)
  const [resultado, setResultado] = useState<IEgresoCajaResult | null>(null)

  const cargar = useCallback(async () => {
    if (!sucursal) return
    setIsCargando(true)
    setErrorListado(null)
    try {
      const r = await getEgresosCaja({ sucursal, desde, hasta })
      if (r.success) setEgresos(r.data ?? [])
      else setErrorListado(r.message ?? 'No se pudo cargar el listado de egresos')
    } catch (err) {
      setErrorListado(err instanceof Error ? `Error de red al cargar egresos: ${err.message}` : 'Error de red al cargar egresos')
    } finally {
      setIsCargando(false)
    }
  }, [sucursal, desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  const handleAceptar = useCallback(async (monto: number, descripcion: string) => {
    if (!usuario) return
    setIsGrabando(true)
    try {
      const r = await registrarEgresoCaja({ usuario: usuario.id, sucursal, monto, descripcion })
      setResultado(r)
      setShowDialog(false)
      if (r.success) cargar()
    } catch (err) {
      setResultado({ success: false, message: err instanceof Error ? `Error de red: ${err.message}` : 'Error de red al registrar el egreso' })
      setShowDialog(false)
    } finally {
      setIsGrabando(false)
    }
  }, [usuario, sucursal, cargar])

  const tituloResultado = resultado?.success
    ? 'Egreso de Caja — SAP aceptó el documento'
    : resultado?.pendiente
      ? 'Egreso de Caja — pendiente de confirmar el asiento'
      : 'Egreso de Caja — no registrado'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem' }} data-testid="egreso-caja-panel">
      <FlexBox justifyContent="SpaceBetween" alignItems="Center" wrap="Wrap" style={{ gap: '0.5rem' }}>
        <Title level="H3">Egreso de Caja</Title>
        <Button design="Emphasized" icon="add" onClick={() => setShowDialog(true)} disabled={soloLectura} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : undefined} data-testid="btn-nuevo-egreso">
          Nuevo egreso
        </Button>
      </FlexBox>

      {/* Filtro por fecha (por defecto hoy); la sucursal es la del usuario */}
      <FlexBox alignItems="End" wrap="Wrap" style={{ gap: '1rem' }}>
        <div>
          <Label>Sucursal</Label>
          <div style={{ padding: '0.4rem 0' }}>{sucursal} — {nombreSucursal}</div>
        </div>
        <div>
          <Label for="egreso-desde">Desde</Label>
          <div><input id="egreso-desde" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} data-testid="egreso-desde" /></div>
        </div>
        <div>
          <Label for="egreso-hasta">Hasta</Label>
          <div><input id="egreso-hasta" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} data-testid="egreso-hasta" /></div>
        </div>
        <Button design="Transparent" icon="refresh" onClick={cargar} disabled={isCargando}>Actualizar</Button>
        <ExportarTabla
          filas={egresos}
          columnas={COLUMNAS_EXPORT_EGRESOS}
          nombreArchivo={`Caja egresos ${sucursal}`}
          nombreHoja="Egresos de caja"
          data-testid="exportar-egresos"
        />
      </FlexBox>

      {errorListado && <MessageStrip design="Negative" hideCloseButton>{errorListado}</MessageStrip>}

      <Table
        overflowMode="Scroll"
        style={{ width: '100%' }}
        data-testid="tabla-egresos"
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell minWidth="100px">Fecha</TableHeaderCell>
            <TableHeaderCell minWidth="70px">Hora</TableHeaderCell>
            <TableHeaderCell minWidth="120px">Usuario</TableHeaderCell>
            <TableHeaderCell minWidth="90px">Sucursal</TableHeaderCell>
            <TableHeaderCell minWidth="100px">Motivo</TableHeaderCell>
            <TableHeaderCell minWidth="220px">Descripción</TableHeaderCell>
            <TableHeaderCell minWidth="110px">Monto</TableHeaderCell>
            <TableHeaderCell minWidth="80px">Moneda</TableHeaderCell>
            <TableHeaderCell minWidth="120px">N° Documento SAP</TableHeaderCell>
            <TableHeaderCell minWidth="80px">Ejercicio</TableHeaderCell>
            <TableHeaderCell minWidth="70px">ID</TableHeaderCell>
          </TableHeaderRow>
        }
        noData={
          <span style={{ padding: '1rem', display: 'block' }}>
            {isCargando ? 'Cargando egresos…' : 'No hay egresos registrados en el período.'}
          </span>
        }
      >
        {!isCargando && paginacion.itemsPagina.map((e) => (
          <TableRow key={e.id}>
            <TableCell>{e.fecha.split('-').reverse().join('-')}</TableCell>
            <TableCell>{horaChile(e.creadoEn)}</TableCell>
            <TableCell>{e.usuario}</TableCell>
            <TableCell>{e.sucursal}</TableCell>
            <TableCell>{e.motivo}</TableCell>
            <TableCell>{e.descripcion || '—'}</TableCell>
            <TableCell>{formatCLP(e.monto)}</TableCell>
            <TableCell>{e.moneda}</TableCell>
            <TableCell>{e.nroDocumento || '—'}</TableCell>
            <TableCell>{e.ejercicio || '—'}</TableCell>
            <TableCell>{e.id}</TableCell>
          </TableRow>
        ))}
      </Table>
      <Paginador
        pagina={paginacion.pagina}
        totalPaginas={paginacion.totalPaginas}
        tamano={paginacion.tamano}
        total={paginacion.total}
        desde={paginacion.desde}
        hasta={paginacion.hasta}
        onPagina={paginacion.irAPagina}
        onTamano={paginacion.cambiarTamano}
        etiqueta="egresos"
        data-testid="paginador-egresos"
      />

      <SoloModoTecnico><PendientesEgresoCaja /></SoloModoTecnico>

      <EgresoCajaDialog
        open={showDialog}
        usuario={usuario?.id ?? ''}
        nombreUsuario={usuario?.nombre}
        sociedad={SAP_SOCIEDAD}
        nombreSociedad="COOPRINSEM LTDA."
        sucursal={sucursal}
        nombreSucursal={nombreSucursal}
        onAceptar={handleAceptar}
        onCancelar={() => setShowDialog(false)}
        isGrabando={isGrabando}
        error={null}
      />

      {/* Resultado: siempre con la URL, el JSON enviado (o propuesto) y la respuesta de SAP */}
      {resultado && (
        <Dialog
          open
          headerText={tituloResultado}
          style={{ width: '720px', maxHeight: '85vh' }}
          data-testid="egreso-resultado"
          footer={<Bar endContent={<Button design="Emphasized" onClick={() => setResultado(null)}>Cerrar</Button>} />}
        >
          <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            <MessageStrip
              design={resultado.success ? 'Positive' : resultado.pendiente ? 'Critical' : 'Negative'}
              hideCloseButton
              data-testid="egreso-resultado-mensaje"
            >
              {resultado.success
                ? `SAP contabilizó el egreso — Documento N° ${resultado.data?.egreso?.AcDocNo ?? '—'}`
                : (resultado.message ?? 'SAP rechazó el egreso.')}
            </MessageStrip>
            {resultado.advertencia && <MessageStrip design="Critical" hideCloseButton>{resultado.advertencia}</MessageStrip>}
            <Label data-testid="egreso-resultado-usuario">
              <b>Egreso hecho por:</b> {usuario?.id}{usuario?.nombre ? ` — ${usuario.nombre}` : ''} · Sucursal {sucursal}
            </Label>
            {resultado.registro && (
              <Label data-testid="egreso-resultado-registro">
                <b>Registrado en el POS:</b> {formatCLP(resultado.registro.monto)} · {resultado.registro.fecha.split('-').reverse().join('-')}
                {resultado.registro.descripcion ? ` · ${resultado.registro.descripcion}` : ''}
              </Label>
            )}
            {!resultado.success && (resultado.errordetails?.length ?? 0) > 0 && (
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                {resultado.errordetails!.map((d, i) => <li key={i}>{d.message}</li>)}
              </ul>
            )}
            <SoloModoTecnico>
            {resultado.url && <Label><b>URL:</b> POST {resultado.url}</Label>}
            {resultado.body && (
              <details open>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  {resultado.pendiente ? 'JSON propuesto (no enviado)' : 'JSON enviado'}
                </summary>
                <pre style={estiloJson}>{JSON.stringify(resultado.body, null, 2)}</pre>
              </details>
            )}
            {!resultado.pendiente && !!(resultado.data?.egreso || resultado.detalle) && (
              <details open>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>JSON de respuesta de SAP</summary>
                <pre style={estiloJson}>{JSON.stringify(resultado.data?.egreso ?? resultado.detalle, null, 2)}</pre>
              </details>
            )}
            </SoloModoTecnico>
          </div>
        </Dialog>
      )}
    </div>
  )
}
