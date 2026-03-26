import { useState, useCallback, useEffect, useRef } from 'react'
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
  Input,
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
import type { InputDomRef } from '@ui5/webcomponents-react'
import { usePagoDetalle } from '@/hooks/usePagoDetalle'
import { useUser } from '@/stores/userContext'
import { MEDIOS_PAGO, SUCURSALES, SAP_SOCIEDAD } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'
import { formatCLP, formatRUT, formatFecha, formatFechaSAP } from '@/utils/format'
import type { Semaforo } from '@/types/caja'

const SEMAFORO_CONFIG = {
  verde:    { icon: 'status-positive', color: 'var(--sapPositiveColor, #2b7c2b)', text: 'Vigente' },
  amarillo: { icon: 'status-critical', color: 'var(--sapCriticalColor, #e9730c)', text: 'Por vencer' },
  rojo:     { icon: 'status-negative', color: 'var(--sapNegativeColor, #bb0000)', text: 'Vencida' },
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
  const navigate = useNavigate()
  const { usuario } = useUser()
  const sucursal = usuario?.sucursal ?? 'D190'

  const [montoInput, setMontoInput] = useState('')  // valor numérico limpio (sin puntos)
  const [montoDisplay, setMontoDisplay] = useState('')  // valor formateado con separador de miles
  const [showComprobante, setShowComprobante] = useState(false)

  const montoInputRef = useRef<InputDomRef>(null)
  const ejecutarPagoRef = useRef<HTMLButtonElement>(null)

  const {
    cliente,
    isLoadingCliente,
    errorCliente,
    partidas,
    isLoadingPartidas,
    errorPartidas,
    selectedBelnrs,
    togglePartida,
    pagoEntries,
    agregarPagoEfectivo,
    limpiarPagos,
    totalAPagar,
    totalPagado,
    totalADevolver,
    ejecutarPago,
    isCobrando,
    errorCobro,
    resultadoCobro,
  } = usePagoDetalle({ kunnr, belnrPreseleccionado: belnr })

  // Auto-rellenar monto recibido con el total seleccionado (solo si no hay pagos ya agregados)
  useEffect(() => {
    if (pagoEntries.length > 0) return  // no pisar si ya agregó un pago
    if (totalAPagar > 0) {
      const digits = String(totalAPagar)
      setMontoInput(digits)
      setMontoDisplay(`$${totalAPagar.toLocaleString('es-CL')}`)
    } else {
      setMontoInput('')
      setMontoDisplay('')
    }
  }, [totalAPagar, pagoEntries.length])

  const handleMontoInput = useCallback((rawValue: string) => {
    // Solo dígitos
    const digits = rawValue.replace(/\D/g, '')
    setMontoInput(digits)
    if (digits === '') {
      setMontoDisplay('')
    } else {
      // Formatear con separador de miles chileno
      setMontoDisplay(`$${parseInt(digits, 10).toLocaleString('es-CL')}`)
    }
  }, [])

  const handleEfectivoClick = useCallback(() => {
    const monto = parseInt(montoInput, 10)
    if (isNaN(monto) || monto <= 0) return
    agregarPagoEfectivo(monto)
    setMontoInput('')
    setMontoDisplay('')
    // Foco inteligente: si el pago cubre el total → Ejecutar Pago, sino → volver a monto
    setTimeout(() => {
      if (monto >= totalAPagar) {
        ejecutarPagoRef.current?.focus()
      } else {
        montoInputRef.current?.focus()
      }
    }, 50)
  }, [montoInput, agregarPagoEfectivo, totalAPagar])

  const handleEjecutarPago = useCallback(async () => {
    try {
      await ejecutarPago()
      setShowComprobante(true)
    } catch {
      // errorCobro ya se setea en el hook
    }
  }, [ejecutarPago])

  const handleCancelar = useCallback(() => {
    navigate('/caja')
  }, [navigate])

  const handleImprimir = useCallback(() => {
    window.print()
  }, [])

  // Auto-focus en input monto al cargar partidas preseleccionadas
  useEffect(() => {
    if (!isLoadingPartidas && selectedBelnrs.length > 0) {
      setTimeout(() => montoInputRef.current?.focus(), 100)
    }
  }, [isLoadingPartidas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Atajos de teclado globales
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault()
        if (canEjecutarRef.current && !isCobrando) {
          handleEjecutarPago()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancelar()
      } else if (e.key === 'F2') {
        e.preventDefault()
        montoInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleEjecutarPago, handleCancelar, isCobrando])

  const canEjecutar = totalPagado >= totalAPagar && totalAPagar > 0 && selectedBelnrs.length > 0
  const faltante = totalAPagar - totalPagado

  // Ref para acceder a canEjecutar dentro del event listener sin re-registrarlo
  const canEjecutarRef = useRef(canEjecutar)
  canEjecutarRef.current = canEjecutar

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
              <Label>Efectivo recibido: {formatCLP(totalPagado)}</Label>
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
      <FlexBox style={{ marginBottom: '1rem', gap: '0.5rem', alignItems: 'center' }}>
        <Button icon="nav-back" design="Transparent" onClick={handleCancelar} tooltip="Volver a Caja" />
        <Title level="H3">Detalle de Pago</Title>
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
              {cliente && (
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

          <Card header={<CardHeader titleText="Documentos a Cancelar" />}>
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
                    return (
                      <TableRow
                        key={p.belnr}
                        onClick={() => togglePartida(p.belnr)}
                        style={{
                          cursor: 'pointer',
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
                            aria-label={`Seleccionar documento ${p.belnr}`}
                          />
                        </TableCell>
                        <TableCell><SemaforoLabel semaforo={p.semaforo} /></TableCell>
                        <TableCell>{p.belnr}</TableCell>
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

          {/* Mensaje faltante */}
          {pagoEntries.length > 0 && faltante > 0 && (
            <MessageStrip design="Critical" hideCloseButton>
              Falta {formatCLP(faltante)} para completar el pago
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
              {MEDIOS_PAGO.map((mp) => (
                <Button
                  key={mp.codigo}
                  design={mp.habilitado ? 'Default' : 'Default'}
                  disabled={!mp.habilitado}
                  tabIndex={-1}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    opacity: mp.habilitado ? 1 : 0.5,
                  }}
                  icon={mp.codigo === 'EFECTIVO' ? 'money-bills' : 'credit-card'}
                  onClick={mp.codigo === 'EFECTIVO' ? handleEfectivoClick : undefined}
                  data-testid={`btn-medio-${mp.codigo}`}
                >
                  {mp.label}
                </Button>
              ))}

              {/* Input monto efectivo */}
              <FlexBox style={{ gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                <Input
                  ref={montoInputRef}
                  placeholder="Monto recibido"
                  value={montoDisplay}
                  onInput={(e) => handleMontoInput((e.target as InputDomRef).value ?? '')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleEfectivoClick() }
                  }}
                  style={{ flex: 1 }}
                  data-testid="input-monto-efectivo"
                />
                <Button
                  design="Emphasized"
                  icon="money-bills"
                  onClick={handleEfectivoClick}
                  disabled={!montoInput || parseInt(montoInput, 10) <= 0}
                  data-testid="btn-agregar-efectivo"
                >
                  Agregar
                </Button>
              </FlexBox>
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
                <Text style={{ color: totalADevolver > 0 ? 'var(--sapPositiveColor, #2b7c2b)' : undefined }} data-testid="total-a-devolver">
                  {formatCLP(totalADevolver)}
                </Text>
              </FlexBox>
              <FlexBox justifyContent="SpaceBetween">
                <Label>TOTAL A CTA.CTE.</Label>
                <Text>$0</Text>
              </FlexBox>
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
