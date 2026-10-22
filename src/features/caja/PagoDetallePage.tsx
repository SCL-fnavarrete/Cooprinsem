import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Title,
  FlexBox,
  Button,
  Card,
  CardHeader,
  Label,
  Text,
  MessageStrip,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Icon,
  BusyIndicator,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/money-bills.js'
import '@ui5/webcomponents-icons/dist/credit-card.js'
import '@ui5/webcomponents-icons/dist/payment-approval.js'
import '@ui5/webcomponents-icons/dist/decline.js'
import '@ui5/webcomponents-icons/dist/print.js'
import '@ui5/webcomponents-icons/dist/nav-back.js'
import '@ui5/webcomponents-icons/dist/status-positive.js'
import '@ui5/webcomponents-icons/dist/status-critical.js'
import '@ui5/webcomponents-icons/dist/status-negative.js'
import { usePagoDetalle } from '@/hooks/usePagoDetalle'
import { PagoSapDialog } from './PagoSapDialog'
import { PendientesPagoSap } from './PendientesPagoSap'
import { PendientesAntCliente } from './PendientesAntCliente'
import type { IPreviewPagoCtaCte, IResultadoPagoCtaCte } from '@/types/ctaCte'
import { useUser } from '@/stores/userContext'
import { MEDIOS_PAGO, SUCURSALES, SAP_SOCIEDAD, DIAS_MAX_CHEQUE_FECHA_DEFECTO } from '@/config/sap'
import type { MedioPagoCodigo } from '@/types/pago'
import type { ISapBanco } from '@/types/sapMaestro'
import { getSapBancos } from '@/services/api/sapMaestro'
import { getParametroValor } from '@/services/api/posMaestros'
import { MedioPagoDialog } from './MedioPagoDialog'
import { resumenMedio, fechaMaximaCheque, etiquetaMedio } from './mediosPago'
import { hoyChileISO } from './estadoCuentaCalculos'
import { JsonCopiable } from '@/components/common/JsonCopiable'
import type { CodigoSucursal } from '@/config/sap'
import { formatCLP, formatRUT, formatFecha, formatFechaSAP } from '@/utils/format'
import type { Semaforo } from '@/types/caja'
import { SoloModoTecnico } from '@/components/common/SoloModoTecnico'
import { useSoloLectura } from '@/hooks/useSoloLectura'
import { ResumenFlotante } from '@/components/common/ResumenFlotante'
import { useFueraDeVista } from '@/hooks/useFueraDeVista'

const SEMAFORO_CONFIG = {
  verde:    { icon: 'status-positive', color: 'var(--sapPositiveColor, #2b7c2b)', text: 'Vigente' },
  amarillo: { icon: 'status-critical', color: 'var(--sapCriticalColor, #e9730c)', text: 'Por vencer' },
  rojo:     { icon: 'status-negative', color: 'var(--sapNegativeColor, #bb0000)', text: 'Vencida' },
  pagada:   { icon: 'status-positive', color: 'var(--sapNeutralColor, #6a6d70)', text: 'Pagada' },
} as const

function SemaforoLabel({ semaforo }: { semaforo: Semaforo }) {
  const { icon, color, text } = SEMAFORO_CONFIG[semaforo]
  return (
    <FlexBox style={{ gap: '0.25rem', alignItems: 'center' }}>
      <Icon name={icon} style={{ color }} aria-label={text} />
      <span style={{ color, fontSize: '0.85rem' }}>{text}</span>
    </FlexBox>
  )
}

