import { useState, useCallback, useEffect } from 'react'
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
  Select,
  Option,
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
import { ConsultaPagoPanel } from '@/features/caja/ConsultaPagoPanel'
import { EgresoCajaDialog } from '@/components/pos/EgresoCajaDialog'
import { ComprobanteEgresoDialog } from '@/components/pos/ComprobanteEgresoDialog'
import { CajaFacturaList } from '@/components/pos/CajaFacturaList'
import { useCaja } from '@/hooks/useCaja'
import { consultarAperturaCaja, grabarAperturaCaja } from '@/services/api/sapCaja'
import { AperturaCajaDialog } from '@/components/pos/AperturaCajaDialog'
import { useUser } from '@/stores/userContext'
import { SUCURSALES, SAP_SOCIEDAD } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'
import type { IPartidaAbierta, Semaforo } from '@/types/caja'

// Botones del menú de caja (8 funciones según PRD)
const MENU_CAJA = [
  { id: 'pago-cta-cte', label: 'Pago Cta. Cte.', icon: 'money-bills', habilitado: true },
  { id: 'egreso-caja', label: 'Egr. de Caja', icon: 'credit-card', habilitado: true },
  { id: 'list-pagares', label: 'List. Pagarés', icon: 'receipt', habilitado: true },
  { id: 'ant-cliente', label: 'Ant. Cliente', icon: 'customer', habilitado: true },
  { id: 'estado-cuenta', label: 'E° de Cuenta', icon: 'account', habilitado: false },
  { id: 'consulta-pago', label: 'Consulta Pago', icon: 'search', habilitado: true },
  { id: 'arqueo-caja', label: 'Arqueo Caja', icon: 'bar-chart', habilitado: true },
  { id: 'salir-caja', label: 'Salir de la Caja', icon: 'log', habilitado: true },
] as const

