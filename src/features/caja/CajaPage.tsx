import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Title,
  FlexBox,
  Button,
  MessageStrip,
  Card,
  CardHeader,
  Label,
  MessageBox,
  Input,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/money-bills.js'
import '@ui5/webcomponents-icons/dist/credit-card.js'
import '@ui5/webcomponents-icons/dist/receipt.js'
import '@ui5/webcomponents-icons/dist/customer.js'
import '@ui5/webcomponents-icons/dist/account.js'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/bar-chart.js'
import '@ui5/webcomponents-icons/dist/log.js'
import '@ui5/webcomponents-icons/dist/decline.js'
import { ListPagaresPanel } from '@/features/caja/ListPagaresPanel'
import { AntClientePanel } from '@/features/caja/AntClientePanel'
import { ArqueoCajaPanel } from '@/features/caja/ArqueoCajaPanel'
import { ClienteSearch } from '@/components/pos/ClienteSearch'
import { CajaFacturaList } from '@/components/pos/CajaFacturaList'
import { PagoEfectivoModal } from '@/components/pos/PagoEfectivoModal'
import { useCaja } from '@/hooks/useCaja'
import { useUser } from '@/stores/userContext'
import { SUCURSALES, SAP_SOCIEDAD, CLIENTE_BOLETA } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'
import { formatCLP, formatFecha, formatFechaSAP } from '@/utils/format'
import type { IResultadoCobro } from '@/types/caja'
import { CLIENTES_MOCK } from '@/test/factories'

// Botones del menú de caja (8 funciones según PRD)
const MENU_CAJA = [
  { id: 'pago-cta-cte', label: 'Pago Cta. Cte.', icon: 'money-bills', habilitado: true },
  { id: 'egreso-caja', label: 'Egr. de Caja', icon: 'credit-card', habilitado: false },
  { id: 'list-pagares', label: 'List. Pagarés', icon: 'receipt', habilitado: true },
  { id: 'ant-cliente', label: 'Ant. Cliente', icon: 'customer', habilitado: true },
  { id: 'estado-cuenta', label: 'E° de Cuenta', icon: 'account', habilitado: false },
  { id: 'consulta-pago', label: 'Consulta Pago', icon: 'search', habilitado: false },
  { id: 'arqueo-caja', label: 'Arqueo Caja', icon: 'bar-chart', habilitado: true },
  { id: 'salir-caja', label: 'Salir de la Caja', icon: 'log', habilitado: true },
] as const

interface ComprobanteData {
  resultado: IResultadoCobro
  clienteNombre: string
  clienteRut: string
  documentosCancelados: string[]
  montoRecibido: number
  vuelto: number
  fecha: string
  hora: string
}

// Mapa kunnr → nombre para mostrar en la tabla
const CLIENTE_NOMBRES_MAP: Record<string, string> = {}
for (const c of CLIENTES_MOCK) {
  CLIENTE_NOMBRES_MAP[c.codigoCliente] = c.nombre
}

