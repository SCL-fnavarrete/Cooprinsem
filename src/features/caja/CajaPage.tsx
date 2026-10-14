import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  Dialog,
  Bar,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/home.js'
import '@ui5/webcomponents-icons/dist/money-bills.js'
import '@ui5/webcomponents-icons/dist/credit-card.js'
import '@ui5/webcomponents-icons/dist/receipt.js'
import '@ui5/webcomponents-icons/dist/customer.js'
import '@ui5/webcomponents-icons/dist/account.js'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/bar-chart.js'
import '@ui5/webcomponents-icons/dist/log.js'
import '@ui5/webcomponents-icons/dist/decline.js'
import '@ui5/webcomponents-icons/dist/payment-approval.js'
import { ListPagaresPanel } from '@/features/caja/ListPagaresPanel'
import { AntClientePanel } from '@/features/caja/AntClientePanel'
import { ArqueoCajaPanel } from '@/features/caja/ArqueoCajaPanel'
import { ConsultaPagoPanel } from '@/features/caja/ConsultaPagoPanel'
import { PagoCtaCtePanel } from './PagoCtaCtePanel'
import { EstadoCuentaPanel } from '@/features/caja/EstadoCuentaPanel'
import { EgresoCajaDialog } from '@/components/pos/EgresoCajaDialog'
import { ComprobanteEgresoDialog } from '@/components/pos/ComprobanteEgresoDialog'
import { ListadoDocumentosCaja } from './ListadoDocumentosCaja'
import { PendientesHomeCaja } from './PendientesHomeCaja'
import { useCaja } from '@/hooks/useCaja'
import { AperturaCajaDialog } from '@/components/pos/AperturaCajaDialog'
import { getMontoApertura } from '@/services/api/posMaestros'
import { crearAperturaCajaSap, getEstadoAperturaCaja, type IAperturaCajaResult } from '@/services/api/sapCaja'
import { useUser } from '@/stores/userContext'
import { SUCURSALES, SAP_SOCIEDAD } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'
import type { IDocumentoCaja, Semaforo } from '@/types/caja'

interface IItemMenuCaja {
  id: string
  label: string
  icon: string
  habilitado: boolean
  oculto?: boolean  // no se renderiza ni se puede abrir por ?modulo=
}

// Botones del menú de caja (8 funciones según PRD)
const MENU_CAJA: IItemMenuCaja[] = [
  // "Home" = listado de documentos (antes se llamaba "Pago Cta. Cte."). El
  // nuevo "Pago Cta. Cte." queda debajo, en construcción (2026-10-05).
  { id: 'home', label: 'Home', icon: 'home', habilitado: true },
  { id: 'pago-cta-cte', label: 'Pago Cta. Cte.', icon: 'money-bills', habilitado: true },
  { id: 'egreso-caja', label: 'Egr. de Caja', icon: 'credit-card', habilitado: true },
  { id: 'list-pagares', label: 'List. Pagarés', icon: 'receipt', habilitado: true },
  // Deshabilitados y ocultos a pedido del usuario (2026-10-13).
  { id: 'ant-cliente', label: 'Ant. Cliente', icon: 'customer', habilitado: false, oculto: true },
  { id: 'estado-cuenta', label: 'E° de Cuenta', icon: 'account', habilitado: true },
  { id: 'consulta-pago', label: 'Consulta Pago', icon: 'search', habilitado: true },
  { id: 'arqueo-caja', label: 'Arqueo Caja', icon: 'bar-chart', habilitado: true },
  { id: 'salir-caja', label: 'Salir de la Caja', icon: 'log', habilitado: false, oculto: true },
]

// Opciones que se pueden abrir (también vía ?modulo=): visibles y habilitadas.
const MODULOS_DISPONIBLES = new Set(MENU_CAJA.filter((m) => m.habilitado && !m.oculto).map((m) => m.id))

