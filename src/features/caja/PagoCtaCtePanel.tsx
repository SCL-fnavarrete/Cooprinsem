import '@ui5/webcomponents-icons/dist/value-help.js'
import '@ui5/webcomponents-icons/dist/nav-back.js'
import '@ui5/webcomponents-icons/dist/payment-approval.js'
import { useState, useEffect, useRef } from 'react'
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
} from '@ui5/webcomponents-react'
import { BusquedaClienteDialog } from '@/components/pos/BusquedaClienteDialog'
import { buscarClientesSapTabla } from '@/services/api/clientes'
import { getSapCentros } from '@/services/api/sapMaestro'
import { useUser } from '@/stores/userContext'
import { validarRUT, limpiarRUT } from '@/utils/validations'
import { formatRUT } from '@/utils/format'
import type { ICliente } from '@/types/cliente'
import type { ISapCentro } from '@/types/sapMaestro'

interface PagoCtaCtePanelProps {
  onVolver: () => void
}

// Columnas de la grilla "Listado de Documentos" (igual que el WebDynpro).
const COLUMNAS_DOCUMENTOS = [
  'Sucursal', 'Tipo documento', 'Folio', 'Moneda', 'Monto',
  'Moneda Doc.', 'Monto Doc.', 'Cuota', 'Fecha de vencimiento', 'Bloqueo pago',
]

const estiloCampo = { display: 'grid', gap: '0.25rem' } as const

/**
 * Caja > Pago Cta. Cte. — formulario "Cuenta Corriente" (réplica del WebDynpro).
 *
 * Fase 1 (2026-10-05): el botón Buscar solo IDENTIFICA al cliente (completa
 * RUT, Cliente y Nombre) contra el maestro local Sap_cliente. El listado de
 * documentos queda preparado y se llenará cuando SAP entregue la API.
 */
export function PagoCtaCtePanel({ onVolver }: PagoCtaCtePanelProps) {
  const { usuario } = useUser()

  const [rut, setRut] = useState('')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [cliente, setCliente] = useState<ICliente | null>(null)
  const [coincidencias, setCoincidencias] = useState<ICliente[]>([])
  const [sucursal, setSucursal] = useState(usuario?.sucursal ?? '')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [centros, setCentros] = useState<ISapCentro[]>([])
  const [isBuscando, setIsBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBuscador, setShowBuscador] = useState(false)

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
              onChange={(e) => setFechaVencimiento(e.detail.value)}
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
            <Button icon="payment-approval" disabled tooltip="Disponible cuando SAP habilite la API de documentos">
              Pagos
            </Button>
          </FlexBox>
          <Table
            overflowMode="Scroll"
            style={{ width: '100%' }}
            headerRow={
              <TableHeaderRow>
                {COLUMNAS_DOCUMENTOS.map((col) => (
                  <TableHeaderCell key={col} minWidth="110px">{col}</TableHeaderCell>
                ))}
              </TableHeaderRow>
            }
            noData={
              <span style={{ padding: '1rem', display: 'block' }}>
                {cliente
                  ? `Cliente ${cliente.codigoCliente} identificado. El listado de documentos se habilitará cuando SAP entregue la API.`
                  : 'Identifique al cliente para ver sus documentos (listado disponible cuando SAP entregue la API).'}
              </span>
            }
          />
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
    </div>
  )
}
