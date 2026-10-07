import '@ui5/webcomponents-icons/dist/value-help.js'
import '@ui5/webcomponents-icons/dist/nav-back.js'
import '@ui5/webcomponents-icons/dist/payment-approval.js'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card,
  CardHeader,
  FlexBox,
  Label,
  Input,
  Button,
  Select,
  Option,
  DatePicker,
  MessageStrip,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Tag,
} from '@ui5/webcomponents-react'
import { BusquedaClienteDialog } from '@/components/pos/BusquedaClienteDialog'
import { buscarClientesSapTabla } from '@/services/api/clientes'
import { getSapCentros } from '@/services/api/sapMaestro'
import { useUser } from '@/stores/userContext'
import { validarRUT, limpiarRUT } from '@/utils/validations'
import { formatRUT, formatCLP, formatFecha } from '@/utils/format'
import { getPartidasCtaCte } from '@/services/api/sapCtaCte'
import { PendientesCtaCte } from './PendientesCtaCte'
import type { ICliente } from '@/types/cliente'
import type { ISapCentro } from '@/types/sapMaestro'
import { clavePartidaCtaCte, motivoNoPagable, type IPartidaCtaCte } from '@/types/ctaCte'
import { ordenarPartidasCtaCte, siguienteOrden, ORDEN_CTACTE_DEFECTO, type ColumnaOrdenCtaCte, type IOrdenCtaCte } from './ordenPartidasCtaCte'

interface PagoCtaCtePanelProps {
  onVolver: () => void
}

// Columnas de la grilla "Listado de Documentos" (WebDynpro + Estado y N° Documento).
// "Cuota" omitida: la API no la trae. Todas ordenan al hacer clic, salvo "Sel.".
const COLUMNAS_DOCUMENTOS: { titulo: string; orden?: ColumnaOrdenCtaCte }[] = [
  { titulo: 'Sel.' },
  { titulo: 'Estado', orden: 'estado' },
  { titulo: 'Sucursal', orden: 'sucursal' },
  { titulo: 'Tipo documento', orden: 'tipoDocumento' },
  { titulo: 'Nº Documento SAP', orden: 'documento' },
  { titulo: 'Folio', orden: 'folio' },
  { titulo: 'Moneda', orden: 'moneda' },
  { titulo: 'Monto', orden: 'monto' },
  { titulo: 'Moneda Doc.', orden: 'monedaDocumento' },
  { titulo: 'Monto Doc.', orden: 'montoDocumento' },
  { titulo: 'Fecha de vencimiento', orden: 'fechaVencimiento' },
  { titulo: 'Bloqueo pago', orden: 'bloqueoPago' },
]

// Botón de cabecera: hereda la tipografía de la tabla, sin estilo de botón.
const estiloBotonCabecera = {
  background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit', color: 'inherit',
  cursor: 'pointer', textAlign: 'left', width: '100%',
} as const

// Semáforo (mismo criterio que el listado de Home): vencida si tiene días de
// mora, por vencer si vence en los próximos 7 días, vigente en otro caso.
function estadoPartida(diasMora: number): { texto: string; color: 'Set1' | 'Set2' | 'Set8' } {
  if (diasMora > 0) return { texto: `Vencida (${diasMora} d)`, color: 'Set1' }
  if (diasMora >= -7) return { texto: 'Por vencer', color: 'Set2' }
  return { texto: 'Vigente', color: 'Set8' }
}

const estiloCampo = { display: 'grid', gap: '0.25rem' } as const

/**
 * Caja > Pago Cta. Cte. — formulario "Cuenta Corriente" (réplica del WebDynpro).
 *
 * El botón Buscar (o salir del campo RUT / Cliente) identifica al cliente en el
 * maestro local Sap_cliente; con el cliente identificado se cargan sus partidas
 * abiertas desde SAP (FAR_CUSTOMER_LINE_ITEMS) y se recargan al cambiar la
 * fecha de vencimiento.
 */
