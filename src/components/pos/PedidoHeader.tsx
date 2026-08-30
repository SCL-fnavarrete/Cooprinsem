import { useState, useEffect } from 'react'
import { Select, Option, Input, Label, FlexBox } from '@ui5/webcomponents-react'
import type { IPedidoHeader } from '@/types/pedido'
import type { ICliente } from '@/types/cliente'
import { ClienteSearch } from './ClienteSearch'
import { getCanalesDistribucion, getDocumentosVenta, getInterlocutoresPorCliente, type ICanalDistribucion, type IDocumentoVenta, type IInterlocutor } from '@/services/api/posMaestros'

interface PedidoHeaderProps {
  header: IPedidoHeader
  onHeaderChange: (partial: Partial<IPedidoHeader>) => void
  clienteSeleccionado: ICliente | null
  onClienteSeleccionado: (cliente: ICliente) => void
  onClienteDeseleccionado: () => void
  sucursal: string
  vendedor?: { id: string; nombre: string }
}

export function PedidoHeader({
  header,
  onHeaderChange,
  clienteSeleccionado,
  onClienteSeleccionado,
  onClienteDeseleccionado,
  sucursal,
  vendedor,
}: PedidoHeaderProps) {
  const [canales, setCanales] = useState<ICanalDistribucion[]>([])
  const [documentos, setDocumentos] = useState<IDocumentoVenta[]>([])
  const [interlocutores, setInterlocutores] = useState<IInterlocutor[]>([])

  useEffect(() => {
    getCanalesDistribucion().then(setCanales).catch(() => {})
    getDocumentosVenta().then(setDocumentos).catch(() => {})
  }, [])

  useEffect(() => {
    if (clienteSeleccionado) {
      getInterlocutoresPorCliente(clienteSeleccionado.codigoCliente)
        .then(setInterlocutores)
        .catch(() => setInterlocutores([]))
    } else {
      setInterlocutores([])
    }
  }, [clienteSeleccionado])

  return (
    <div data-testid="pedido-header" style={{ display: 'grid', gap: '0.75rem' }}>
      <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Label>Tipo Documento</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
              if (val) onHeaderChange({ tipoDocumento: val as any })
            }}
            aria-label="Tipo documento"
          >
            {documentos.map((d) => (
              <Option key={d.clase_documento} data-id={d.descripcion} selected={header.tipoDocumento === d.descripcion}>
                {d.descripcion}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Canal Distribución</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
              if (val) onHeaderChange({ canalDistribucion: val as any })
            }}
            aria-label="Canal distribución"
          >
            {canales.map((c) => (
              <Option key={c.codigo} data-id={c.descripcion} selected={header.canalDistribucion === c.descripcion}>
                {c.descripcion}
              </Option>
            ))}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <Label>O.C. Cliente (Referencia)</Label>
          <Input
            value={header.referencia}
            onInput={(e: { target: { value: string } }) =>
              onHeaderChange({ referencia: e.target.value })
            }
            placeholder="Nro. orden de compra (opcional)"
            aria-label="Referencia"
          />
        </div>
      </FlexBox>

      <div>
        <Label>Cliente</Label>
        <ClienteSearch
          onClienteSeleccionado={onClienteSeleccionado}
          onClienteDeseleccionado={onClienteDeseleccionado}
          sucursal={sucursal}
        />
      </div>

      <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Label>Destinatario Mercancía</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
              onHeaderChange({ destinatarioMercancia: val })
            }}
            aria-label="Destinatario mercancía"
          >
            <Option data-id="" selected={!header.destinatarioMercancia}>-- Seleccionar --</Option>
            {interlocutores.map((i) => (
              <Option key={`dest-${i.id}`} data-id={i.BPCustomerNumber} selected={header.destinatarioMercancia === i.BPCustomerNumber}>
                {i.BPCustomerNumber} — {i.PartnerFunction} {i.CustomerPartnerDescription}
              </Option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Quien Retira</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
              onHeaderChange({ quienRetira: val })
            }}
            aria-label="Quien retira"
          >
            <Option data-id="" selected={!header.quienRetira}>-- Seleccionar --</Option>
            {interlocutores.map((i) => (
              <Option key={`ret-${i.id}`} data-id={i.BPCustomerNumber} selected={header.quienRetira === i.BPCustomerNumber}>
                {i.BPCustomerNumber} — {i.PartnerFunction} {i.CustomerPartnerDescription}
              </Option>
            ))}
          </Select>
        </div>
      </FlexBox>

      {clienteSeleccionado && (
        <>
          <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <Label>Centro</Label>
              <Input value={sucursal} readonly aria-label="Centro" />
            </div>
            <div>
              <Label>Condición Pago</Label>
              <Input value={clienteSeleccionado.condicionPago} readonly aria-label="Condición de pago" />
            </div>
            {vendedor && (
              <div>
                <Label>Vendedor</Label>
                <Input value={`${vendedor.id} — ${vendedor.nombre}`} readonly aria-label="Vendedor" />
              </div>
            )}
          </FlexBox>

          <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <Label>Retira</Label>
              <Input value={header.retira} onInput={(e: { target: { value: string } }) => onHeaderChange({ retira: e.target.value })} placeholder="Código cliente que retira" aria-label="Retira" />
            </div>
            <div>
              <Label>Descuento %</Label>
              <Input value={String(header.descuentoPorcentaje || '')} onInput={(e: { target: { value: string } }) => onHeaderChange({ descuentoPorcentaje: Number(e.target.value) || 0 })} placeholder="0" type="Number" aria-label="Descuento porcentaje" />
            </div>
            <div>
              <Label>Patente</Label>
              <Input value={header.patente} onInput={(e: { target: { value: string } }) => onHeaderChange({ patente: e.target.value })} placeholder="Patente vehículo" aria-label="Patente" />
            </div>
            <div>
              <Label>Despacho</Label>
              <Input value={header.despacho} onInput={(e: { target: { value: string } }) => onHeaderChange({ despacho: e.target.value })} placeholder="Cond. expedición" aria-label="Despacho" />
            </div>
            <div>
              <Label>Recargo Flete</Label>
              <Input value={String(header.recargoFlete || '')} onInput={(e: { target: { value: string } }) => onHeaderChange({ recargoFlete: Number(e.target.value) || 0 })} placeholder="0" type="Number" aria-label="Recargo flete" />
            </div>
          </FlexBox>
        </>
      )}
    </div>
  )
}