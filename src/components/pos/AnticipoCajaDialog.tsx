import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  FlexBox,
  Label,
  Input,
  Button,
  Bar,
  MessageStrip,
  BusyIndicator,
  Title,
  Select,
  Option,
} from '@ui5/webcomponents-react'
import { SAP_SOCIEDAD } from '@/config/sap'
import { ClienteSearch } from '@/components/pos/ClienteSearch'
import { getSolicitudAnticipo, getSolicitudesAnticipo } from '@/services/api/sapCtaCte'
import { clavePartidaCtaCte, type ISolicitudAnticipo } from '@/types/ctaCte'
import type { ICliente } from '@/types/cliente'
import { formatCLP, formatFecha } from '@/utils/format'

interface AnticipoCajaDialogProps {
  open: boolean
  onCancelar: () => void
  sucursal?: string
  // Precarga desde Ant. Cliente (cliente elegido y, si se eligió una fila, su solicitud).
  clienteInicial?: ICliente | null
  documentoInicial?: string
  ejercicioInicial?: string
}

// Opción del select "otro número": muestra el campo para digitarlo.
const OPCION_OTRO_NUMERO = 'otro'

// Texto de cada opción del select: N° documento · importe · vencimiento · texto.
function textoOpcion(s: ISolicitudAnticipo): string {
  return [
    s.documento,
    formatCLP(s.monto),
    s.fechaVencimiento ? `vence ${formatFecha(s.fechaVencimiento)}` : '',
    s.texto,
  ].filter(Boolean).join(' · ')
}