export function CajaPage() {
  const { usuario } = useUser()
  const navigate = useNavigate()
  // ?modulo=pago-cta-cte permite volver a una opción (ej. desde la pantalla de pago)
  const [searchParams] = useSearchParams()
  const [moduloActivo, setModuloActivo] = useState(() => {
    const modulo = searchParams.get('modulo') ?? 'home'
    return MODULOS_DISPONIBLES.has(modulo) ? modulo : 'home'
  })
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
  // Apertura de caja (15-10-2026): al entrar se consulta apertura_caja. Si el
  // cajero ya abrió hoy (mismo usuario y sucursal, fecha de hoy en Chile) se
  // entra directo; si no, se pide abrirla. Reemplaza el modal temporal
  // "Simular apertura / Caja ya Abierta".
  const [cajaAbierta, setCajaAbierta] = useState(false)
  const [verificandoApertura, setVerificandoApertura] = useState(true)
  const [errorEstadoApertura, setErrorEstadoApertura] = useState<string | null>(null)
  const [showApertura, setShowApertura] = useState(false)
  const [montoAperturaSugerido, setMontoAperturaSugerido] = useState<number | undefined>(undefined)
  const [isEnviandoApertura, setIsEnviandoApertura] = useState(false)
  const [resultadoApertura, setResultadoApertura] = useState<IAperturaCajaResult | null>(null)
  const [showResultadoApertura, setShowResultadoApertura] = useState(false)

  // Fondo fijo esperado para la sucursal (tabla monto_apertura, poblada por el
  // equipo de arquitectura/interfaces SAP) — prellena el formulario de
  // apertura. Si no hay dato para el centro (404) o falla la consulta, se deja
  // sin sugerencia (el input queda vacío, como antes).
  useEffect(() => {
    if (!usuario?.sucursal) return
    getMontoApertura(usuario.sucursal)
      .then((m) => setMontoAperturaSugerido(m ? Number(m.valor) : undefined))
      .catch(() => setMontoAperturaSugerido(undefined))
  }, [usuario?.sucursal])

  const {
    filtroCliente,
    setFiltroCliente,
    filtroNombre,
    setFiltroNombre,
    filtroEstado,
    setFiltroEstado,
    limpiarFiltros,
    resetear,
  } = useCaja({ cargarPartidas: false })

  // Home "Listado documentos": fuente pendiente de definir → sin documentos
  // (no se consulta /api/partidas). Ver PendientesHomeCaja.
  const documentosHome: IDocumentoCaja[] = useMemo(() => [], [])

  // Filtros visibles = columnas de la tabla: Cliente (código), Nombre y Estado
  const documentosFiltrados = useMemo(() => {
    const cliente = filtroCliente.trim().toLowerCase()
    const nombre = filtroNombre.trim().toLowerCase()
    return documentosHome.filter((d) =>
      (!cliente || d.kunnr.toLowerCase().includes(cliente))
      && (!nombre || d.cliente.toLowerCase().includes(nombre))
      && (!filtroEstado || d.estado === filtroEstado))
  }, [documentosHome, filtroCliente, filtroNombre, filtroEstado])

  // ¿Hay algún filtro activo?
  const hayFiltroActivo = filtroCliente.trim().length > 0
    || filtroNombre.trim().length > 0
    || filtroEstado !== ''

  // Confirmación de salida de caja
  const handleSalirClick = useCallback(() => {
    setShowSalirConfirm(true)
  }, [])

  // ¿Está abierta hoy la caja del cajero? Abierta → se entra directo; si no,
  // se abre el formulario de Apertura de Caja.
  const verificarApertura = useCallback(async () => {
    if (!usuario?.id || !usuario?.sucursal) {
      setErrorEstadoApertura('El usuario no tiene sucursal asignada: no se puede verificar la apertura de caja.')
      setVerificandoApertura(false)
      return
    }
    setVerificandoApertura(true)
    setErrorEstadoApertura(null)
    try {
      const estado = await getEstadoAperturaCaja(usuario.id, usuario.sucursal)
      if (!estado.success) {
        setErrorEstadoApertura(estado.message ?? 'No se pudo verificar la apertura de caja')
      } else if (estado.abierta) {
        setCajaAbierta(true)
      } else {
        setShowApertura(true)
      }
    } catch (err) {
      setErrorEstadoApertura(err instanceof Error ? `Error de red al verificar la apertura: ${err.message}` : 'Error de red al verificar la apertura')
    } finally {
      setVerificandoApertura(false)
    }
  }, [usuario?.id, usuario?.sucursal])

  useEffect(() => { verificarApertura() }, [verificarApertura])

  // Contabiliza la Apertura de Caja en SAP (ZCOOP_JOURNALENTRY_SRV, variante
  // 1) y la registra en apertura_caja. El resultado (éxito o rechazo) se
  // muestra siempre en un modal aparte con la URL, el body y la respuesta de SAP.
  const handleAceptarApertura = useCallback(async (monto: number, fecha: string) => {
    if (!usuario) return
    setIsEnviandoApertura(true)
    try {
      const resultado = await crearAperturaCajaSap({ usuario: usuario.id, sucursal: usuario.sucursal, monto, fecha })
      setResultadoApertura(resultado)
      setShowApertura(false)
      setShowResultadoApertura(true)
      // Ya estaba abierta hoy (otra pestaña / otro equipo): se entra al módulo igual
      if (resultado.success || resultado.yaAbierta) setCajaAbierta(true)
    } catch (err) {
      setResultadoApertura({
        success: false,
        message: err instanceof Error ? err.message : 'Error de red al contactar a SAP',
      })
      setShowApertura(false)
      setShowResultadoApertura(true)
    } finally {
      setIsEnviandoApertura(false)
    }
  }, [usuario])

  // Al cerrar el modal de resultado: si SAP aceptó (o ya estaba abierta) el
  // módulo ya quedó habilitado; si rechazó, se vuelve al formulario.
  const handleCerrarResultadoApertura = useCallback(() => {
    setShowResultadoApertura(false)
    if (!resultadoApertura?.success && !resultadoApertura?.yaAbierta) setShowApertura(true)
  }, [resultadoApertura])

  // Sin caja abierta no se puede usar el módulo: cancelar vuelve al inicio.
  const handleCancelarApertura = useCallback(() => {
    setShowApertura(false)
    navigate('/home')
  }, [navigate])
  
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

  // Toggle selección de documento (checkbox o clic en fila)
  const handleToggleDocumento = useCallback((id: string) => {
    setPartidasSeleccionadas(prev =>
      prev.includes(id)
        ? prev.filter(b => b !== id)
        : [...prev, id]
    )
  }, [])

  // Botón Pagos → enviar documentos seleccionados a pantalla de pago
  const handleIrAPagos = useCallback(() => {
    if (partidasSeleccionadas.length === 0) return

    // Obtener los clientes de los documentos seleccionados
    const clientesSeleccionados = new Set(
      documentosHome
        .filter(d => partidasSeleccionadas.includes(d.id))
        .map(d => d.kunnr)
    )

    if (clientesSeleccionados.size > 1) {
      alert('Solo puede seleccionar documentos de un mismo cliente para pagar.')
      return
    }

    const kunnr = [...clientesSeleccionados][0]
    const docs = partidasSeleccionadas.join(',')
    navigate(`/caja/pago?docs=${docs}&kunnr=${kunnr}`)
  }, [partidasSeleccionadas, documentosHome, navigate])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {cajaAbierta ? (
        <>
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
        {MENU_CAJA.filter((item) => !item.oculto).map((item) => (
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

        {moduloActivo === 'home' && (
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

            {/* Barra de filtros: solo los que corresponden a columnas de la tabla
                (Cliente, Nombre, Estado). Nº Documento SAP y Nº Pedido Interno ocultos. */}
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

            {/* Listado de Documentos (columnas del WebDynpro) — sin datos por ahora */}
            <ListadoDocumentosCaja
              documentos={documentosFiltrados}
              seleccionados={partidasSeleccionadas}
              onToggle={handleToggleDocumento}
            />

            <PendientesHomeCaja />
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

        {/* Estado de Cuenta */}
        {moduloActivo === 'estado-cuenta' && <EstadoCuentaPanel />}

        {/* Pago Cta. Cte. — formulario Cuenta Corriente (listado pendiente de API SAP) */}
        {moduloActivo === 'pago-cta-cte' && <PagoCtaCtePanel onVolver={() => setModuloActivo('home')} />}

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
        </>
      ) : (
        <div style={{ flex: 1, padding: '2rem' }} data-testid="caja-verificando-apertura">
          {verificandoApertura && <Label>Verificando apertura de caja…</Label>}
        </div>
      )}

      {/* No se pudo consultar apertura_caja: no se deja entrar sin saber si la caja está abierta */}
      {errorEstadoApertura && !cajaAbierta && (
        <Dialog
          open
          headerText="Apertura de Caja"
          style={{ width: '480px' }}
          data-testid="error-estado-apertura"
          footer={
            <Bar
              endContent={
                <FlexBox style={{ gap: '0.5rem' }}>
                  <Button design="Transparent" onClick={() => navigate('/home')}>Volver</Button>
                  <Button design="Emphasized" onClick={verificarApertura}>Reintentar</Button>
                </FlexBox>
              }
            />
          }
        >
          <div style={{ padding: '1rem' }}>
            <MessageStrip design="Negative" hideCloseButton>{errorEstadoApertura}</MessageStrip>
          </div>
        </Dialog>
      )}

      <AperturaCajaDialog
        open={showApertura}
        usuario={usuario?.id ?? ''}
        sociedad={SAP_SOCIEDAD}
        nombreSociedad="COOPRINSEM LTDA."
        sucursal={usuario?.sucursal ?? ''}
        nombreSucursal={SUCURSALES[usuario?.sucursal as CodigoSucursal] ?? usuario?.sucursal ?? ''}
        montoSugerido={montoAperturaSugerido}
        onAceptar={handleAceptarApertura}
        onCancelar={handleCancelarApertura}
        isGrabando={isEnviandoApertura}
        error={null}
      />

      {/* Resultado de la Apertura de Caja real contra SAP — mismo patrón que
          usamos en Pedidos: URL + body enviado + respuesta cruda, tanto en
          éxito como en rechazo. */}
      {showResultadoApertura && resultadoApertura && (
        <Dialog
          open
          headerText={
            resultadoApertura.success
              ? 'Apertura de Caja — SAP aceptó el documento'
              : resultadoApertura.yaAbierta
                ? 'Apertura de Caja — la caja ya estaba abierta hoy'
                : 'Apertura de Caja — SAP rechazó la solicitud'
          }
          style={{ width: '720px', maxHeight: '85vh' }}
          footer={
            <Bar
              endContent={
                <Button design="Emphasized" onClick={handleCerrarResultadoApertura}>
                  Cerrar
                </Button>
              }
            />
          }
        >
          <div style={{ padding: '1rem' }}>
            <MessageStrip
              design={resultadoApertura.success ? 'Positive' : 'Negative'}
              hideCloseButton
              style={{ marginBottom: '0.75rem' }}
            >
              {resultadoApertura.success
                ? (resultadoApertura.data?.apertura?.Message || 'SAP contabilizó el documento.')
                : (resultadoApertura.message ?? 'SAP rechazó la solicitud.')}
            </MessageStrip>
            {resultadoApertura.advertencia && (
              <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: '0.75rem' }} data-testid="apertura-advertencia">
                {resultadoApertura.advertencia}
              </MessageStrip>
            )}
            {resultadoApertura.registro && (
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }} data-testid="apertura-registro">
                <b>Registrada en el POS:</b> {resultadoApertura.registro.usuario} · {resultadoApertura.registro.sucursal} · {resultadoApertura.registro.fecha}
              </div>
            )}
            {resultadoApertura.success && (
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                {/* ZCOOP_JOURNALENTRY_SRV devuelve el N° en AcDocNo y el ejercicio en FiscYear (guía, sección 7) */}
                <b>N° Documento Contable:</b> {resultadoApertura.data?.apertura?.AcDocNo ?? resultadoApertura.data?.apertura?.AccountingDocument ?? '—'}
                {' · '}
                <b>Ejercicio:</b> {resultadoApertura.data?.apertura?.FiscYear ?? resultadoApertura.data?.apertura?.FiscalYear ?? '—'}
              </div>
            )}
            {!resultadoApertura.success && (resultadoApertura.errordetails?.length ?? 0) > 0 && (
              <ul style={{ marginBottom: '0.5rem', fontSize: '0.85rem', paddingLeft: '1.25rem' }}>
                {resultadoApertura.errordetails!.map((d, i) => (
                  <li key={i}>{d.message}</li>
                ))}
              </ul>
            )}
            <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', wordBreak: 'break-all' }}>
              <b>URL:</b> {resultadoApertura.url ?? '—'}
            </div>
            <pre
              style={{
                maxHeight: '50vh',
                overflow: 'auto',
                fontSize: '0.75rem',
                background: 'var(--sapList_Background)',
                padding: '0.75rem',
                borderRadius: '4px',
              }}
            >
              {JSON.stringify(
                {
                  requestApertura: resultadoApertura.body,
                  respuestaSap: resultadoApertura.data?.apertura ?? resultadoApertura.detalle,
                },
                null,
                2
              )}
            </pre>
          </div>
        </Dialog>
      )}
    </div>
  )
}
