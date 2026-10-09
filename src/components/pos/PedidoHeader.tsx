import { useState, useEffect } from 'react'
import { Select, Option, Input, Label, FlexBox } from '@ui5/webcomponents-react'
import type { IPedidoHeader } from '@/types/pedido'
import type { ICliente } from '@/types/cliente'
import { ClienteSearch } from './ClienteSearch'
import { GrupoCampos } from './GrupoCampos'
import { estiloCampoGrupo } from './estilosGrupoCampos'
import { validarRUT } from '@/utils/validations'
import { formatRUT } from '@/utils/format'
import { porcentajeDesdeTexto, montoDesdeTexto } from '@/utils/numeros'
import { getCanalesDistribucion, getDocumentosVenta, getInterlocutoresPorCliente, type ICanalDistribucion, type IDocumentoVenta, type IInterlocutor } from '@/services/api/posMaestros'

interface PedidoHeaderProps {
  header: IPedidoHeader
  onHeaderChange: (partial: Partial<IPedidoHeader>) => void
  clienteSeleccionado: ICliente | null
  onClienteSeleccionado: (cliente: ICliente) => void
  onClienteDeseleccionado: () => void
  sucursal: string
  vendedor?: { id: string; nombre: string; idVendedor?: string }
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
  const [interlocutoresRetiro, setInterlocutoresRetiro] = useState<IInterlocutor[]>([])

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

