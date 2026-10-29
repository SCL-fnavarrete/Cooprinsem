import { useState, useEffect } from 'react'
import { Select, Option, Input, Label, FlexBox, MessageStrip } from '@ui5/webcomponents-react'
import type { IPedidoHeader } from '@/types/pedido'
import type { ICliente } from '@/types/cliente'
import { ClienteSearch } from './ClienteSearch'
import { GrupoCampos } from './GrupoCampos'
import { estiloCampoGrupo } from './estilosGrupoCampos'
import { validarRUT } from '@/utils/validations'
import { formatRUT } from '@/utils/format'
import { porcentajeDesdeTexto, montoDesdeTexto } from '@/utils/numeros'
import {
  getCanalesDistribucion, getDocumentosVenta, getInterlocutoresPorCliente, codigosInterlocutor, interlocutoresUnicos, eleccionAutomatica,
  type ICanalDistribucion, type IDocumentoVenta, type IInterlocutor,
} from '@/services/api/posMaestros'
import type { IVendedorTerreno } from '@/services/api/sapPedidos'
import { comprobanteDeClase, clienteBoletaNoPermitido, esClienteBoleta, CLASE_VENTA_BOLETA } from '@/config/comprobante'

// Venta de combustible (ZV15, canal VT): solo para vendedores de terreno.
export const CLASE_COMBUSTIBLE = 'ZV15'
const CANAL_VENTA_TERRENO = 'VT'

interface PedidoHeaderProps {
  header: IPedidoHeader
  onHeaderChange: (partial: Partial<IPedidoHeader>) => void
  clienteSeleccionado: ICliente | null
  onClienteSeleccionado: (cliente: ICliente) => void
  onClienteDeseleccionado: () => void
  sucursal: string
  vendedor?: { id: string; nombre: string; idVendedor?: string }
  // Vendedor de terreno (canal VT) y su bodega móvil; null = no es (o no cargó)
  vendedorTerreno?: IVendedorTerreno | null
  // Cliente que llega ya elegido (Clientes > Crear Pedido) y su destinatario, si se eligió
  clienteInicial?: ICliente | null
  destinatarioPreferido?: string | null
}