export function CajaPage() {
  const { usuario } = useUser()
  const navigate = useNavigate()
  const [moduloActivo, setModuloActivo] = useState('pago-cta-cte')
  const [showSalirConfirm, setShowSalirConfirm] = useState(false)
  const [showEgreso, setShowEgreso] = useState(false)
  const [egresoError, setEgresoError] = useState<string | null>(null)
  const [isGrabandoEgreso, setIsGrabandoEgreso] = useState(false)
  const [egresoExito, setEgresoExito] = useState<string | null>(null)
  const [showComprobante, setShowComprobante] = useState(false)
  const [comprobanteData, setComprobanteData] = useState<{
    nroDocumento: string
    fecha: string
    sociedad: string
    sucursal: string
    nombreSucursal: string
    clienteNombre: string
    clienteRut: string
    clienteCodigo: string
    monto: number
    moneda: string
    usuario: string
    concepto: string
  } | null>(null)
  const [partidasSeleccionadas, setPartidasSeleccionadas] = useState<string[]>([])
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null) // null = consultando
  const [showApertura, setShowApertura] = useState(false)
  const [aperturaError, setAperturaError] = useState<string | null>(null)
  const [isGrabandoApertura, setIsGrabandoApertura] = useState(false)

  // Consultar si ya existe apertura de caja al entrar
  useEffect(() => {
    if (!usuario) return
    consultarAperturaCaja(usuario.id, usuario.sucursal)
      .then((res) => {
        setCajaAbierta(res.encontrada)
        if (!res.encontrada) setShowApertura(true)
      })
      .catch(() => {
        setCajaAbierta(true) // Si SAP no responde, dejar operar sin bloquear
      })
  }, [usuario])

  const {
    filtroCliente,
    setFiltroCliente,
    filtroNombre,
    setFiltroNombre,
    filtroDocumento,
    setFiltroDocumento,
    filtroPedido,
    setFiltroPedido,
    filtroEstado,
    setFiltroEstado,
    limpiarFiltros,
    partidas,
    isLoadingPartidas,
    errorPartidas,
    resetear,
  } = useCaja()

  // ¿Hay algún filtro activo?
  const hayFiltroActivo = filtroCliente.trim().length > 0
    || filtroNombre.trim().length > 0
    || filtroDocumento.trim().length > 0
    || filtroPedido.trim().length > 0
    || filtroEstado !== ''

  // Confirmación de salida de caja
  const handleSalirClick = useCallback(() => {
    setShowSalirConfirm(true)
  }, [])

  const handleAceptarApertura = useCallback(async (monto: number, fecha: string) => {
    if (!usuario) return
    setIsGrabandoApertura(true)
    setAperturaError(null)
    try {
      await grabarAperturaCaja({
        usuario: usuario.id,
        sociedad: SAP_SOCIEDAD,
        sucursal: usuario.sucursal,
        fecha,
        monto,
        moneda: 'CLP',
      })
      setCajaAbierta(true)
      setShowApertura(false)
    } catch (err) {
      setAperturaError(err instanceof Error ? err.message : 'Error al grabar apertura')
    } finally {
      setIsGrabandoApertura(false)
    }
  }, [usuario])
  
  const handleAceptarEgreso = useCallback(async (datos: {
    rut: string
    nombre: string
    clienteCodigo: string
    monto: number
  }) => {
    setIsGrabandoEgreso(true)
    setEgresoError(null)
    setEgresoExito(null)
    try {
      // Por ahora solo mostramos confirmación — la contabilización SAP se activa cuando las APIs estén habilitadas
      // TODO: llamar contabilizarEgreso() cuando las APIs estén listas
      setShowEgreso(false)
      setEgresoExito(`Egreso registrado — Cliente: ${datos.clienteCodigo} (${datos.nombre}) — Monto: $${datos.monto.toLocaleString('es-CL')}. Pendiente contabilización SAP.`)
      setComprobanteData({
        nroDocumento: '',
        fecha: new Date().toLocaleDateString('es-CL'),
        sociedad: SAP_SOCIEDAD,
        sucursal: usuario?.sucursal ?? '',
        nombreSucursal: SUCURSALES[usuario?.sucursal as CodigoSucursal] ?? usuario?.sucursal ?? '',
        clienteNombre: datos.nombre,
        clienteRut: datos.rut,
        clienteCodigo: datos.clienteCodigo,
        monto: datos.monto,
        moneda: 'CLP',
        usuario: usuario?.nombre ?? usuario?.id ?? '',
        concepto: 'DEVOL NC',
      })
      setShowComprobante(true)
    } catch (err) {
      setEgresoError(err instanceof Error ? err.message : 'Error al registrar egreso')
    } finally {
      setIsGrabandoEgreso(false)
    }
  }, [])
  const handleSalirConfirm = useCallback((action: string | undefined) => {
    setShowSalirConfirm(false)
    if (action === 'OK') {
      resetear()
      navigate('/home')
    }
  }, [resetear, navigate])

  // Toggle selección de partida (checkbox o clic en fila)
  const handleTogglePartida = useCallback((belnr: string) => {
    setPartidasSeleccionadas(prev =>
      prev.includes(belnr)
        ? prev.filter(b => b !== belnr)
        : [...prev, belnr]
    )
  }, [])

  // Botón Pagos → enviar documentos seleccionados a pantalla de pago
  const handleIrAPagos = useCallback(() => {
    if (partidasSeleccionadas.length === 0) return

    // Obtener los clientes de los documentos seleccionados
    const clientesSeleccionados = new Set(
      partidas
        .filter(p => partidasSeleccionadas.includes(p.belnr))
        .map(p => p.kunnr)
    )

    if (clientesSeleccionados.size > 1) {
      alert('Solo puede seleccionar documentos de un mismo cliente para pagar.')
      return
    }

    const kunnr = [...clientesSeleccionados][0]
    const docs = partidasSeleccionadas.join(',')
    navigate(`/caja/pago?docs=${docs}&kunnr=${kunnr}`)
  }, [partidasSeleccionadas, partidas, navigate])

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
              } else if (item.id === 'egreso-caja') {
                setShowEgreso(true)
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

        {moduloActivo === 'pago-cta-cte' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <FlexBox justifyContent="SpaceBetween" style={{ alignItems: 'center' }}>
              <Title level="H3">Listado documentos</Title>
              <Button
                design="Emphasized"
                icon="money-bills"
                onClick={handleIrAPagos}
                disabled={partidasSeleccionadas.length === 0}
              >
                Pagos ({partidasSeleccionadas.length})
              </Button>
            </FlexBox>

            {/* Barra de filtros: 4 inputs + estado + limpiar */}
            <FlexBox style={{ gap: '0.75rem', alignItems: 'flex-end' }} wrap="Wrap">
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Cliente</label>
                <Input
                  placeholder="Código..."
                  value={filtroCliente}
                  onInput={(e: { target: { value: string } }) => setFiltroCliente(e.target.value)}
                  style={{ width: '130px' }}
                  data-testid="filtro-cliente"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Nombre</label>
                <Input
                  placeholder="Nombre cliente..."
                  value={filtroNombre}
                  onInput={(e: { target: { value: string } }) => setFiltroNombre(e.target.value)}
                  style={{ width: '180px' }}
                  data-testid="filtro-nombre"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Nº Documento</label>
                <Input
                  placeholder="Nº Doc..."
                  value={filtroDocumento}
                  onInput={(e: { target: { value: string } }) => setFiltroDocumento(e.target.value)}
                  style={{ width: '140px' }}
                  data-testid="filtro-documento"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Nº Pedido</label>
                <Input
                  placeholder="Nº Pedido..."
                  value={filtroPedido}
                  onInput={(e: { target: { value: string } }) => setFiltroPedido(e.target.value)}
                  style={{ width: '140px' }}
                  data-testid="filtro-pedido"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Estado</label>
                <Select
                  onChange={(e) => {
                    const val = (e.detail?.selectedOption as HTMLElement)?.getAttribute('data-value') ?? ''
                    setFiltroEstado(val as Semaforo | '')
                  }}
                  style={{ width: '160px' }}
                  data-testid="filtro-estado"
                >
                  <Option data-value="" selected={filtroEstado === ''}>Todos</Option>
                  <Option data-value="verde" selected={filtroEstado === 'verde'}>Vigente</Option>
                  <Option data-value="amarillo" selected={filtroEstado === 'amarillo'}>Por vencer</Option>
                  <Option data-value="rojo" selected={filtroEstado === 'rojo'}>Vencida</Option>
                  <Option data-value="pagada" selected={filtroEstado === 'pagada'}>Pagada</Option>
                </Select>
              </div>
              {hayFiltroActivo && (
                <Button
                  icon="decline"
                  design="Transparent"
                  onClick={limpiarFiltros}
                  tooltip="Limpiar filtros"
                  data-testid="limpiar-filtro"
                >
                  Limpiar
                </Button>
              )}
            </FlexBox>

            {/* Error cargando partidas */}
            {errorPartidas && (
              <MessageStrip design="Negative">{errorPartidas}</MessageStrip>
            )}

            {/* Grilla de partidas — clic navega a detalle de pago */}
            <CajaFacturaList
              partidas={partidas}
              partidasSeleccionadas={partidasSeleccionadas}
              onTogglePartida={handleTogglePartida}
              isLoading={isLoadingPartidas}
              mostrarColumnaCliente
            />
          </div>
        )}

        {/* Listado de Pagarés */}
        {moduloActivo === 'list-pagares' && <ListPagaresPanel />}

        {/* Anticipo de Cliente */}
        {moduloActivo === 'ant-cliente' && <AntClientePanel />}

        {/* Arqueo de Caja */}
        {moduloActivo === 'arqueo-caja' && <ArqueoCajaPanel />}

        {/* Consulta de Pago */}
        {moduloActivo === 'consulta-pago' && <ConsultaPagoPanel />}

        {/* Popup Apertura de Caja */}
        <AperturaCajaDialog
          open={showApertura}
          usuario={usuario?.id ?? ''}
          sociedad={SAP_SOCIEDAD}
          nombreSociedad="COOPRINSEM LTDA."
          sucursal={usuario?.sucursal ?? ''}
          nombreSucursal={SUCURSALES[usuario?.sucursal as CodigoSucursal] ?? usuario?.sucursal ?? ''}
          onAceptar={handleAceptarApertura}
          onCancelar={() => setShowApertura(false)}
          isGrabando={isGrabandoApertura}
          error={aperturaError}
        />
        
        {/* Popup Egreso de Caja */}
        <EgresoCajaDialog
          open={showEgreso}
          sucursal={usuario?.sucursal ?? ''}
          onAceptar={handleAceptarEgreso}
          onCancelar={() => { setShowEgreso(false); setEgresoError(null) }}
          isGrabando={isGrabandoEgreso}
          error={egresoError}
        />

        {/* Confirmación de egreso exitoso */}
        {egresoExito && (
          <MessageStrip design="Positive" onClose={() => setEgresoExito(null)} style={{ marginBottom: '1rem' }}>
            {egresoExito}
          </MessageStrip>
        )}

        {/* Comprobante de Egreso PDF */}
        <ComprobanteEgresoDialog
          open={showComprobante}
          onCerrar={() => setShowComprobante(false)}
          datos={comprobanteData}
        />

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
