import { Dialog, Bar, Button, FlexBox, MessageStrip, Label, Title } from '@ui5/webcomponents-react'
import { formatCLP } from '@/utils/format'
import { JsonCopiable } from '@/components/common/JsonCopiable'
import type { IPreviewPagoCtaCte, IResultadoPagoCtaCte } from '@/types/ctaCte'
import { useModoTecnico } from '@/hooks/useModoTecnico'
import { SoloModoTecnico } from '@/components/common/SoloModoTecnico'

// Modales del pago real de Pago Cta. Cte. en SAP (ZCOOP_PAYMENT_SRV: pago y
// compensación de las facturas): confirmación con el JSON a enviar y resultado
// con el JSON enviado y la respuesta de SAP (mismo criterio que Nuevo Pedido / Cotizar).

interface PagoSapDialogProps {
  modo: 'confirmar' | 'resultado' | null
  preview: IPreviewPagoCtaCte | null
  resultado: IResultadoPagoCtaCte | null
  isProcesando: boolean
  onConfirmar: () => void
  onCerrar: () => void
  onVolver: () => void
  onImprimir: () => void
}

// JSON con botón Copiar (para compartir con Arquitectura), plegable.
function BloqueJson({ titulo, valor, abierto = false }: { titulo: string; valor: unknown; abierto?: boolean }) {
  const modoTecnico = useModoTecnico()
  if (!modoTecnico || valor === undefined || valor === null) return null
  return (
    <details open={abierto}>
      <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>{titulo}</summary>
      <div style={{ marginTop: '0.25rem' }}><JsonCopiable titulo="" valor={valor} data-testid={`json-${titulo.replace(/\W+/g, '-').toLowerCase()}`} /></div>
    </details>
  )
}

