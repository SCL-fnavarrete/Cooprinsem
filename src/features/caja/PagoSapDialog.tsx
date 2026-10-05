import { Dialog, Bar, Button, FlexBox, MessageStrip, Label, Title } from '@ui5/webcomponents-react'
import { formatCLP } from '@/utils/format'
import type { IPreviewPagoCtaCte, IResultadoPagoCtaCte } from '@/types/ctaCte'

// Modales del pago real de Pago Cta. Cte. en SAP (ZCOOP_JOURNALENTRY_SRV,
// variante 3): confirmación con el JSON a enviar y resultado con el JSON
// enviado y la respuesta de SAP (mismo criterio que Nuevo Pedido / Cotizar).

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

const estiloJson = {
  maxHeight: '30vh',
  overflow: 'auto',
  fontSize: '0.7rem',
  background: 'var(--sapList_Background)',
  padding: '0.5rem',
  borderRadius: '4px',
  margin: 0,
} as const

function BloqueJson({ titulo, valor, abierto = false }: { titulo: string; valor: unknown; abierto?: boolean }) {
  if (valor === undefined || valor === null) return null
  return (
    <details open={abierto}>
      <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>{titulo}</summary>
      <pre style={estiloJson}>{JSON.stringify(valor, null, 2)}</pre>
    </details>
  )
}

export function PagoSapDialog({ modo, preview, resultado, isProcesando, onConfirmar, onCerrar, onVolver, onImprimir }: PagoSapDialogProps) {
  if (!modo) return null
  const exito = modo === 'resultado' && !!resultado?.success

  return (
    <Dialog
      open
      headerText={modo === 'confirmar' ? 'Confirmar pago en SAP' : exito ? 'Pago contabilizado en SAP' : 'Pago no contabilizado'}
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
        {modo === 'confirmar' && preview && (
          <>
            <MessageStrip design="Critical" hideCloseButton>
              Se contabilizará en SAP un documento de cobro (clase DW, sin compensación) por{' '}
              <strong>{formatCLP(preview.total ?? 0)}</strong>. El folio de cobro (RefDocNo) se asigna al confirmar.
            </MessageStrip>
            {preview.url && <Label><b>URL:</b> POST {preview.url}</Label>}
            <BloqueJson titulo="JSON que se enviará" valor={preview.body} abierto />
          </>
        )}

        {modo === 'resultado' && resultado && (
          <>
            {exito ? (
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
            {exito && <Title level="H5">El cliente queda sin deuda en estas facturas; la compensación la realiza el equipo SAP.</Title>}
            {resultado.errordetails && resultado.errordetails.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {resultado.errordetails.map((d, i) => <li key={i}>{d.message}</li>)}
              </ul>
            )}
            {resultado.url && <Label><b>URL:</b> POST {resultado.url}</Label>}
            <BloqueJson titulo="JSON enviado" valor={resultado.body} />
            <BloqueJson titulo="JSON de respuesta de SAP" valor={resultado.success ? resultado.data : (resultado.detalle ?? { message: resultado.message })} abierto />
          </>
        )}
      </div>
    </Dialog>
  )
}