  // "Quien Retira" se consulta contra los interlocutores del Destinatario
  // Mercancía elegido (no del cliente principal) — el destinatario puede
  // tener sus propios interlocutores registrados (quién retira en su nombre).
  // Se resetea la selección previa: un "quien retira" válido para un
  // destinatario anterior puede no existir para el nuevo.
  useEffect(() => {
    onHeaderChange({ quienRetira: '' })
    if (header.destinatarioMercancia) {
      getInterlocutoresPorCliente(header.destinatarioMercancia)
        .then(setInterlocutoresRetiro)
        .catch(() => setInterlocutoresRetiro([]))
    } else {
      setInterlocutoresRetiro([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.destinatarioMercancia])

  return (
    <div data-testid="pedido-header" style={{ display: 'grid', gap: '0.75rem' }}>
      <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Label>Tipo Documento</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
              if (val) onHeaderChange({ tipoDocumento: val })
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
              if (val) onHeaderChange({ canalDistribucion: val })
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

      {clienteSeleccionado && (
        <>
          {/* Datos Generales, Descuentos y recargos y Transporte: tres cajas en una
              fila (solo con cliente seleccionado: todo depende del cliente). */}
          <FlexBox alignItems="Start" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <GrupoCampos titulo="Datos Generales" data-testid="grupo-datos-generales">
              <div style={estiloCampoGrupo}>
                <Label>Destinatario Mercancía</Label>
                <Select
                  onChange={(e) => {
                    const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
                    onHeaderChange({ destinatarioMercancia: val })
                  }}
                  style={{ width: '100%' }}
                  aria-label="Destinatario mercancía"
                >
                  <Option data-id="" selected={!header.destinatarioMercancia}>-- Seleccionar --</Option>
                  {interlocutores.filter((i) => i.PartnerFunction === 'SH').map((i) => (
                    <Option key={`dest-${i.id}`} data-id={i.BPCustomerNumber} selected={header.destinatarioMercancia === i.BPCustomerNumber}>
                      {i.BPCustomerNumber} - {i.CustomerName || '(sin nombre)'} - {i.PartnerFunction}
                    </Option>
                  ))}
                </Select>
              </div>
              <div style={estiloCampoGrupo}>
                <Label>Quien Retira</Label>
                {/* Solo interlocutores ZB del destinatario. Opcional: si se elige, se
                    envía a SAP como interlocutor ZB; si no, SAP pone el del destinatario. */}
                <Select
                  onChange={(e) => {
                    const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
                    onHeaderChange({ quienRetira: val })
                  }}
                  style={{ width: '100%' }}
                  aria-label="Quien retira"
                  disabled={!header.destinatarioMercancia}
                >
                  <Option data-id="" selected={!header.quienRetira}>-- Sin quien retira --</Option>
                  {interlocutoresRetiro.filter((i) => i.PartnerFunction === 'ZB').map((i) => (
                    <Option key={`ret-${i.id}`} data-id={i.BPCustomerNumber} selected={header.quienRetira === i.BPCustomerNumber}>
                      {i.BPCustomerNumber} - {i.CustomerName || '(sin nombre)'} - {i.PartnerFunction}
                    </Option>
                  ))}
                </Select>
              </div>
              <div style={estiloCampoGrupo}>
                <Label>Centro</Label>
                <Input value={sucursal} readonly style={{ width: '100%' }} aria-label="Centro" />
              </div>
              <div style={estiloCampoGrupo}>
                <Label>Condición Pago</Label>
                <Input value={clienteSeleccionado.condicionPago} readonly style={{ width: '100%' }} aria-label="Condición de pago" />
              </div>
              {vendedor && (
                <div style={estiloCampoGrupo}>
                  <Label>ID Vendedor</Label>
                  <Input value={vendedor.idVendedor || '(no configurado)'} readonly style={{ width: '100%' }} aria-label="ID Vendedor" />
                </div>
              )}
            </GrupoCampos>

            {/* Descuentos y recargos de cabecera */}
            <GrupoCampos titulo="Descuentos y recargos" data-testid="grupo-descuentos-recargos">
              <div style={estiloCampoGrupo}>
                <Label>Descuento %</Label>
                {/* ZD02 de cabecera: solo números enteros 0-100. El precio lo recalcula SAP. */}
                <Input
                  value={header.descuentoPorcentaje ? String(header.descuentoPorcentaje) : ''}
                  onInput={(e: { target: { value: string } }) => {
                    const valor = porcentajeDesdeTexto(e.target.value)
                    e.target.value = valor ? String(valor) : ''
                    onHeaderChange({ descuentoPorcentaje: valor })
                  }}
                  placeholder="0"
                  style={{ width: '100%' }}
                  aria-label="Descuento porcentaje"
                />
              </div>
              <div style={estiloCampoGrupo}>
                <Label>Despacho</Label>
                <Input value={header.despacho} onInput={(e: { target: { value: string } }) => onHeaderChange({ despacho: e.target.value })} placeholder="Cond. expedición" style={{ width: '100%' }} aria-label="Despacho" />
              </div>
              <div style={estiloCampoGrupo}>
                <Label>Recargo Flete</Label>
                {/* ZFEM: monto CLP entero. El precio lo recalcula SAP. */}
                <Input
                  value={header.recargoFlete ? String(header.recargoFlete) : ''}
                  onInput={(e: { target: { value: string } }) => {
                    const valor = montoDesdeTexto(e.target.value)
                    e.target.value = valor ? String(valor) : ''
                    onHeaderChange({ recargoFlete: valor })
                  }}
                  placeholder="0 (CLP)"
                  style={{ width: '100%' }}
                  aria-label="Recargo flete"
                />
              </div>
            </GrupoCampos>

            {/* Transporte (PE-26): se envían a SAP como textos de cabecera Z082 / Z087 / Z088 */}
            <GrupoCampos titulo="Transporte" data-testid="grupo-transporte">
              <div style={estiloCampoGrupo}>
                <Label>Patente</Label>
                <Input
                  value={header.patente}
                  onInput={(e: { target: { value: string } }) => onHeaderChange({ patente: e.target.value.toUpperCase() })}
                  placeholder="Ej: AB-CD-12"
                  style={{ width: '100%' }}
                  aria-label="Patente"
                />
              </div>
              <div style={estiloCampoGrupo}>
                <Label>Nombre Conductor</Label>
                <Input
                  value={header.nombreConductor}
                  onInput={(e: { target: { value: string } }) => onHeaderChange({ nombreConductor: e.target.value })}
                  placeholder="Nombre completo"
                  style={{ width: '100%' }}
                  aria-label="Nombre conductor"
                />
              </div>
              <div style={estiloCampoGrupo}>
                <Label>Rut Conductor</Label>
                <Input
                  value={header.rutConductor}
                  onInput={(e: { target: { value: string } }) => onHeaderChange({ rutConductor: e.target.value })}
                  // Al salir del campo (o Enter), un RUT válido queda con formato 12.345.678-9
                  onChange={(e: { target: { value: string } }) => {
                    const valor = e.target.value.trim()
                    if (valor && validarRUT(valor)) onHeaderChange({ rutConductor: formatRUT(valor) })
                  }}
                  valueState={header.rutConductor.trim() && !validarRUT(header.rutConductor) ? 'Negative' : 'None'}
                  valueStateMessage={<span>RUT inválido</span>}
                  placeholder="12.345.678-9"
                  style={{ width: '100%' }}
                  aria-label="Rut conductor"
                />
              </div>
            </GrupoCampos>
          </FlexBox>
        </>
      )}
    </div>
  )
}