export function PagoDetallePage() {
  const { belnr = '' } = useParams<{ belnr: string }>()
  const [searchParams] = useSearchParams()
  const kunnr = searchParams.get('kunnr') ?? ''
  const docsParam = searchParams.get('docs') ?? ''
  // 'sap' = viene de Caja > Pago Cta. Cte. (partidas SAP; pago real pendiente de API)
  const fuente = searchParams.get('fuente') === 'sap' ? 'sap' : 'local'
  const esSap = fuente === 'sap'
  // Ant. Cliente: pago de una solicitud de anticipo (CME F) — sin pago parcial ni saldo a favor
  const esAnticipo = esSap && searchParams.get('modo') === 'anticipo'
  const belnrsDesdeQuery = useMemo(() => docsParam ? docsParam.split(',').filter(Boolean) : [], [docsParam])
  const navigate = useNavigate()
  const { usuario } = useUser()
  const sucursal = usuario?.sucursal ?? 'D190'
  const soloLectura = useSoloLectura()

  // Vía de pago con su popup abierto (null = ninguno)
  const [medioAbierto, setMedioAbierto] = useState<MedioPagoCodigo | null>(null)
  const medioAbiertoRef = useRef(medioAbierto)
  medioAbiertoRef.current = medioAbierto
  // Catálogo de bancos (Sap_banco) y días de la fecha máxima del cheque a fecha
  const [bancos, setBancos] = useState<ISapBanco[]>([])
  const [diasMaxChequeFecha, setDiasMaxChequeFecha] = useState(DIAS_MAX_CHEQUE_FECHA_DEFECTO)
  const [showComprobante, setShowComprobante] = useState(false)
  // Pago real en SAP (fuente 'sap'): confirmación → resultado.
  const [modalPagoSap, setModalPagoSap] = useState<'confirmar' | 'resultado' | null>(null)
  const [previewSap, setPreviewSap] = useState<IPreviewPagoCtaCte | null>(null)
  const [resultadoSap, setResultadoSap] = useState<IResultadoPagoCtaCte | null>(null)
  // Escenario B (solo SAP): el excedente queda como saldo a favor del cliente en vez de vuelto
  const [excedenteAFavor, setExcedenteAFavor] = useState(false)
  // Pago residual (solo SAP, 19-10-2026): se cobra menos que el saldo de UNA factura
  const [pagoParcialMarcado, setPagoParcialMarcado] = useState(false)
  const modalPagoSapRef = useRef(modalPagoSap)
  modalPagoSapRef.current = modalPagoSap

  // "Documentos a Cancelar": al bajar (medios de pago, totales, acciones) su resumen queda flotando arriba
  const refDocumentos = useRef<HTMLDivElement>(null)
  const ejecutarPagoRef = useRef<HTMLButtonElement>(null)

  const {
    prepararPagoSap,
    confirmarPagoSap,
    isProcesandoPagoSap,
    cliente,
    isLoadingCliente,
    errorCliente,
    partidas,
    isLoadingPartidas,
    errorPartidas,
    selectedBelnrs,
    togglePartida,
    pagoEntries,
    medios,
    guardarMedio,
    quitarMedio,
    limpiarPagos,
    hayMediosSinIntegracion,
    totalAPagar,
    totalPagado,
    totalADevolver,
    excedenteCheques,
    ejecutarPago,
    isCobrando,
    errorCobro,
    resultadoCobro,
  } = usePagoDetalle({ kunnr, belnrPreseleccionado: belnr, belnrsPreseleccionados: belnrsDesdeQuery, fuente, modo: esAnticipo ? 'anticipo' : 'ctacte' })

  // Escenario B: solo aplica con partidas SAP y si hay excedente
  const saldoAFavorActivo = esSap && !esAnticipo && excedenteAFavor && totalADevolver > 0
  const vueltoMostrado = saldoAFavorActivo ? 0 : totalADevolver
  // Pago residual: solo SAP, una factura y un monto entre 0 y el saldo
  const pagoParcialPosible = esSap && !esAnticipo && selectedBelnrs.length === 1 && totalPagado > 0 && totalPagado < totalAPagar
  const pagoParcialActivo = pagoParcialPosible && pagoParcialMarcado

  // Maestros para los popups: bancos (cheques) y días de la fecha máxima del cheque a fecha
  useEffect(() => {
    let cancelado = false
    getSapBancos()
      .then((r) => { if (!cancelado) setBancos(r) })
      .catch(() => { /* sin catálogo: el select de banco queda vacío y el cheque no se puede aceptar */ })
    getParametroValor('DIAS_MAX_CHEQUE_FECHA')
      .then((v) => {
        const dias = parseInt(v ?? '', 10)
        if (!cancelado && Number.isFinite(dias) && dias > 0) setDiasMaxChequeFecha(dias)
      })
      .catch(() => { /* se usa el valor por defecto */ })
    return () => { cancelado = true }
  }, [])

  const hoy = hoyChileISO()
  const fechaMaxima = fechaMaximaCheque(hoy, cliente?.condicionPago, diasMaxChequeFecha)
  const nombreBanco = useCallback((codigo: string) => bancos.find((b) => b.BankKey === codigo)?.BankName ?? '', [bancos])
  // Un solo medio por cobro: el popup sugiere el total y, si ya hay otro medio, avisa que lo reemplaza
  const medioReemplazado = medios.find((m) => m.codigo !== medioAbierto)

  const handleEjecutarPago = useCallback(async () => {
    // SAP: primero se muestra el JSON a enviar y se pide confirmación.
    if (esSap) {
      const preview = await prepararPagoSap(sucursal, saldoAFavorActivo, pagoParcialActivo, usuario?.id)
      if (preview.success) {
        setPreviewSap(preview)
        setModalPagoSap('confirmar')
      } else {
        setResultadoSap({ success: false, message: preview.message })
        setModalPagoSap('resultado')
      }
      return
    }
    try {
      await ejecutarPago()
      setShowComprobante(true)
    } catch {
      // errorCobro ya se setea en el hook
    }
  }, [ejecutarPago, esSap, prepararPagoSap, sucursal, saldoAFavorActivo, pagoParcialActivo, usuario?.id])

  const handleConfirmarPagoSap = useCallback(async () => {
    const resultado = await confirmarPagoSap(sucursal, saldoAFavorActivo, pagoParcialActivo, usuario?.id)
    setResultadoSap(resultado)
    setModalPagoSap('resultado')
  }, [confirmarPagoSap, sucursal, saldoAFavorActivo, pagoParcialActivo, usuario?.id])

  const handleCancelar = useCallback(() => {
    // Desde Pago Cta. Cte. se vuelve a esa opción con el mismo cliente; desde Ant. Cliente, a Ant. Cliente.
    if (esAnticipo) navigate('/caja?modulo=ant-cliente')
    else navigate(esSap ? `/caja?modulo=pago-cta-cte&cliente=${encodeURIComponent(kunnr)}` : '/caja')
  }, [navigate, esSap, esAnticipo, kunnr])

  const handleImprimir = useCallback(() => {
    window.print()
  }, [])

  // Atajos de teclado globales
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (medioAbiertoRef.current) return
      if (e.key === 'F9') {
        e.preventDefault()
        if (canEjecutarRef.current && !isCobrando) {
          handleEjecutarPago()
        }
      } else if (e.key === 'Escape') {
        // Con un modal de pago SAP abierto, Escape solo cierra el modal.
        if (modalPagoSapRef.current) return
        e.preventDefault()
        handleCancelar()
      } else if (e.key === 'F2') {
        e.preventDefault()
        setMedioAbierto('EFECTIVO')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleEjecutarPago, handleCancelar, isCobrando])

  // Visualizador: con partidas SAP puede ver la vista previa (la confirmación queda deshabilitada); el cobro local no
  const canEjecutar = (totalPagado >= totalAPagar || pagoParcialActivo) && totalAPagar > 0 && selectedBelnrs.length > 0 && !isProcesandoPagoSap
    && (esSap || !soloLectura) && !hayMediosSinIntegracion
  const faltante = totalAPagar - totalPagado

  // Ref para acceder a canEjecutar dentro del event listener sin re-registrarlo
  const canEjecutarRef = useRef(canEjecutar)
  canEjecutarRef.current = canEjecutar

  const documentosFueraDeVista = useFueraDeVista(refDocumentos)
  const documentosSeleccionados = partidas.filter((p) => selectedBelnrs.includes(p.belnr)).map((p) => p.etiqueta ?? p.belnr)

  // ---- Comprobante ----
  if (showComprobante && resultadoCobro) {
    const ahora = new Date()
    return (
      <div style={{ maxWidth: '550px', margin: '2rem auto' }} data-testid="comprobante-pago-detalle">
        <Card
          header={
            <CardHeader
              titleText="Comprobante de Cobro"
              subtitleText={`Documento SAP: ${resultadoCobro.BELNR} — Clase ${resultadoCobro.BLART}`}
            />
          }
        >
          <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            <MessageStrip design="Positive" hideCloseButton>
              Cobro registrado exitosamente
            </MessageStrip>

            <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
              <Label style={{ fontWeight: 'bold' }}>N° Documento SAP</Label>
              <Title level="H4">{resultadoCobro.BELNR}</Title>
            </FlexBox>

            <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
              <Label>Cliente: {cliente?.nombre ?? kunnr}</Label>
              {cliente?.rut && <Label>RUT: {formatRUT(cliente.rut)}</Label>}
            </FlexBox>

            <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
              <Label style={{ fontWeight: 'bold' }}>Documentos cancelados</Label>
              {selectedBelnrs.map((doc) => (
                <Label key={doc}>• {doc}</Label>
              ))}
            </FlexBox>

            <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
              <Label>Monto cobrado: {formatCLP(totalAPagar)}</Label>
              <Label>Total recibido: {formatCLP(totalPagado)}</Label>
              <Label style={{ fontWeight: 'bold' }}>
                Vuelto entregado: {formatCLP(totalADevolver)}
              </Label>
            </FlexBox>

            <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
              <Label>Fecha: {formatFecha(formatFechaSAP(ahora))}</Label>
              <Label>Hora: {ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Label>
            </FlexBox>

            <FlexBox style={{ gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button design="Default" icon="print" onClick={handleImprimir}>
                Imprimir
              </Button>
              <Button design="Emphasized" icon="nav-back" onClick={handleCancelar}>
                Volver a Caja
              </Button>
            </FlexBox>
          </div>
        </Card>
      </div>
    )
  }

  // ---- Layout principal 3 columnas ----
  return (
    <div style={{ padding: '1rem' }} data-testid="pago-detalle-page">
      <ResumenFlotante
        visible={documentosFueraDeVista && partidas.length > 0}
        titulo={esAnticipo ? 'Solicitud de anticipo a pagar' : 'Documentos a Cancelar'}
        datos={[
          { etiqueta: 'Cliente', valor: cliente?.nombre ? `${kunnr} — ${cliente.nombre}` : kunnr || '—' },
          { etiqueta: 'Documentos', valor: documentosSeleccionados.length > 0 ? documentosSeleccionados.join(', ') : 'ninguno' },
          { etiqueta: 'Total a pagar', valor: formatCLP(totalAPagar) },
          { etiqueta: 'Pagado', valor: formatCLP(totalPagado) },
          pagoParcialActivo
            ? { etiqueta: 'Queda pendiente', valor: formatCLP(faltante) }
            : { etiqueta: 'A devolver', valor: formatCLP(vueltoMostrado) },
        ]}
        acciones={
          <Button
            design="Emphasized"
            icon="payment-approval"
            onClick={handleEjecutarPago}
            disabled={!canEjecutar || isCobrando}
            data-testid="resumen-pago-ejecutar"
          >
            {isCobrando ? 'Procesando...' : 'Ejecutar Pago (F9)'}
          </Button>
        }
        onVolverArriba={() => refDocumentos.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        textoVolver="Ver documentos"
        data-testid="resumen-pago"
      />
      <MedioPagoDialog
        codigo={medioAbierto}
        medioActual={medios.find((m) => m.codigo === medioAbierto)}
        montoSugerido={totalAPagar}
        montoMaximo={totalAPagar}
        medioReemplazado={medioReemplazado ? etiquetaMedio(medioReemplazado.codigo) : undefined}
        hoy={hoy}
        fechaMaxima={fechaMaxima}
        rutCliente={cliente?.rut}
        bancos={bancos}
        onAceptar={(medio) => { guardarMedio(medio); setMedioAbierto(null) }}
        onQuitar={(codigo) => { quitarMedio(codigo); setMedioAbierto(null) }}
        onCancelar={() => setMedioAbierto(null)}
      />
      <PagoSapDialog
        modo={modalPagoSap}
        preview={previewSap}
        resultado={resultadoSap}
        isProcesando={isProcesandoPagoSap}
        onConfirmar={handleConfirmarPagoSap}
        onCerrar={() => setModalPagoSap(null)}
        onVolver={handleCancelar}
        onImprimir={handleImprimir}
      />
      <FlexBox style={{ marginBottom: '1rem', gap: '0.5rem', alignItems: 'center' }}>
        <Button icon="nav-back" design="Transparent" onClick={handleCancelar} tooltip="Volver a Caja" />
        <Title level="H3">{esAnticipo ? 'Pago de Anticipo' : 'Detalle de Pago'}</Title>
      </FlexBox>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr 320px',
          gap: '1rem',
          minHeight: 'calc(100vh - 180px)',
        }}
      >
        {/* ---- COLUMNA IZQUIERDA: Info Cliente y Sesión ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Card header={<CardHeader titleText="Moneda" />}>
            <div style={{ padding: '0.5rem 1rem' }}>
              <Text style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>CLP</Text>
            </div>
          </Card>

          <Card header={<CardHeader titleText="Usuario" />}>
            <div style={{ padding: '0.5rem 1rem', display: 'grid', gap: '0.3rem' }}>
              <Label>{usuario?.nombre ?? '—'}</Label>
              <Label>Centro: {sucursal} — {SUCURSALES[sucursal as CodigoSucursal] ?? sucursal}</Label>
              <Label>Org. Ventas: —</Label>
              <Label>Canal Distrib.: —</Label>
            </div>
          </Card>

          <Card header={<CardHeader titleText="Cliente" />}>
            <BusyIndicator active={isLoadingCliente} style={{ width: '100%' }}>
              <div style={{ padding: '0.5rem 1rem', display: 'grid', gap: '0.3rem' }}>
                {errorCliente && <MessageStrip design="Negative">{errorCliente}</MessageStrip>}
                {cliente ? (
                  <>
                    <Label>RUT: {cliente.rut ? formatRUT(cliente.rut) : '—'}</Label>
                    <Label>Nombre: {cliente.nombre}</Label>
                    <Label>Cond. Pago: {cliente.condicionPago}</Label>
                    <Label>Estado: {cliente.estadoCredito}</Label>
                  </>
                ) : (
                  !isLoadingCliente && <Label>—</Label>
                )}
              </div>
            </BusyIndicator>
          </Card>

          <Card header={<CardHeader titleText="Info Cliente" />}>
            <div style={{ padding: '0.5rem 1rem', display: 'grid', gap: '0.3rem' }}>
              <Label>Sociedad: {SAP_SOCIEDAD}</Label>
              <Label>Cód. Cliente: {kunnr}</Label>
              {cliente && esSap && (
                <Label>Crédito: no disponible en el maestro de clientes SAP</Label>
              )}
              {cliente && !esSap && (
                <>
                  <Label>Crédito Asign.: {formatCLP(cliente.creditoAsignado)}</Label>
                  <Label>Crédito Utiliz.: {formatCLP(cliente.creditoUtilizado)}</Label>
                  <Label>% Agotamiento: {cliente.porcentajeAgotamiento}%</Label>
                </>
              )}
            </div>
          </Card>

          <Card header={<CardHeader titleText="Datos Adicionales" />}>
            <div style={{ padding: '0.5rem 1rem' }}>
              <Label style={{ color: 'var(--sapContent_LabelColor)' }}>—</Label>
            </div>
          </Card>
        </div>

        {/* ---- COLUMNA CENTRAL: Documentos a Cancelar ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Error cargando partidas */}
          {errorPartidas && (
            <MessageStrip design="Negative">{errorPartidas}</MessageStrip>
          )}

          {/* ref: detecta cuándo la tarjeta sale de la vista (resumen flotante) */}
          <div ref={refDocumentos}>
          <Card header={<CardHeader titleText={esAnticipo ? 'Solicitud de anticipo a pagar' : 'Documentos a Cancelar'} />}>
            <BusyIndicator active={isLoadingPartidas} style={{ width: '100%' }}>
              {partidas.length === 0 && !isLoadingPartidas ? (
                <div style={{ padding: '1rem' }}>
                  <MessageStrip design="Information">No hay documentos pendientes para este cliente</MessageStrip>
                </div>
              ) : (
                <Table
                  headerRow={
                    <TableHeaderRow>
                      <TableHeaderCell>Sel.</TableHeaderCell>
                      <TableHeaderCell>Estado</TableHeaderCell>
                      <TableHeaderCell>Referencia</TableHeaderCell>
                      <TableHeaderCell>Monto</TableHeaderCell>
                      <TableHeaderCell>Fecha</TableHeaderCell>
                      <TableHeaderCell>Vencimiento</TableHeaderCell>
                      <TableHeaderCell>Clase</TableHeaderCell>
                    </TableHeaderRow>
                  }
                >
                  {partidas.map((p) => {
                    const isSelected = selectedBelnrs.includes(p.belnr)
                    const bloqueada = !!p.motivoNoSeleccionable
                    return (
                      <TableRow
                        key={p.belnr}
                        onClick={() => togglePartida(p.belnr)}
                        title={p.motivoNoSeleccionable}
                        style={{
                          cursor: bloqueada ? 'not-allowed' : 'pointer',
                          opacity: bloqueada ? 0.6 : undefined,
                          backgroundColor: isSelected
                            ? 'rgba(13, 106, 208, 0.08)'
                            : undefined,
                          borderLeft: isSelected
                            ? '3px solid var(--sapSelectedColor, #0d6ad0)'
                            : '3px solid transparent',
                        }}
                        data-testid={`pago-partida-row-${p.belnr}`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            disabled={bloqueada}
                            aria-label={`Seleccionar documento ${p.etiqueta ?? p.belnr}`}
                          />
                        </TableCell>
                        <TableCell><SemaforoLabel semaforo={p.semaforo} /></TableCell>
                        <TableCell>{p.etiqueta ?? p.belnr}</TableCell>
                        <TableCell>{formatCLP(p.importe)}</TableCell>
                        <TableCell>{formatFecha(p.fechaDoc)}</TableCell>
                        <TableCell>{formatFecha(p.fechaVenc)}</TableCell>
                        <TableCell>{p.claseDoc}</TableCell>
                      </TableRow>
                    )
                  })}
                </Table>
              )}
            </BusyIndicator>
          </Card>
          </div>

          {/* Mensaje faltante */}
          {pagoEntries.length > 0 && faltante > 0 && !pagoParcialActivo && (
            <MessageStrip design="Critical" hideCloseButton>
              Falta {formatCLP(faltante)} para completar el pago{pagoParcialPosible ? ' (o marque "Pago parcial" en Totales)' : ''}
            </MessageStrip>
          )}
          {pagoParcialActivo && (
            <MessageStrip design="Information" hideCloseButton data-testid="aviso-pago-parcial">
              Pago parcial: se cobran {formatCLP(totalPagado)} y quedan pendientes {formatCLP(faltante)} de la factura (con su vencimiento original).
            </MessageStrip>
          )}

          {/* Error de cobro */}
          {errorCobro && (
            <MessageStrip design="Negative" data-testid="error-cobro">{errorCobro}</MessageStrip>
          )}
        </div>

        {/* ---- COLUMNA DERECHA: Medios de Pago ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Saldo a Favor (deshabilitado) */}
          <Button design="Default" disabled tabIndex={-1} style={{ width: '100%', opacity: 0.5 }}>
            Saldo a Favor
          </Button>

          {/* Vías de pago */}
          <Card header={<CardHeader titleText="Vías de Pago" />}>
            <div style={{ padding: '0.5rem 1rem', display: 'grid', gap: '0.5rem' }}>
              {MEDIOS_PAGO.map((mp) => {
                const medio = medios.find((m) => m.codigo === mp.codigo)
                return (
                  <div key={mp.codigo} style={{ display: 'grid', gap: '0.25rem' }}>
                    <Button
                      design={medio ? 'Emphasized' : 'Default'}
                      disabled={!mp.habilitado}
                      style={{ width: '100%', justifyContent: 'flex-start', opacity: mp.habilitado ? 1 : 0.5 }}
                      icon={mp.codigo === 'EFECTIVO' ? 'money-bills' : 'credit-card'}
                      tooltip={mp.habilitado ? (medio ? 'Editar, limpiar o cancelar' : 'Ingresar datos del pago') : 'Próximamente'}
                      onClick={() => setMedioAbierto(mp.codigo)}
                      data-testid={`btn-medio-${mp.codigo}`}
                    >
                      {mp.label}
                    </Button>
                    {medio && (
                      <div
                        style={{ fontSize: '0.8125rem', padding: '0.125rem 0.5rem', borderLeft: '3px solid var(--sapSelectedColor, #0d6ad0)', color: 'var(--sapTextColor)' }}
                        data-testid={`resumen-medio-${mp.codigo}`}
                      >
                        {resumenMedio(medio, nombreBanco)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Totales */}
          <Card header={<CardHeader titleText="Totales" />}>
            <div style={{ padding: '0.5rem 1rem', display: 'grid', gap: '0.4rem' }}>
              <FlexBox justifyContent="SpaceBetween">
                <Label>TOTAL A PAGAR</Label>
                <Text style={{ fontWeight: 'bold' }} data-testid="total-a-pagar">{formatCLP(totalAPagar)}</Text>
              </FlexBox>
              <FlexBox justifyContent="SpaceBetween">
                <Label>TOTAL PAGADO</Label>
                <Text data-testid="total-pagado">{formatCLP(totalPagado)}</Text>
              </FlexBox>
              <FlexBox justifyContent="SpaceBetween">
                <Label>TOTAL A DEVOLVER</Label>
                <Text style={{ color: vueltoMostrado > 0 ? 'var(--sapPositiveColor, #2b7c2b)' : undefined }} data-testid="total-a-devolver">
                  {formatCLP(vueltoMostrado)}
                </Text>
              </FlexBox>
              <FlexBox justifyContent="SpaceBetween">
                <Label>TOTAL A CTA.CTE.</Label>
                <Text data-testid="total-a-ctacte">{formatCLP((saldoAFavorActivo ? totalADevolver : 0) + excedenteCheques)}</Text>
              </FlexBox>
              {pagoParcialActivo && (
                <FlexBox justifyContent="SpaceBetween">
                  <Label>QUEDA PENDIENTE</Label>
                  <Text style={{ fontWeight: 'bold', color: 'var(--sapCriticalColor, #e9730c)' }} data-testid="total-pendiente">{formatCLP(faltante)}</Text>
                </FlexBox>
              )}
              {/* Pago residual (ZCOOP_PAYMENT_SRV, claves 09 + 04): una factura, monto menor al saldo */}
              {pagoParcialPosible && (
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={pagoParcialMarcado}
                    onChange={(e) => setPagoParcialMarcado(e.target.checked)}
                    data-testid="chk-pago-parcial"
                  />
                  <span>Pago parcial: cobrar {formatCLP(totalPagado)} y dejar pendientes {formatCLP(faltante)} de la factura (pago residual)</span>
                </label>
              )}
              {/* Escenario B (ZCOOP_PAYMENT_SRV): habilitado para pruebas; según José aplica a cheques */}
              {esSap && !esAnticipo && totalADevolver > 0 && (
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={excedenteAFavor}
                    onChange={(e) => setExcedenteAFavor(e.target.checked)}
                    data-testid="chk-saldo-favor"
                  />
                  <span>Dejar el excedente ({formatCLP(totalADevolver)}) como saldo a favor del cliente, en vez de vuelto (escenario B)</span>
                </label>
              )}
            </div>
          </Card>

          {/* Medios de pago seleccionados */}
          {pagoEntries.length > 0 && (
            <Card header={<CardHeader titleText="Medios de Pago Seleccionados" />}>
              <div style={{ padding: '0.5rem' }}>
                <Table
                  headerRow={
                    <TableHeaderRow>
                      <TableHeaderCell>Tipo</TableHeaderCell>
                      <TableHeaderCell>Fecha</TableHeaderCell>
                      <TableHeaderCell>Monto</TableHeaderCell>
                    </TableHeaderRow>
                  }
                >
                  {pagoEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.tipoPago}</TableCell>
                      <TableCell>{entry.fecha}</TableCell>
                      <TableCell>{formatCLP(entry.monto)}</TableCell>
                    </TableRow>
                  ))}
                </Table>
                <FlexBox justifyContent="End" style={{ marginTop: '0.5rem' }}>
                  <Button design="Transparent" onClick={limpiarPagos} data-testid="btn-limpiar-pagos">
                    Limpiar pagos
                  </Button>
                </FlexBox>
              </div>
            </Card>
          )}

          {hayMediosSinIntegracion && (
            <MessageStrip design="Critical" hideCloseButton data-testid="aviso-medios-sin-integracion">
              Pago con tarjeta o cheque pendiente de integración SAP: los datos quedan registrados en pantalla, pero
              "Ejecutar Pago" solo está disponible con Efectivo. Quite los demás medios para pagar en efectivo.
            </MessageStrip>
          )}
          {medios.length > 0 && (
            <JsonCopiable titulo="Medios de pago capturados (aún no se envían a SAP)" valor={medios} data-testid="json-medios-pago" />
          )}

          {esSap && !esAnticipo && <SoloModoTecnico><PendientesPagoSap /></SoloModoTecnico>}
          {esAnticipo && <SoloModoTecnico><PendientesAntCliente /></SoloModoTecnico>}

          {esAnticipo && (
            <MessageStrip design="Information" hideCloseButton data-testid="aviso-pago-anticipo">
              Solicitud de anticipo de SAP: "Ejecutar Pago" contabiliza un documento de cobro (clase DW) por el importe de la
              solicitud, que la compensa y deja al cliente con un anticipo a favor. Si recibe más efectivo, la diferencia es vuelto.
            </MessageStrip>
          )}

          {esSap && !esAnticipo && (
            <MessageStrip design="Information" hideCloseButton data-testid="aviso-pago-sap">
              Partidas de SAP (Pago Cta. Cte.): "Ejecutar Pago" contabiliza en SAP un documento de cobro
              (clase DW) que compensa las facturas seleccionadas. Se pide confirmación antes.
            </MessageStrip>
          )}

          {/* Acciones */}
          <Card>
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Button
                ref={ejecutarPagoRef as React.Ref<never>}
                design="Emphasized"
                icon="payment-approval"
                onClick={handleEjecutarPago}
                disabled={!canEjecutar || isCobrando}
                style={{ width: '100%' }}
                data-testid="btn-ejecutar-pago"
              >
                {isCobrando ? 'Procesando...' : 'Ejecutar Pago (F9)'}
              </Button>
              <Button
                design="Transparent"
                icon="decline"
                onClick={handleCancelar}
                style={{ width: '100%' }}
                data-testid="btn-cancelar-operacion"
              >
                Cancelar Operación (Esc)
              </Button>
            </div>
          </Card>

          {/* Mensajes */}
          <Card header={<CardHeader titleText="Mensajes" />}>
            <div style={{ padding: '0.5rem 1rem', minHeight: '40px' }}>
              {errorCobro && (
                <MessageStrip design="Negative" hideCloseButton>{errorCobro}</MessageStrip>
              )}
              {!errorCobro && pagoEntries.length === 0 && selectedBelnrs.length > 0 && (
                <MessageStrip design="Information" hideCloseButton>
                  Seleccione un medio de pago e ingrese el monto
                </MessageStrip>
              )}
              {!errorCobro && selectedBelnrs.length === 0 && (
                <MessageStrip design="Information" hideCloseButton>
                  Seleccione los documentos a cancelar
                </MessageStrip>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