export function PagoCtaCtePanel({ onVolver }: PagoCtaCtePanelProps) {
  const { usuario } = useUser()
  const navigate = useNavigate()
  // ?cliente=… al volver desde la pantalla de pago: se vuelve a identificar.
  const [searchParams] = useSearchParams()
  const clienteInicial = searchParams.get('cliente') ?? ''

  const [rut, setRut] = useState('')
  const [codigoCliente, setCodigoCliente] = useState(clienteInicial)
  const [cliente, setCliente] = useState<ICliente | null>(null)
  const [coincidencias, setCoincidencias] = useState<ICliente[]>([])
  const [sucursal, setSucursal] = useState(usuario?.sucursal ?? '')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [centros, setCentros] = useState<ISapCentro[]>([])
  const [isBuscando, setIsBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBuscador, setShowBuscador] = useState(false)
  const [partidas, setPartidas] = useState<IPartidaCtaCte[]>([])
  const [isCargandoPartidas, setIsCargandoPartidas] = useState(false)
  const [errorPartidas, setErrorPartidas] = useState<string | null>(null)
  const [partidasTruncadas, setPartidasTruncadas] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const [orden, setOrden] = useState<IOrdenCtaCte>(ORDEN_CTACTE_DEFECTO)
  const partidasOrdenadas = useMemo(() => ordenarPartidasCtaCte(partidas, orden), [partidas, orden])

  // Partidas abiertas del cliente identificado; se recargan al cambiar la
  // fecha de vencimiento ("vence hasta"). Una respuesta vieja no pisa a una nueva.
  const codigoIdentificado = cliente?.codigoCliente ?? ''
  useEffect(() => {
    setPartidas([])
    setSeleccionadas([])
    setErrorPartidas(null)
    setPartidasTruncadas(false)
    if (!codigoIdentificado) return
    let vigente = true
    setIsCargandoPartidas(true)
    getPartidasCtaCte({ cliente: codigoIdentificado, venceHasta: fechaVencimiento || undefined })
      .then((r) => {
        if (!vigente) return
        if (r.success) {
          setPartidas(r.data ?? [])
          setPartidasTruncadas(!!r.truncado)
        } else {
          setErrorPartidas(r.message ?? 'No se pudieron consultar las partidas abiertas')
        }
      })
      .catch((err) => { if (vigente) setErrorPartidas(err instanceof Error ? err.message : 'Error de red al consultar las partidas') })
      .finally(() => { if (vigente) setIsCargandoPartidas(false) })
    return () => { vigente = false }
  }, [codigoIdentificado, fechaVencimiento])

  const totalPartidas = partidas.reduce((suma, p) => suma + p.monto, 0)
  const totalSeleccionado = partidas
    .filter((p) => seleccionadas.includes(clavePartidaCtaCte(p)))
    .reduce((suma, p) => suma + p.monto, 0)

  // Selección de partidas a pagar (no se pueden elegir bloqueadas ni abonos).
  const toggleSeleccion = (p: IPartidaCtaCte) => {
    if (motivoNoPagable(p)) return
    const clave = clavePartidaCtaCte(p)
    setSeleccionadas((prev) => (prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]))
  }

  // Pantalla de pago existente (PagoDetallePage) con fuente SAP: permite elegir
  // vía de pago y monto; "Ejecutar Pago" queda deshabilitado hasta tener la API.
  const irAPagar = () => {
    if (!cliente || seleccionadas.length === 0) return
    navigate(`/caja/pago?fuente=sap&kunnr=${encodeURIComponent(cliente.codigoCliente)}&docs=${encodeURIComponent(seleccionadas.join(','))}`)
  }

  // Sucursales desde el maestro SAP (Sap_centro).
  useEffect(() => {
    getSapCentros().then(setCentros).catch(() => setCentros([]))
  }, [])

  const asignarCliente = (c: ICliente) => {
    setCliente(c)
    setCoincidencias([])
    setError(null)
    setRut(c.rut ? formatRUT(c.rut) : '')
    setCodigoCliente(c.codigoCliente)
  }

  // Editar RUT o Cliente invalida el cliente identificado.
  const editarRut = (valor: string) => {
    setRut(valor)
    setCliente(null)
    setCoincidencias([])
  }
  const editarCodigo = (valor: string) => {
    setCodigoCliente(valor)
    setCliente(null)
    setCoincidencias([])
  }

  /**
   * Identifica al cliente por RUT o por código en el maestro local Sap_cliente.
   * El backend no encuentra un RUT completo (Sap_cliente lo guarda con guion y
   * la búsqueda lo compara sin guion), así que se busca por el cuerpo del RUT y
   * se filtra la coincidencia exacta aquí.
   *
   * `origen`: al salir del campo RUT se busca solo por RUT, y al salir de
   * Cliente solo por código (el otro campo puede tener un valor anterior).
   * El botón Buscar usa ambos.
   */
  const buscandoRef = useRef(false)
  const identificarCliente = async (origen: 'rut' | 'cliente' | 'ambos' = 'ambos') => {
    if (buscandoRef.current) return
    setError(null)
    setCoincidencias([])
    const rutIngresado = origen === 'cliente' ? '' : rut.trim()
    const codigoIngresado = origen === 'rut' ? '' : codigoCliente.trim()

    if (!rutIngresado && !codigoIngresado) {
      setError('Ingrese el RUT o el código de Cliente')
      return
    }
    if (rutIngresado && !validarRUT(rutIngresado)) {
      setError('El RUT ingresado no es válido')
      return
    }

    buscandoRef.current = true
    setIsBuscando(true)
    try {
      const rutLimpio = rutIngresado ? limpiarRUT(rutIngresado).toUpperCase() : ''
      const consulta = rutLimpio ? rutLimpio.slice(0, -1) : codigoIngresado
      const resultados = await buscarClientesSapTabla(consulta, usuario?.sucursal)
      const exactos = resultados.filter((c) =>
        (!rutLimpio || limpiarRUT(c.rut ?? '').toUpperCase() === rutLimpio) &&
        (!codigoIngresado || c.codigoCliente === codigoIngresado)
      )

      if (exactos.length === 0) {
        setCliente(null)
        setError('No se encontró el cliente en el maestro de clientes SAP (Sap_cliente)')
      } else if (exactos.length === 1) {
        asignarCliente(exactos[0])
      } else {
        // Varios clientes con el mismo RUT: el cajero elige.
        setCliente(null)
        setCoincidencias(exactos)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar el cliente')
    } finally {
      buscandoRef.current = false
      setIsBuscando(false)
    }
  }

  useEffect(() => {
    if (clienteInicial) void identificarCliente('cliente')
    // Solo al montar: identificarCliente cambia en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al salir del campo (o con Enter) con un valor nuevo, se busca el cliente y
  // se carga el nombre automáticamente (evento "change" del Input UI5).
  const alSalirDeRut = () => {
    if (rut.trim() && !cliente) void identificarCliente('rut')
  }
  const alSalirDeCliente = () => {
    if (codigoCliente.trim() && !cliente) void identificarCliente('cliente')
  }

  return (
    // Formulario arriba y listado abajo, ambos a todo el ancho (más espacio
    // para los campos y para las 10 columnas del listado).
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem' }}>
      {/* ── Cuenta Corriente ── */}
      <Card header={<CardHeader titleText="Cuenta Corriente" />}>
        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0.75rem 1rem', alignItems: 'start' }}>
          <div style={estiloCampo}>
            <Label for="ctacte-rut">Rut</Label>
            <FlexBox style={{ gap: '0.25rem' }}>
              <Input
                id="ctacte-rut"
                value={rut}
                onInput={(e: { target: { value: string } }) => editarRut(e.target.value)}
                onChange={alSalirDeRut}
                placeholder="12.345.678-9"
                style={{ flex: 1 }}
                aria-label="Rut"
              />
              <Button icon="value-help" design="Transparent" tooltip="Buscar cliente" onClick={() => setShowBuscador(true)} aria-label="Buscar cliente por RUT" />
            </FlexBox>
          </div>

          <div style={estiloCampo}>
            <Label for="ctacte-cliente">Cliente</Label>
            <FlexBox style={{ gap: '0.25rem' }}>
              <Input
                id="ctacte-cliente"
                value={codigoCliente}
                onInput={(e: { target: { value: string } }) => editarCodigo(e.target.value.trim())}
                onChange={alSalirDeCliente}
                placeholder="Código SAP"
                style={{ flex: 1 }}
                aria-label="Cliente"
              />
              <Button icon="value-help" design="Transparent" tooltip="Buscar cliente" onClick={() => setShowBuscador(true)} aria-label="Buscar cliente por código" />
            </FlexBox>
          </div>

          <div style={estiloCampo}>
            <Label>Nombre</Label>
            <span style={{ fontWeight: 'bold', minHeight: '1.25rem' }} data-testid="ctacte-nombre">
              {cliente?.nombre ?? '—'}
            </span>
          </div>

          <div style={estiloCampo}>
            <Label>Sucursal</Label>
            <Select
              onChange={(e) => setSucursal(e.detail.selectedOption?.getAttribute('data-value') ?? '')}
              aria-label="Sucursal"
            >
              <Option data-value="" selected={sucursal === ''}>Todas</Option>
              {centros.map((c) => (
                <Option key={c.Plant} data-value={c.Plant} selected={c.Plant === sucursal}>
                  {c.Plant} — {c.PlantName}
                </Option>
              ))}
            </Select>
          </div>

          <div style={estiloCampo}>
            <Label>Fecha vencimiento</Label>
            {/* PROVISORIO: en SAP es un select; datepicker mientras se confirman sus opciones */}
            <DatePicker
              value={fechaVencimiento}
              formatPattern="yyyy-MM-dd"
              onChange={(e) => setFechaVencimiento(e.detail.valid ? e.detail.value : '')}
              aria-label="Fecha vencimiento"
            />
          </div>

          <div style={{ alignSelf: 'end' }}>
            <Button design="Emphasized" onClick={() => void identificarCliente('ambos')} disabled={isBuscando} data-testid="ctacte-buscar">
              {isBuscando ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>

          {error && <MessageStrip design="Negative" hideCloseButton style={{ gridColumn: '1 / -1' }}>{error}</MessageStrip>}

          {coincidencias.length > 0 && (
            <div style={{ display: 'grid', gap: '0.25rem', gridColumn: '1 / -1' }}>
              <MessageStrip design="Critical" hideCloseButton>
                Hay {coincidencias.length} clientes con este RUT. Seleccione uno:
              </MessageStrip>
              {coincidencias.map((c) => (
                <Button key={c.codigoCliente} design="Default" onClick={() => asignarCliente(c)} style={{ justifyContent: 'flex-start' }}>
                  {c.codigoCliente} — {c.nombre}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Listado de Documentos ── */}
      <Card header={<CardHeader titleText="Listado de Documentos" />}>
        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.75rem' }}>
          <FlexBox style={{ gap: '0.5rem' }}>
            <Button icon="nav-back" onClick={onVolver}>Volver</Button>
            <Button
              icon="payment-approval"
              design="Emphasized"
              disabled={seleccionadas.length === 0}
              onClick={irAPagar}
              tooltip={seleccionadas.length === 0 ? 'Seleccione al menos una partida' : undefined}
              data-testid="ctacte-pagos"
            >
              Pagos{seleccionadas.length > 0 ? ` (${seleccionadas.length})` : ''}
            </Button>
          </FlexBox>
          {errorPartidas && <MessageStrip design="Negative" hideCloseButton>{errorPartidas}</MessageStrip>}
          {partidasTruncadas && (
            <MessageStrip design="Critical" hideCloseButton>
              Se muestran las primeras {partidas.length} partidas. Use la fecha de vencimiento para acotar.
            </MessageStrip>
          )}
          {partidas.length > 0 && (
            <Label data-testid="ctacte-total">
              {partidas.length} partida{partidas.length === 1 ? '' : 's'} abierta{partidas.length === 1 ? '' : 's'} — Total: {formatCLP(totalPartidas)}
              {seleccionadas.length > 0 && ` · Seleccionadas: ${seleccionadas.length} — ${formatCLP(totalSeleccionado)}`}
            </Label>
          )}
          <Table
            overflowMode="Scroll"
            style={{ width: '100%' }}
            headerRow={
              <TableHeaderRow>
                {COLUMNAS_DOCUMENTOS.map((col) => {
                  const columnaOrden = col.orden
                  if (!columnaOrden) return <TableHeaderCell key={col.titulo} minWidth="110px">{col.titulo}</TableHeaderCell>
                  const activa = orden.columna === columnaOrden
                  return (
                    <TableHeaderCell
                      key={col.titulo}
                      minWidth="110px"
                      sortIndicator={activa ? (orden.direccion === 'asc' ? 'Ascending' : 'Descending') : 'None'}
                    >
                      <button
                        type="button"
                        style={estiloBotonCabecera}
                        onClick={() => setOrden((actual) => siguienteOrden(actual, columnaOrden))}
                        title={`Ordenar por ${col.titulo}`}
                        data-testid={`ctacte-orden-${columnaOrden}`}
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
              const estado = p.pagoPendiente
                ? { texto: 'Pagada · pend. compensación', color: 'Set8' as const }
                : estadoPartida(p.diasMora)
              const clave = clavePartidaCtaCte(p)
              const motivo = motivoNoPagable(p)
              return (
                <TableRow
                  key={clave}
                  title={motivo ?? undefined}
                  onClick={() => toggleSeleccion(p)}
                  style={{ cursor: motivo ? 'not-allowed' : 'pointer', opacity: motivo ? 0.6 : undefined }}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={seleccionadas.includes(clave)}
                      disabled={!!motivo}
                      readOnly
                      aria-label={`Seleccionar documento ${p.documento}`}
                    />
                  </TableCell>
                  <TableCell><Tag colorScheme={estado.color}>{estado.texto}</Tag></TableCell>
                  <TableCell>{p.sucursal || 'No informado'}</TableCell>
                  <TableCell>{p.tipoDocumento}{p.tipoDocumentoNombre ? ` — ${p.tipoDocumentoNombre}` : ''}</TableCell>
                  <TableCell>{p.documento}</TableCell>
                  <TableCell>{p.folio || '—'}</TableCell>
                  <TableCell>{p.moneda}</TableCell>
                  <TableCell>{formatCLP(p.monto)}</TableCell>
                  <TableCell>{p.monedaDocumento}</TableCell>
                  <TableCell>{formatCLP(p.montoDocumento)}</TableCell>
                  <TableCell>{p.fechaVencimiento ? formatFecha(p.fechaVencimiento) : '—'}</TableCell>
                  <TableCell>{p.bloqueoPago ? `Bloqueado (${p.bloqueoPago})` : 'Autorizado el pago'}</TableCell>
                </TableRow>
              )
            })}
          </Table>
        </div>
      </Card>

      <BusquedaClienteDialog
        open={showBuscador}
        fuente="sap_tabla"
        sucursal={usuario?.sucursal}
        onSeleccionar={(c) => {
          asignarCliente(c)
          setShowBuscador(false)
        }}
        onCerrar={() => setShowBuscador(false)}
      />

      <PendientesCtaCte />
    </div>
  )
}