export function PagoSapDialog({ modo, preview, resultado, isProcesando, onConfirmar, onCerrar, onVolver, onImprimir }: PagoSapDialogProps) {
  if (!modo) return null
  const exito = modo === 'resultado' && !!resultado?.success
  const soloJson = modo === 'resultado' && !!resultado?.soloJson

  return (
    <Dialog
      open
      headerText={modo === 'confirmar' ? 'Confirmar pago en SAP' : exito ? 'Pago contabilizado en SAP' : soloJson ? 'Pago parcial — solo JSON (no enviado)' : 'Pago no contabilizado'}
      style={{ width: '720px', maxHeight: '85vh' }}
      onClose={onCerrar}
      data-testid="pago-sap-dialog"
      footer={
        <Bar
          endContent={
            <FlexBox style={{ gap: '0.5rem' }}>
              {modo === 'confirmar' && (
                <>
                  <Button design="Transparent" onClick={onCerrar} disabled={isProcesando}>Cancelar</Button>
                  <Button design="Emphasized" onClick={onConfirmar} disabled={isProcesando} data-testid="btn-confirmar-pago-sap">
                    {isProcesando ? 'Contabilizando…' : 'Confirmar y contabilizar'}
                  </Button>
                </>
              )}
              {modo === 'resultado' && exito && (
                <>
                  <Button design="Transparent" icon="print" onClick={onImprimir}>Imprimir</Button>
                  <Button design="Emphasized" onClick={onVolver} data-testid="btn-volver-ctacte">Volver a Pago Cta. Cte.</Button>
                </>
              )}
              {modo === 'resultado' && !exito && (
                <Button design="Emphasized" onClick={onCerrar}>Cerrar</Button>
              )}
            </FlexBox>
          }
        />
      }
    >
      <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
        {modo === 'confirmar' && preview?.pagoParcial && (
          <>
            <MessageStrip design="Critical" hideCloseButton data-testid="confirmar-pago-parcial">
              Pago parcial (residual): se contabilizará en SAP un cobro de <strong>{formatCLP(preview.montoCobrado ?? 0)}</strong>{' '}
              sobre la factura de <strong>{formatCLP(preview.total ?? 0)}</strong>. La factura se compensa y queda una partida pendiente
              de <strong>{formatCLP(preview.saldoPendiente ?? 0)}</strong> con su vencimiento original. No se puede deshacer desde el POS.
            </MessageStrip>
            {preview.habilitado === false && (
              <MessageStrip design="Information" hideCloseButton data-testid="pago-parcial-solo-json">
                PAGO_RESIDUAL_HABILITADO = N: al confirmar NO se envía a SAP, solo se muestra el JSON.
              </MessageStrip>
            )}
            <SoloModoTecnico>{preview.url && <Label><b>URL:</b> POST {preview.url}</Label>}</SoloModoTecnico>
            <BloqueJson titulo="JSON que se enviará" valor={preview.body} abierto />
          </>
        )}

        {modo === 'confirmar' && preview && !preview.pagoParcial && (
          <>
            <MessageStrip design="Critical" hideCloseButton>
              Se contabilizará en SAP un documento de cobro (clase DW) por{' '}
              <strong>{formatCLP((preview.total ?? 0) + (preview.saldoFavor ?? 0))}</strong> que compensa las facturas seleccionadas
              {preview.saldoFavor ? <> y deja <strong>{formatCLP(preview.saldoFavor)}</strong> como saldo a favor del cliente</> : null}.
              No se puede deshacer desde el POS. El folio de cobro (RefDocNo) se asigna al confirmar.
            </MessageStrip>
            <SoloModoTecnico>{preview.url && <Label><b>URL:</b> POST {preview.url}</Label>}</SoloModoTecnico>
            <BloqueJson titulo="JSON que se enviará" valor={preview.body} abierto />
          </>
        )}

        {modo === 'resultado' && resultado && (
          <>
            {soloJson ? (
              <MessageStrip design="Information" hideCloseButton data-testid="pago-sap-solo-json">
                {resultado.message}
              </MessageStrip>
            ) : exito ? (
              <MessageStrip design="Positive" hideCloseButton data-testid="pago-sap-exito">
                Pago contabilizado en SAP — Documento N° <strong>{resultado.acDocNo || '—'}</strong>
                {resultado.refDocNo && <> · Folio de cobro {resultado.refDocNo}</>}
              </MessageStrip>
            ) : (
              <MessageStrip design="Negative" hideCloseButton data-testid="pago-sap-error">
                {resultado.message ?? 'SAP rechazó el pago'}
              </MessageStrip>
            )}
            {resultado.recuperado && (
              <MessageStrip design="Information" hideCloseButton>
                {resultado.message}
              </MessageStrip>
            )}
            {resultado.incierto && (
              <MessageStrip design="Critical" hideCloseButton>
                No reintente el cobro sin revisar antes las partidas del cliente en Pago Cta. Cte.
              </MessageStrip>
            )}
            {exito && !resultado.pagoParcial && <Title level="H5">Las facturas quedan compensadas en SAP: el cliente queda sin deuda en ellas.</Title>}
            {exito && resultado.pagoParcial && (
              <MessageStrip design="Information" hideCloseButton data-testid="pago-sap-residual">
                La factura queda compensada y el cliente mantiene una partida pendiente de <strong>{formatCLP(resultado.saldoPendiente ?? 0)}</strong>.
              </MessageStrip>
            )}
            {exito && !!resultado.saldoFavor && (
              <MessageStrip design="Information" hideCloseButton data-testid="pago-sap-saldo-favor">
                Saldo a favor del cliente: <strong>{formatCLP(resultado.saldoFavor)}</strong> (queda como partida abierta al haber).
              </MessageStrip>
            )}
            {resultado.errordetails && resultado.errordetails.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {resultado.errordetails.map((d, i) => <li key={i}>{d.message}</li>)}
              </ul>
            )}
            <SoloModoTecnico>{resultado.url && <Label><b>URL:</b> POST {resultado.url}</Label>}</SoloModoTecnico>
            <BloqueJson titulo="JSON enviado" valor={resultado.body} abierto={soloJson} />
            {!soloJson && <BloqueJson titulo="JSON de respuesta de SAP" valor={resultado.success ? resultado.data : (resultado.detalle ?? { message: resultado.message })} abierto />}
          </>
        )}
      </div>
    </Dialog>
  )
}
