import { useState, useCallback } from 'react'
import {
  Title,
  FlexBox,
  Button,
  MessageStrip,
  Card,
  CardHeader,
  Label,
  MessageBox,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/money-bills.js'
import '@ui5/webcomponents-icons/dist/credit-card.js'
import '@ui5/webcomponents-icons/dist/receipt.js'
import '@ui5/webcomponents-icons/dist/customer.js'
import '@ui5/webcomponents-icons/dist/account.js'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/bar-chart.js'
import '@ui5/webcomponents-icons/dist/log.js'
import { ClienteSearch } from '@/components/pos/ClienteSearch'
import { CajaFacturaList } from '@/components/pos/CajaFacturaList'
import { PagoEfectivoModal } from '@/components/pos/PagoEfectivoModal'
import { useCaja } from '@/hooks/useCaja'
import { useUser } from '@/stores/userContext'
import { formatCLP, formatFecha, formatFechaSAP } from '@/utils/format'
import type { IResultadoCobro } from '@/types/caja'

// Botones del menú de caja (8 funciones según PRD)
const MENU_CAJA = [
  { id: 'pago-cta-cte', label: 'Pago Cta. Cte.', icon: 'money-bills', habilitado: true },
  { id: 'egreso-caja', label: 'Egr. de Caja', icon: 'credit-card', habilitado: false },
  { id: 'list-pagares', label: 'List. Pagarés', icon: 'receipt', habilitado: false },
  { id: 'ant-cliente', label: 'Ant. Cliente', icon: 'customer', habilitado: false },
  { id: 'estado-cuenta', label: 'E° de Cuenta', icon: 'account', habilitado: false },
  { id: 'consulta-pago', label: 'Consulta Pago', icon: 'search', habilitado: false },
  { id: 'arqueo-caja', label: 'Arqueo Caja', icon: 'bar-chart', habilitado: false },
  { id: 'salir-caja', label: 'Salir de la Caja', icon: 'log', habilitado: false },
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

export function CajaPage() {
  const { usuario } = useUser()
  const sucursal = usuario?.sucursal ?? 'D190'
  const [moduloActivo, setModuloActivo] = useState('pago-cta-cte')
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [comprobante, setComprobante] = useState<ComprobanteData | null>(null)
  const [showErrorMsg, setShowErrorMsg] = useState(false)

  const {
    clienteSeleccionado,
    seleccionarCliente,
    deseleccionarCliente,
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

  const handleConfirmarCobro = useCallback(async (montoRecibido: number) => {
    try {
      const resultado = await confirmarCobroEfectivo(montoRecibido)
      const ahora = new Date()
      setComprobante({
        resultado,
        clienteNombre: clienteSeleccionado!.nombre,
        clienteRut: clienteSeleccionado!.rut,
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
  }, [confirmarCobroEfectivo, clienteSeleccionado, partidasSeleccionadas, totalSeleccionado])

  const handleNuevoCobro = useCallback(() => {
    setComprobante(null)
    resetear()
  }, [resetear])

  const handleImprimir = useCallback(() => {
    window.print()
  }, [])

  const canCobrar = partidasSeleccionadas.length > 0 && totalSeleccionado > 0

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
            onClick={() => item.habilitado && setModuloActivo(item.id)}
            style={{ width: '100%', justifyContent: 'flex-start' }}
            tooltip={item.habilitado ? undefined : 'Próximamente'}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Contenido principal */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
        {moduloActivo === 'pago-cta-cte' && !comprobante && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <Title level="H3">Pago Cuenta Corriente — Cobro Efectivo</Title>

            {/* Búsqueda de cliente */}
            <ClienteSearch
              onClienteSeleccionado={seleccionarCliente}
              onClienteDeseleccionado={deseleccionarCliente}
              sucursal={sucursal}
            />

            {/* Error cargando partidas */}
            {errorPartidas && (
              <MessageStrip design="Negative">{errorPartidas}</MessageStrip>
            )}

            {/* Grilla de partidas */}
            {clienteSeleccionado && (
              <CajaFacturaList
                partidas={partidas}
                partidasSeleccionadas={partidasSeleccionadas}
                onTogglePartida={togglePartida}
                isLoading={isLoadingPartidas}
              />
            )}

            {/* Botón cobrar */}
            {clienteSeleccionado && (
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

            {/* Modal de pago */}
            {clienteSeleccionado && (
              <PagoEfectivoModal
                open={showPagoModal}
                totalACobrar={totalSeleccionado}
                cliente={clienteSeleccionado}
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
                  subtitleText={`Documento SAP: ${comprobante.resultado.BELNR}`}
                  status={`Clase ${comprobante.resultado.BLART}`}
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
      </main>
    </div>
  )
}