// Ant. Cliente — popup "Anticipos" (correo de José, 20-10-2026): la cajera
// elige el cliente y la solicitud de anticipo creada por la jefatura en SAP
// (F-37, CME F). Con el cliente elegido, "Nº documento" es un select con sus
// solicitudes abiertas (22-10-2026); elegir una la consulta y muestra sus datos.
// "Otro N° (digitar)" deja ingresar el número a mano y buscarlo con Aceptar.
// "Ir a pagar" abre la pantalla de pago en modo anticipo.
export function AnticipoCajaDialog({ open, onCancelar, sucursal = 'D190', clienteInicial, documentoInicial, ejercicioInicial }: AnticipoCajaDialogProps) {
  const navigate = useNavigate()
  const ejercicioActual = new Date().getFullYear().toString()
  const [cliente, setCliente] = useState<ICliente | null>(null)
  const [ejercicio, setEjercicio] = useState(ejercicioActual)
  const [nroDocumento, setNroDocumento] = useState('')
  const [isBuscando, setIsBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [solicitud, setSolicitud] = useState<ISolicitudAnticipo | null>(null)
  // Solicitudes abiertas del cliente elegido (para el select)
  const [abiertas, setAbiertas] = useState<ISolicitudAnticipo[]>([])
  const [isCargandoAbiertas, setIsCargandoAbiertas] = useState(false)
  const [errorAbiertas, setErrorAbiertas] = useState<string | null>(null)
  // true = digitar el N° (sin solicitudes abiertas o "Otro N°")
  const [digitarNumero, setDigitarNumero] = useState(false)

  const buscar = useCallback(async (codigoCliente: string, documento: string, anio: string) => {
    setIsBuscando(true)
    setError(null)
    setSolicitud(null)
    try {
      const r = await getSolicitudAnticipo({ cliente: codigoCliente, documento: documento.trim(), ejercicio: anio.trim() })
      if (r.success && r.data) setSolicitud(r.data)
      else setError(r.message ?? 'No se pudo consultar la solicitud de anticipo en SAP')
    } catch (err) {
      setError(err instanceof Error ? `Error de red al consultar SAP: ${err.message}` : 'Error de red al consultar SAP')
    } finally {
      setIsBuscando(false)
    }
  }, [])

  // Al abrir: precargar lo elegido en Ant. Cliente y, si viene la solicitud, consultarla de inmediato.
  useEffect(() => {
    if (!open) return
    const anio = ejercicioInicial ?? ejercicioActual
    setCliente(clienteInicial ?? null)
    setNroDocumento(documentoInicial ?? '')
    setEjercicio(anio)
    setSolicitud(null)
    setError(null)
    if (clienteInicial && documentoInicial) buscar(clienteInicial.codigoCliente, documentoInicial, anio)
  }, [open, clienteInicial, documentoInicial, ejercicioInicial, ejercicioActual, buscar])

  // Al elegir (o cambiar) el cliente se cargan sus solicitudes abiertas
  useEffect(() => {
    setAbiertas([])
    setErrorAbiertas(null)
    if (!open || !cliente) {
      setDigitarNumero(false)
      return
    }
    let cancelado = false
    setIsCargandoAbiertas(true)
    getSolicitudesAnticipo(cliente.codigoCliente)
      .then((r) => {
        if (cancelado) return
        const lista = r.success ? (r.data ?? []) : []
        setAbiertas(lista)
        if (!r.success) setErrorAbiertas(r.message ?? 'No se pudieron consultar las solicitudes abiertas en SAP')
        // Sin solicitudes en la lista: se digita el número
        setDigitarNumero(lista.length === 0)
      })
      .catch((err) => {
        if (cancelado) return
        setErrorAbiertas(err instanceof Error ? `Error de red al consultar SAP: ${err.message}` : 'Error de red al consultar SAP')
        setDigitarNumero(true)
      })
      .finally(() => { if (!cancelado) setIsCargandoAbiertas(false) })
    return () => { cancelado = true }
  }, [open, cliente])

  const elegirDelSelect = useCallback((clave: string) => {
    if (clave === OPCION_OTRO_NUMERO) {
      setDigitarNumero(true)
      setNroDocumento('')
      setSolicitud(null)
      return
    }
    const elegida = abiertas.find((s) => clavePartidaCtaCte(s) === clave)
    if (!elegida || !cliente) return
    setNroDocumento(elegida.documento)
    setEjercicio(elegida.ejercicio)
    // Se consulta igual que al digitarla: valida que siga abierta en SAP
    buscar(cliente.codigoCliente, elegida.documento, elegida.ejercicio)
  }, [abiertas, cliente, buscar])

  const handleIrAPagar = useCallback(() => {
    if (!solicitud) return
    const docs = clavePartidaCtaCte(solicitud)
    navigate(`/caja/pago?fuente=sap&modo=anticipo&kunnr=${encodeURIComponent(cliente?.codigoCliente ?? solicitud.cliente)}&docs=${encodeURIComponent(docs)}`)
  }, [navigate, solicitud, cliente])

  const puedeBuscar = !!cliente && /^\d{1,10}$/.test(nroDocumento.trim()) && /^\d{4}$/.test(ejercicio.trim()) && !isBuscando

  return (
    <Dialog
      open={open}
      headerText="Anticipos"
      style={{ width: '560px', maxWidth: '95vw' }}
      onClose={onCancelar}
      data-testid="anticipo-dialog"
      footer={
        <Bar
          endContent={
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button design="Transparent" onClick={onCancelar}>
                Cancelar
              </Button>
              {solicitud ? (
                <>
                  <Button design="Default" onClick={() => setSolicitud(null)} data-testid="btn-anticipo-volver">
                    Volver
                  </Button>
                  <Button design="Emphasized" onClick={handleIrAPagar} data-testid="btn-anticipo-ir-pagar">
                    Ir a pagar
                  </Button>
                </>
              ) : (
                <Button
                  design="Emphasized"
                  onClick={() => cliente && buscar(cliente.codigoCliente, nroDocumento, ejercicio)}
                  disabled={!puedeBuscar}
                  data-testid="btn-anticipo-aceptar"
                >
                  Aceptar
                </Button>
              )}
            </FlexBox>
          }
        />
      }
    >
      <div style={{ padding: '1rem', display: 'grid', gap: '1rem', boxSizing: 'border-box' }}>
        {!solicitud && (
          <>
            <div>
              <Label>Cliente</Label>
              {/* key: al reabrir se vuelve a montar con el cliente precargado */}
              <ClienteSearch
                key={`${open}-${clienteInicial?.codigoCliente ?? ''}`}
                clienteInicial={clienteInicial ?? null}
                onClienteSeleccionado={setCliente}
                onClienteDeseleccionado={() => setCliente(null)}
                sucursal={sucursal}
                ocultarClienteBoleta
                ocultarPanelCredito
              />
            </div>

            <FlexBox style={{ gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Label>Sociedad</Label>
                <Input value={SAP_SOCIEDAD} readonly aria-label="Sociedad" style={{ width: '100%' }} />
              </div>
              <div style={{ width: '90px', flexShrink: 0 }}>
                <Label>Ejercicio</Label>
                <Input
                  value={ejercicio}
                  onInput={(e: { target: { value: string } }) => setEjercicio(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  aria-label="Ejercicio"
                  style={{ width: '100%' }}
                />
              </div>
            </FlexBox>

            {cliente && isCargandoAbiertas && (
              <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
                <BusyIndicator active size="S" />
                <Label>Buscando solicitudes de anticipo abiertas…</Label>
              </FlexBox>
            )}

            {errorAbiertas && (
              <MessageStrip design="Critical" hideCloseButton data-testid="anticipo-error-lista">
                {errorAbiertas} Puede digitar el N° de documento.
              </MessageStrip>
            )}

            {cliente && !isCargandoAbiertas && !digitarNumero && abiertas.length > 0 && (
              <div>
                <Label>Nº documento ({abiertas.length} solicitud{abiertas.length === 1 ? '' : 'es'} abierta{abiertas.length === 1 ? '' : 's'})</Label>
                <Select
                  onChange={(e) => elegirDelSelect((e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? '')}
                  aria-label="Solicitud de anticipo"
                  style={{ width: '100%' }}
                  data-testid="select-anticipo"
                >
                  <Option data-id="" selected={!nroDocumento}>— Seleccione una solicitud —</Option>
                  {abiertas.map((s) => {
                    const clave = clavePartidaCtaCte(s)
                    return (
                      <Option key={clave} data-id={clave} selected={nroDocumento === s.documento && ejercicio === s.ejercicio}>
                        {textoOpcion(s)}
                      </Option>
                    )
                  })}
                  <Option data-id={OPCION_OTRO_NUMERO}>Otro N° (digitar)</Option>
                </Select>
              </div>
            )}

            {(!cliente || digitarNumero) && (
            <div>
              {cliente && !isCargandoAbiertas && abiertas.length === 0 && !errorAbiertas && (
                <MessageStrip design="Information" hideCloseButton style={{ marginBottom: '0.5rem' }} data-testid="anticipo-sin-abiertas">
                  El cliente no tiene solicitudes de anticipo abiertas en la lista. Puede digitar el N° de documento.
                </MessageStrip>
              )}
              <FlexBox justifyContent="SpaceBetween" alignItems="Center">
                <Label>Nº documento</Label>
                {abiertas.length > 0 && (
                  <Button design="Transparent" onClick={() => { setDigitarNumero(false); setNroDocumento('') }} data-testid="btn-anticipo-ver-lista">
                    Elegir de la lista
                  </Button>
                )}
              </FlexBox>
              <Input
                value={nroDocumento}
                onInput={(e: { target: { value: string } }) => setNroDocumento(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && puedeBuscar && cliente) buscar(cliente.codigoCliente, nroDocumento, ejercicio)
                }}
                placeholder="N° de la solicitud de anticipo (SAP)"
                aria-label="Nº documento"
                style={{ width: '100%' }}
              />
            </div>
            )}
          </>
        )}

        {isBuscando && (
          <FlexBox justifyContent="Center">
            <BusyIndicator active size="M" data-testid="anticipo-buscando" />
          </FlexBox>
        )}

        {error && (
          <MessageStrip design="Negative" hideCloseButton data-testid="anticipo-error">
            {error}
          </MessageStrip>
        )}

        {solicitud && (
          <div data-testid="anticipo-detalle" style={{ display: 'grid', gap: '0.5rem' }}>
            <MessageStrip design="Positive" hideCloseButton>
              Solicitud de anticipo encontrada en SAP. Revise los datos y presione "Ir a pagar".
            </MessageStrip>
            <Label>Cliente: {cliente ? `${cliente.codigoCliente} — ${cliente.nombre}` : solicitud.cliente}</Label>
            <Label>Nº documento: <strong>{solicitud.documento}</strong> (ejercicio {solicitud.ejercicio})</Label>
            <FlexBox direction="Column" style={{ gap: '0.15rem' }}>
              <Label>Importe</Label>
              <Title level="H3" data-testid="anticipo-importe">{formatCLP(solicitud.monto)}</Title>
            </FlexBox>
            <Label>Vencimiento: {solicitud.fechaVencimiento ? formatFecha(solicitud.fechaVencimiento) : '—'}</Label>
            <Label>Asignación: {solicitud.asignacion || '—'}</Label>
            <Label>Texto: {solicitud.texto || '—'}</Label>
          </div>
        )}
      </div>
    </Dialog>
  )
}