export function PedidoHeader({
  header,
  onHeaderChange,
  clienteSeleccionado,
  onClienteSeleccionado,
  onClienteDeseleccionado,
  sucursal,
  vendedor,
  vendedorTerreno = null,
  clienteInicial = null,
  destinatarioPreferido = null,
}: PedidoHeaderProps) {
  const [canales, setCanales] = useState<ICanalDistribucion[]>([])
  const [documentos, setDocumentos] = useState<IDocumentoVenta[]>([])
  const [interlocutores, setInterlocutores] = useState<IInterlocutor[]>([])
  const [interlocutoresRetiro, setInterlocutoresRetiro] = useState<IInterlocutor[]>([])

  useEffect(() => {
    getCanalesDistribucion().then(setCanales).catch(() => {})
    getDocumentosVenta().then(setDocumentos).catch(() => {})
  }, [])

  // Destinatarios (SH) del cliente. Con uno solo (o el que viene de Clientes > Buscar)
  // queda elegido; con varios se elige a mano (29-10-2026). Al cambiar de cliente se
  // limpia el destinatario anterior: no corresponde al nuevo.
  useEffect(() => {
    if (!clienteSeleccionado) {
      setInterlocutores([])
      return
    }
    let vigente = true
    getInterlocutoresPorCliente(clienteSeleccionado.codigoCliente)
      .then((lista) => {
        if (!vigente) return
        setInterlocutores(lista)
        onHeaderChange({ destinatarioMercancia: eleccionAutomatica(codigosInterlocutor(lista, 'SH'), destinatarioPreferido) })
      })
      .catch(() => { if (vigente) setInterlocutores([]) })
    return () => { vigente = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSeleccionado])

  // "Quien Retira" se consulta contra los interlocutores del Destinatario
  // Mercancía elegido (no del cliente principal) — el destinatario puede
  // tener sus propios interlocutores registrados (quién retira en su nombre).
  // Se resetea la selección previa: un "quien retira" válido para un
  // destinatario anterior puede no existir para el nuevo.
  // Si el destinatario tiene una sola persona que retira (ZB), queda elegida.
  useEffect(() => {
    onHeaderChange({ quienRetira: '' })
    if (!header.destinatarioMercancia) {
      setInterlocutoresRetiro([])
      return
    }
    let vigente = true
    getInterlocutoresPorCliente(header.destinatarioMercancia)
      .then((lista) => {
        if (!vigente) return
        setInterlocutoresRetiro(lista)
        const unico = eleccionAutomatica(codigosInterlocutor(lista, 'ZB'))
        if (unico) onHeaderChange({ quienRetira: unico })
      })
      .catch(() => { if (vigente) setInterlocutoresRetiro([]) })
    return () => { vigente = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.destinatarioMercancia])

  // "Venta Combustible" y el canal VT solo se ofrecen a vendedores de terreno
  const esTerreno = !!vendedorTerreno?.esVendedorTerreno
  const documentosVisibles = documentos.filter((d) => esTerreno || d.clase_documento !== CLASE_COMBUSTIBLE)
  const canalesVisibles = canales.filter((c) => esTerreno || c.codigo !== CANAL_VENTA_TERRENO)
  const esCombustible = header.claseDocumento === CLASE_COMBUSTIBLE
  const comprobante = comprobanteDeClase(header.claseDocumento)

  // Cliente Boleta (999999): solo en ventas boleta. Al elegirlo con otro tipo, pasa a Venta Boleta.
  const seleccionarCliente = (cliente: ICliente) => {
    if (esClienteBoleta(cliente.codigoCliente) && comprobante !== 'Boleta') {
      const ventaBoleta = documentos.find((d) => d.clase_documento === CLASE_VENTA_BOLETA)
      onHeaderChange({ tipoDocumento: ventaBoleta?.descripcion ?? 'Venta Boleta', claseDocumento: CLASE_VENTA_BOLETA })
    }
    onClienteSeleccionado(cliente)
  }
  const canalTerreno = canales.find((c) => c.codigo === CANAL_VENTA_TERRENO)

  return (
    <div data-testid="pedido-header" style={{ display: 'grid', gap: '0.75rem' }}>
      {esCombustible && (
        <MessageStrip
          design={vendedorTerreno?.motivo ? 'Negative' : 'Information'}
          hideCloseButton
          data-testid="aviso-combustible"
        >
          {vendedorTerreno?.motivo
            ?? `Venta de combustible: canal Venta Terreno y bodega móvil ${vendedorTerreno?.bodegaMovil}. El stock que se muestra es el del centro; SAP confirma la cantidad contra la bodega móvil al simular.`}
        </MessageStrip>
      )}
      <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Label>Tipo Documento</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
              if (!val) return
              const doc = documentos.find((d) => d.descripcion === val)
              // Combustible: el canal pasa a Venta Terreno (el backend igual lo fuerza a VT)
              onHeaderChange({
                tipoDocumento: val,
                claseDocumento: doc?.clase_documento ?? '',
                ...(doc?.clase_documento === CLASE_COMBUSTIBLE && canalTerreno && { canalDistribucion: canalTerreno.descripcion }),
              })
            }}
            aria-label="Tipo documento"
          >
            {documentosVisibles.map((d) => (
              <Option key={d.clase_documento} data-id={d.descripcion} selected={header.tipoDocumento === d.descripcion}>
                {d.descripcion}
              </Option>
            ))}
          </Select>

          {/* Comprobante según la clase (22-10-2026): ZV01/ZV02 boleta; ZV04/06/07/15
              factura; el resto por definir (sin indicador). Reemplaza al select Boleta/Factura. */}
          {comprobante !== 'Por definir' && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }} data-testid="indicador-comprobante">
              Comprobante: <b>{comprobante}</b>
            </div>
          )}
        </div>

        <div>
          <Label>Canal Distribución</Label>
          <Select
            onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? ''
              if (val) onHeaderChange({ canalDistribucion: val })
            }}
            aria-label="Canal distribución"
            disabled={esCombustible}
          >
            {canalesVisibles.map((c) => (
              <Option key={c.codigo} data-id={c.descripcion} selected={header.canalDistribucion === c.descripcion}>
                {c.descripcion}
              </Option>
            ))}
          </Select>
        </div>

        {esCombustible && (
          <div data-testid="bodega-movil">
            <Label>Bodega móvil (SB)</Label>
            <Input value={vendedorTerreno?.bodegaMovil || 'Sin asignar'} readonly aria-label="Bodega móvil" />
          </div>
        )}

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
        {/* key: el cliente precargado llega después de montar; ClienteSearch lo toma al montar */}
        <ClienteSearch
          key={clienteInicial?.codigoCliente ?? 'sin-cliente-inicial'}
          clienteInicial={clienteInicial}
          onClienteSeleccionado={seleccionarCliente}
          onClienteDeseleccionado={onClienteDeseleccionado}
          sucursal={sucursal}
        />
      </div>

      {clienteSeleccionado && clienteBoletaNoPermitido(clienteSeleccionado.codigoCliente, header.claseDocumento) && (
        <MessageStrip design="Negative" hideCloseButton data-testid="aviso-cliente-boleta">
          El Cliente Boleta solo se usa en ventas boleta (Venta Boleta). Cambie el Tipo Documento o elija otro cliente para poder grabar.
        </MessageStrip>
      )}

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
                  {interlocutoresUnicos(interlocutores, 'SH').map((i) => (
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
                  {interlocutoresUnicos(interlocutoresRetiro, 'ZB').map((i) => (
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