export function CajaPage() {
  const { usuario } = useUser()
  const navigate = useNavigate()
  const sucursal = usuario?.sucursal ?? 'D190'
  const [moduloActivo, setModuloActivo] = useState('pago-cta-cte')
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [comprobante, setComprobante] = useState<ComprobanteData | null>(null)
  const [showErrorMsg, setShowErrorMsg] = useState(false)
  const [showSalirConfirm, setShowSalirConfirm] = useState(false)
  const [filtroInput, setFiltroInput] = useState('')

  const {
    clienteSeleccionado,
    clienteDerivado,
    seleccionarCliente,
    deseleccionarCliente,
    filtrarPorTexto,
    partidas,
    isLoadingPartidas,
    errorPartidas,
    partidasSeleccionadas,
    togglePartida,
    totalSeleccionado,
    confirmarCobroEfectivo,
    isCobrando,
    errorCobro,
    resetear,
  } = useCaja()

  // ¿Hay un filtro activo (cliente o texto)?
  const hayFiltroActivo = !!clienteSeleccionado || filtroInput.trim().length > 0

  // Determinar si mostrar columna Cliente (cuando no hay cliente seleccionado)
  const mostrarColumnaCliente = !clienteSeleccionado

  // Mapa de nombres de clientes (incluye los del mock)
  const clienteNombres = useMemo(() => CLIENTE_NOMBRES_MAP, [])

  const handleFiltroChange = useCallback((e: CustomEvent) => {
    const value = (e.target as HTMLInputElement).value ?? ''
    setFiltroInput(value)
    filtrarPorTexto(value)
  }, [filtrarPorTexto])

  const handleLimpiarFiltro = useCallback(() => {
    setFiltroInput('')
    deseleccionarCliente()
  }, [deseleccionarCliente])

  const handleClienteBoletaClick = useCallback(() => {
    const boleta = CLIENTES_MOCK.find((c) => c.codigoCliente === CLIENTE_BOLETA)
    if (boleta) {
      seleccionarCliente(boleta)
      setFiltroInput('')
    }
  }, [seleccionarCliente])

  // Cliente para cobro: prioridad al seleccionado manualmente, luego derivado de partidas
  const esMultipleClientes = clienteDerivado === 'MULTIPLE'
  const clienteParaCobro = useMemo(() => {
    if (clienteSeleccionado) return clienteSeleccionado
    if (!clienteDerivado || clienteDerivado === 'MULTIPLE') return null
    const found = CLIENTES_MOCK.find(c => c.codigoCliente === clienteDerivado.kunnr)
    if (found) return found
    // Fallback: crear ICliente minimal con el kunnr
    return {
      codigoCliente: clienteDerivado.kunnr,
      nombre: CLIENTE_NOMBRES_MAP[clienteDerivado.kunnr] ?? clienteDerivado.kunnr,
      rut: '',
      condicionPago: '',
      estadoCredito: 'AL_DIA' as const,
      creditoAsignado: 0,
      creditoUtilizado: 0,
      porcentajeAgotamiento: 0,
      sucursal,
    }
  }, [clienteSeleccionado, clienteDerivado, sucursal])

  const canCobrar = !!clienteParaCobro && !esMultipleClientes && partidasSeleccionadas.length > 0 && totalSeleccionado > 0

  const handleConfirmarCobro = useCallback(async (montoRecibido: number) => {
    try {
      const resultado = await confirmarCobroEfectivo(montoRecibido)
      const ahora = new Date()
      setComprobante({
        resultado,
        clienteNombre: clienteParaCobro?.nombre ?? '',
        clienteRut: clienteParaCobro?.rut ?? '',
        documentosCancelados: [...partidasSeleccionadas],
        montoRecibido,
        vuelto: montoRecibido - totalSeleccionado,
        fecha: formatFecha(formatFechaSAP(ahora)),
        hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      })
      setShowPagoModal(false)
    } catch {
      setShowPagoModal(false)
      setShowErrorMsg(true)
    }
  }, [confirmarCobroEfectivo, clienteParaCobro, partidasSeleccionadas, totalSeleccionado])

  const handleNuevoCobro = useCallback(() => {
    setComprobante(null)
    setFiltroInput('')
    resetear()
  }, [resetear])

  const handleImprimir = useCallback(() => {
    window.print()
  }, [])

  // Confirmación de salida de caja
  const handleSalirClick = useCallback(() => {
    setShowSalirConfirm(true)
  }, [])

  const handleSalirConfirm = useCallback((action: string | undefined) => {
    setShowSalirConfirm(false)
    if (action === 'OK') {
      resetear()
      navigate('/home')
    }
  }, [resetear, navigate])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Menú lateral */}
      <nav
        style={{
          width: '200px',
          borderRight: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)',
          padding: '1rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
        aria-label="Menú de Caja"
      >
        {MENU_CAJA.map((item) => (
          <Button
            key={item.id}
            icon={item.icon}
            design={moduloActivo === item.id && item.habilitado ? 'Emphasized' : 'Default'}
            disabled={!item.habilitado}
            onClick={() => {
              if (!item.habilitado) return
              if (item.id === 'salir-caja') {
                handleSalirClick()
              } else {
                setModuloActivo(item.id)
              }
            }}
            style={{ width: '100%', justifyContent: 'flex-start' }}
            tooltip={item.habilitado ? undefined : 'Próximamente'}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Contenido principal */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
        {/* Panel info usuario/sucursal/sociedad */}
        <Card
          header={<CardHeader titleText="Sesión de Caja" />}
          style={{ marginBottom: '1rem' }}
        >
          <FlexBox style={{ padding: '0.75rem 1rem', gap: '2rem' }} wrap="Wrap">
            <FlexBox direction="Column" style={{ gap: '0.15rem' }}>
              <Label style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>Usuario</Label>
              <Label>{usuario?.id} — {usuario?.nombre}</Label>
            </FlexBox>
            <FlexBox direction="Column" style={{ gap: '0.15rem' }}>
              <Label style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>Sucursal</Label>
              <Label>{usuario?.sucursal} — {SUCURSALES[usuario?.sucursal as CodigoSucursal] ?? usuario?.sucursal}</Label>
            </FlexBox>
            <FlexBox direction="Column" style={{ gap: '0.15rem' }}>
              <Label style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>Sociedad</Label>
              <Label>{SAP_SOCIEDAD} — COOPRINSEM LTDA.</Label>
            </FlexBox>
          </FlexBox>
        </Card>

        {moduloActivo === 'pago-cta-cte' && !comprobante && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <Title level="H3">Pago Cuenta Corriente — Cobro Efectivo</Title>

            {/* Barra de filtro: buscador de cliente + filtro texto + botón limpiar */}
            <FlexBox style={{ gap: '0.75rem', alignItems: 'flex-end' }} wrap="Wrap">
              <div style={{ flex: '1 1 300px' }}>
                <ClienteSearch
                  onClienteSeleccionado={(cliente) => {
                    seleccionarCliente(cliente)
                    setFiltroInput('')
                  }}
                  onClienteDeseleccionado={deseleccionarCliente}
                  sucursal={sucursal}
                />
              </div>
              <Input
                placeholder="Filtrar por Nº Doc o código cliente..."
                value={filtroInput}
                onInput={handleFiltroChange}
                disabled={!!clienteSeleccionado}
                style={{ flex: '0 1 250px' }}
                data-testid="filtro-partidas"
              />
              {hayFiltroActivo && (
                <Button
                  icon="decline"
                  design="Transparent"
                  onClick={handleLimpiarFiltro}
                  tooltip="Limpiar filtro"
                  data-testid="limpiar-filtro"
                >
                  Limpiar
                </Button>
              )}
              <Button
                design="Default"
                icon="customer"
                onClick={handleClienteBoletaClick}
                data-testid="btn-cliente-boleta"
              >
                Cliente Boleta
              </Button>
            </FlexBox>

            {/* Info filtro activo */}
            {clienteSeleccionado && (
              <MessageStrip design="Information" hideCloseButton>
                Mostrando partidas de: {clienteSeleccionado.nombre} ({clienteSeleccionado.codigoCliente})
              </MessageStrip>
            )}

            {/* Error cargando partidas */}
            {errorPartidas && (
              <MessageStrip design="Negative">{errorPartidas}</MessageStrip>
            )}

            {/* Grilla de partidas — siempre visible */}
            <CajaFacturaList
              partidas={partidas}
              partidasSeleccionadas={partidasSeleccionadas}
              onTogglePartida={togglePartida}
              isLoading={isLoadingPartidas}
              mostrarColumnaCliente={mostrarColumnaCliente}
              clienteNombres={clienteNombres}
            />

            {/* Botón cobrar — visible cuando hay partidas seleccionadas */}
            {partidasSeleccionadas.length > 0 && (
              <FlexBox justifyContent="End">
                <Button
                  design="Emphasized"
                  icon="money-bills"
                  onClick={() => setShowPagoModal(true)}
                  disabled={!canCobrar}
                >
                  Cobrar en Efectivo
                </Button>
              </FlexBox>
            )}

            {/* Info: cliente derivado automáticamente de partidas */}
            {!clienteSeleccionado && clienteParaCobro && partidasSeleccionadas.length > 0 && (
              <MessageStrip design="Information" hideCloseButton>
                {partidasSeleccionadas.length} documento(s) seleccionado(s) — Cliente: {clienteParaCobro.nombre} — Total: {formatCLP(totalSeleccionado)}
              </MessageStrip>
            )}

            {/* Warning: partidas de múltiples clientes */}
            {esMultipleClientes && (
              <MessageStrip design="Critical" hideCloseButton>
                Solo puedes cobrar documentos de un cliente a la vez
              </MessageStrip>
            )}

            {/* Modal de pago */}
            {clienteParaCobro && (
              <PagoEfectivoModal
                open={showPagoModal}
                totalACobrar={totalSeleccionado}
                cliente={clienteParaCobro}
                documentosSeleccionados={partidasSeleccionadas}
                onConfirmar={handleConfirmarCobro}
                onCancelar={() => setShowPagoModal(false)}
                isCobrando={isCobrando}
              />
            )}
          </div>
        )}

        {/* Comprobante de cobro */}
        {comprobante && (
          <div data-testid="comprobante-cobro" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <Card
              header={
                <CardHeader
                  titleText="Comprobante de Cobro"
                  subtitleText={`Documento SAP: ${comprobante.resultado.BELNR} — Clase ${comprobante.resultado.BLART}`}
                />
              }
            >
              <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <MessageStrip design="Positive" hideCloseButton>
                  Cobro registrado exitosamente
                </MessageStrip>

                <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
                  <Label style={{ fontWeight: 'bold' }}>N° Documento SAP</Label>
                  <Title level="H4">{comprobante.resultado.BELNR}</Title>
                </FlexBox>

                <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
                  <Label>Cliente: {comprobante.clienteNombre}</Label>
                  {comprobante.clienteRut && <Label>RUT: {comprobante.clienteRut}</Label>}
                </FlexBox>

                <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
                  <Label style={{ fontWeight: 'bold' }}>Documentos cancelados</Label>
                  {comprobante.documentosCancelados.map((doc) => (
                    <Label key={doc}>• {doc}</Label>
                  ))}
                </FlexBox>

                <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
                  <Label>Monto cobrado: {formatCLP(comprobante.resultado.monto)}</Label>
                  <Label>Efectivo recibido: {formatCLP(comprobante.montoRecibido)}</Label>
                  <Label style={{ fontWeight: 'bold' }}>
                    Vuelto entregado: {formatCLP(comprobante.vuelto)}
                  </Label>
                </FlexBox>

                <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
                  <Label>Fecha: {comprobante.fecha}</Label>
                  <Label>Hora: {comprobante.hora}</Label>
                </FlexBox>

                <FlexBox style={{ gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <Button design="Default" icon="print" onClick={handleImprimir}>
                    Imprimir
                  </Button>
                  <Button design="Emphasized" onClick={handleNuevoCobro}>
                    Nuevo Cobro
                  </Button>
                </FlexBox>
              </div>
            </Card>
          </div>
        )}

        {/* Listado de Pagarés */}
        {moduloActivo === 'list-pagares' && <ListPagaresPanel />}

        {/* Anticipo de Cliente */}
        {moduloActivo === 'ant-cliente' && <AntClientePanel />}

        {/* Arqueo de Caja */}
        {moduloActivo === 'arqueo-caja' && <ArqueoCajaPanel />}

        {/* Error de cobro */}
        {showErrorMsg && errorCobro && (
          <MessageBox
            type="Error"
            open
            onClose={() => setShowErrorMsg(false)}
          >
            {errorCobro}
          </MessageBox>
        )}

        {/* Confirmación salir de caja */}
        {showSalirConfirm && (
          <MessageBox
            type="Confirm"
            open
            onClose={handleSalirConfirm}
          >
            ¿Desea salir de la Caja? Se perderán los datos no guardados.
          </MessageBox>
        )}
      </main>
    </div>
  )
}
