import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, FlexBox, MessageStrip, Tag, Title, BusyIndicator } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/refresh.js'
import { JsonCopiable } from '@/components/common/JsonCopiable'
import {
  emitirFacturaSap, type IEmitirFacturaParams, type IEmitirFacturaResult, type EstadoPasoFactura, type ILlamadaSap,
} from '@/services/api/sapFacturas'
import { PendientesFacturacion } from './PendientesFacturacion'

// Pasos 2 y 3 de la venta facturada (documento de José, 16-10-2026): se
// disparan solos apenas SAP devuelve el N° de pedido. Muestra cada llamada a
// SAP con su JSON de ida y de vuelta (para depurar) y permite reintentar
// desde el primer paso que falte (el backend no repite lo que ya existe).

const ESTADOS: Record<EstadoPasoFactura, { texto: string; color: '8' | '1' | '6' | '10' | '2' }> = {
  ok: { texto: 'Listo', color: '8' },
  existente: { texto: 'Ya existía', color: '8' },
  propuesta: { texto: 'Solo JSON (no enviado)', color: '6' },
  error: { texto: 'Error', color: '1' },
  omitido: { texto: 'No se intentó', color: '10' },
}

function Llamada({ l, id }: { l: ILlamadaSap; id: string }) {
  const abierta = l.metodo === 'POST' || (l.status !== undefined && l.status >= 400)
  return (
    <details open={abierta} style={{ margin: '0.25rem 0 0.5rem' }} data-testid={id}>
      <summary style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
        <b>{l.metodo}</b> {l.descripcion} — {l.status ? `HTTP ${l.status}` : 'sin enviar'}
      </summary>
      <div style={{ fontSize: '0.75rem', wordBreak: 'break-all', margin: '0.25rem 0' }}><b>URL:</b> {l.url}</div>
      {l.body !== undefined && <JsonCopiable titulo="JSON enviado a SAP" valor={l.body} data-testid={`${id}-enviado`} />}
      {l.status !== undefined && <JsonCopiable titulo="Respuesta de SAP" valor={l.respuesta} data-testid={`${id}-respuesta`} />}
    </details>
  )
}

export function FacturacionPedido(props: IEmitirFacturaParams) {
  const [resultado, setResultado] = useState<IEmitirFacturaResult | null>(null)
  const [cargando, setCargando] = useState(false)
  const [errorRed, setErrorRed] = useState<string | null>(null)
  const iniciado = useRef(false)

  const emitir = useCallback(async () => {
    setCargando(true)
    setErrorRed(null)
    try {
      setResultado(await emitirFacturaSap(props))
    } catch (err) {
      setErrorRed(err instanceof Error ? `Error de red al facturar: ${err.message}` : 'Error de red al facturar')
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.salesOrder, props.centro, props.tipoDocumento, props.tipoComprobante, props.canalDistribucion])

  // Se dispara una sola vez al aparecer (StrictMode monta dos veces en desarrollo)
  useEffect(() => {
    if (iniciado.current) return
    iniciado.current = true
    emitir()
  }, [emitir])

  const hayError = !!errorRed || (resultado ? !resultado.success : false)
  const modo = resultado?.modo

  return (
    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.5rem' }} data-testid="facturacion-pedido">
      <FlexBox justifyContent="SpaceBetween" alignItems="Center">
        <Title level="H5">Facturación del pedido (pedido → factura → folio)</Title>
        {resultado && !cargando && hayError && (
          <Button icon="refresh" onClick={emitir} data-testid="btn-reintentar-factura">Reintentar desde el paso pendiente</Button>
        )}
      </FlexBox>

      {modo && (modo.factura !== 'S' || modo.folio !== 'S') && (
        <MessageStrip design="Information" hideCloseButton data-testid="facturacion-modo">
          Modo de prueba: FACTURA_SAP_HABILITADO = {modo.factura} · FOLIO_SAP_HABILITADO = {modo.folio} · clase de factura {modo.claseFactura}.
          {modo.factura !== 'S' ? ' No se crea la factura: se muestra el JSON que se enviaría.' : ''}
          {modo.factura === 'S' && modo.folio !== 'S' ? ' Se crea la factura, pero no se pide el folio.' : ''}
        </MessageStrip>
      )}

      {cargando && (
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }} data-testid="facturacion-cargando">
          <BusyIndicator active size="S" />
          <span style={{ fontSize: '0.85rem' }}>Facturando en SAP… el folio puede tardar hasta 60 segundos.</span>
        </FlexBox>
      )}

      {errorRed && <MessageStrip design="Negative" hideCloseButton>{errorRed}</MessageStrip>}
      {resultado && !resultado.pasos && (
        <MessageStrip design="Negative" hideCloseButton data-testid="facturacion-rechazo">{resultado.message ?? 'No se pudo facturar el pedido'}</MessageStrip>
      )}

      {!cargando && resultado?.pasos?.map((p) => {
        const estado = ESTADOS[p.estado]
        return (
          <div
            key={p.paso}
            style={{ border: '1px solid var(--sapList_BorderColor, #e0e0e0)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}
            data-testid={`facturacion-paso-${p.paso}`}
          >
            <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
              <b>{p.paso}. {p.nombre}</b>
              <Tag colorScheme={estado.color} data-testid={`facturacion-paso-${p.paso}-estado`}>{estado.texto}</Tag>
            </FlexBox>
            <div style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{p.mensaje}</div>
            {p.llamadas.map((l, i) => <Llamada key={i} l={l} id={`facturacion-paso-${p.paso}-llamada-${i}`} />)}
          </div>
        )
      })}

      <PendientesFacturacion />
    </div>
  )
}
