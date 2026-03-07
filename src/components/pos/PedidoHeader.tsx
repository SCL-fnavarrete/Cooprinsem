import { Select, Option, Input, Label, FlexBox } from '@ui5/webcomponents-react'
import type { IPedidoHeader } from '@/types/pedido'
import type { ICliente } from '@/types/cliente'
import type { CanalDistribucion, TipoDocumentoVenta } from '@/config/sap'
import { CANALES_DISTRIBUCION, TIPOS_DOCUMENTO_VENTA } from '@/config/sap'
import { ClienteSearch } from './ClienteSearch'

interface PedidoHeaderProps {
  header: IPedidoHeader
  onHeaderChange: (partial: Partial<IPedidoHeader>) => void
  clienteSeleccionado: ICliente | null
  onClienteSeleccionado: (cliente: ICliente) => void
  onClienteDeseleccionado: () => void
  sucursal: string
}

export function PedidoHeader({
  header,
  onHeaderChange,
  clienteSeleccionado,
  onClienteSeleccionado,
  onClienteDeseleccionado,
  sucursal,
}: PedidoHeaderProps) {
  return (
    <div data-testid="pedido-header" style={{ display: 'grid', gap: '0.75rem' }}>
      <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Label>Canal Distribución</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.textContent ?? ''
              if (val) onHeaderChange({ canalDistribucion: val as CanalDistribucion })
            }}
            aria-label="Canal distribución"
          >
            {CANALES_DISTRIBUCION.map((c) => (
              <Option key={c} selected={header.canalDistribucion === c}>
                {c}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Tipo Documento</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.textContent ?? ''
              if (val) onHeaderChange({ tipoDocumento: val as TipoDocumentoVenta })
            }}
            aria-label="Tipo documento"
          >
            {TIPOS_DOCUMENTO_VENTA.map((t) => (
              <Option key={t} selected={header.tipoDocumento === t}>
                {t}
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

      {/* Campos de solo lectura */}
      {clienteSeleccionado && (
        <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <Label>Centro</Label>
            <Input value={sucursal} readonly aria-label="Centro" />
          </div>
          <div>
            <Label>Condición Pago</Label>
            <Input
              value={clienteSeleccionado.condicionPago}
              readonly
              aria-label="Condición de pago"
            />
          </div>
        </FlexBox>
      )}
    </div>
  )
}
