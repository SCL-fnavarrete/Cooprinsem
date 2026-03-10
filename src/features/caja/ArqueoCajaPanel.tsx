import { useState, useCallback } from 'react'
import {
  Title,
  Button,
  Input,
  Select,
  Option,
  FlexBox,
  MessageStrip,
  MessageBox,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Card,
  CardHeader,
  Label,
  BusyIndicator,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/add.js'
import '@ui5/webcomponents-icons/dist/delete.js'
import '@ui5/webcomponents-icons/dist/save.js'
import '@ui5/webcomponents-icons/dist/print.js'
import '@ui5/webcomponents-icons/dist/accept.js'
import { useUser } from '@/stores/userContext'
import { TIPOS_PAGO } from '@/types/arqueo'
import type { IArqueoDetalle, IArqueoCaja, ICierreCaja, TipoPagoCodigo } from '@/types/arqueo'
import { grabarArqueo, getArqueoDelDia, ejecutarCierre } from '@/services/api/arqueo'
import { formatCLP } from '@/utils/format'

type Vista = 'formulario' | 'cerrado'

export function ArqueoCajaPanel() {
  const { usuario } = useUser()
  const esAdmin = usuario?.rolCod === 1 // Rol 1 = Administrador — puede consultar y cerrar caja

  // Vista actual
  const [vista, setVista] = useState<Vista>('formulario')

  // --- Estado Cajero (rol 3) ---
  const [tipoPagoSeleccionado, setTipoPagoSeleccionado] = useState<TipoPagoCodigo>('EF')
  const [montoInput, setMontoInput] = useState('')
  const [detalles, setDetalles] = useState<IArqueoDetalle[]>([])
  const [isGrabando, setIsGrabando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [arqueoGrabado, setArqueoGrabado] = useState<IArqueoCaja | null>(null)

  // --- Estado Jefe Admin (rol 1) ---
  const [fechaCierre, setFechaCierre] = useState('')
  const [sucursalCierre, setSucursalCierre] = useState(usuario?.sucursal ?? 'D190')
  const [cajeroCierre, setCajeroCierre] = useState('')
  const [isConsultando, setIsConsultando] = useState(false)
  const [arqueoDia, setArqueoDia] = useState<IArqueoCaja | null>(null)
  const [cierre, setCierre] = useState<ICierreCaja | null>(null)
  const [isCerrando, setIsCerrando] = useState(false)
  const [showConfirmCierre, setShowConfirmCierre] = useState(false)

  // --- Cajero: agregar tipo de pago a la tabla ---
  const handleAgregar = useCallback(() => {
    const monto = parseInt(montoInput, 10)
    if (isNaN(monto) || monto <= 0) return

    const tipoPago = TIPOS_PAGO.find((t) => t.codigo === tipoPagoSeleccionado)
    if (!tipoPago) return

    // Si ya existe ese tipo, sumar el monto
    const existente = detalles.findIndex((d) => d.tipoPagoCodigo === tipoPagoSeleccionado)
    if (existente >= 0) {
      const nuevos = [...detalles]
      nuevos[existente] = { ...nuevos[existente], monto: nuevos[existente].monto + monto }
      setDetalles(nuevos)
    } else {
      setDetalles([...detalles, {
        tipoPagoCodigo: tipoPagoSeleccionado,
        tipoPagoDenominacion: tipoPago.denominacion,
        monto,
        moneda: 'CLP',
      }])
    }
    setMontoInput('')
  }, [tipoPagoSeleccionado, montoInput, detalles])

  const handleEliminar = useCallback((codigo: TipoPagoCodigo) => {
    setDetalles(detalles.filter((d) => d.tipoPagoCodigo !== codigo))
  }, [detalles])

  const totalArqueo = detalles.reduce((sum, d) => sum + d.monto, 0)

  // --- Cajero: grabar arqueo ---
  const handleGrabar = useCallback(async () => {
    if (detalles.length === 0) return
    setIsGrabando(true)
    setError(null)
    try {
      const hoy = new Date()
      const fechaCaja = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
      const result = await grabarArqueo({
        fechaCaja,
        sucursalId: usuario?.sucursal ?? 'D190',
        cajeroId: usuario?.id ?? 'cajero',
        detalles,
      })
      setArqueoGrabado(result)
      setVista('cerrado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al grabar arqueo')
    } finally {
      setIsGrabando(false)
    }
  }, [detalles, usuario])

  // --- Jefe Admin: consultar arqueo del día ---
  const handleConsultarArqueo = useCallback(async () => {
    if (!fechaCierre || !sucursalCierre || !cajeroCierre) return
    setIsConsultando(true)
    setError(null)
    setArqueoDia(null)
    setCierre(null)
    try {
      const result = await getArqueoDelDia({
        fechaCaja: fechaCierre,
        sucursalId: sucursalCierre,
        cajeroId: cajeroCierre,
      })
      setArqueoDia(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar arqueo')
    } finally {
      setIsConsultando(false)
    }
  }, [fechaCierre, sucursalCierre, cajeroCierre])

  // --- Jefe Admin: generar borrador de cierre ---
  const handleGenerarBorrador = useCallback(async () => {
    if (!arqueoDia) return
    setIsCerrando(true)
    setError(null)
    try {
      const result = await ejecutarCierre({
        arqueoId: arqueoDia.id,
        estado: 'BORRADOR',
        jefeAdminId: usuario?.id ?? 'admin',
      })
      setCierre(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar borrador')
    } finally {
      setIsCerrando(false)
    }
  }, [arqueoDia, usuario])

  // --- Jefe Admin: confirmar cierre definitivo ---
  const handleCierreDefinitivo = useCallback(async () => {
    if (!arqueoDia) return
    setShowConfirmCierre(false)
    setIsCerrando(true)
    setError(null)
    try {
      const result = await ejecutarCierre({
        arqueoId: arqueoDia.id,
        estado: 'DEFINITIVO',
        jefeAdminId: usuario?.id ?? 'admin',
      })
      setCierre(result)
      setVista('cerrado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar cierre definitivo')
    } finally {
      setIsCerrando(false)
    }
  }, [arqueoDia, usuario])

  const handleConfirmClose = useCallback((action: string | undefined) => {
    setShowConfirmCierre(false)
    if (action === 'OK') {
      handleCierreDefinitivo()
    }
  }, [handleCierreDefinitivo])

  const handleNuevoArqueo = useCallback(() => {
    setDetalles([])
    setMontoInput('')
    setError(null)
    setArqueoGrabado(null)
    setArqueoDia(null)
    setCierre(null)
    setFechaCierre('')
    setCajeroCierre('')
    setVista('formulario')
  }, [])

  // --- Vista cerrada (post-grabado o post-cierre) ---
  if (vista === 'cerrado') {
    const titulo = esAdmin ? 'Cierre de Caja Registrado' : 'Arqueo Grabado'
    const subtitulo = esAdmin && cierre
      ? `Cierre: ${cierre.id} — Estado: ${cierre.estado}`
      : arqueoGrabado
        ? `Arqueo: ${arqueoGrabado.id} — Estado: ${arqueoGrabado.estado}`
        : ''

    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <Title level="H3">Arqueo de Caja</Title>
        <div data-testid="arqueo-cerrado" style={{ maxWidth: '600px' }}>
          <Card header={<CardHeader titleText={titulo} subtitleText={subtitulo} />}>
            <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <MessageStrip design="Positive" hideCloseButton>
                {esAdmin ? 'Cierre de caja ejecutado exitosamente' : 'Arqueo grabado exitosamente'}
              </MessageStrip>

              {/* Tabla comparativa si es cierre */}
              {cierre && (
                <Table data-testid="tabla-cierre-final" headerRow={
                  <TableHeaderRow>
                    <TableHeaderCell>Tipo Pago</TableHeaderCell>
                    <TableHeaderCell>Arqueo</TableHeaderCell>
                    <TableHeaderCell>Recaudado</TableHeaderCell>
                    <TableHeaderCell>Diferencia</TableHeaderCell>
                  </TableHeaderRow>
                }>
                  {cierre.detalles.map((d) => (
                    <TableRow key={d.tipoPagoCodigo}>
                      <TableCell>{d.denominacion}</TableCell>
                      <TableCell>{formatCLP(d.montoArqueo)}</TableCell>
                      <TableCell>{formatCLP(d.montoRecaudado)}</TableCell>
                      <TableCell>
                        <span style={{ color: d.diferencia !== 0 ? 'var(--sapNegativeColor, red)' : 'inherit' }}>
                          {formatCLP(d.diferencia)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}

              {/* Detalles del arqueo si es cajero */}
              {!cierre && arqueoGrabado && (
                <>
                  {arqueoGrabado.detalles.map((d) => (
                    <Label key={d.tipoPagoCodigo}>
                      {d.tipoPagoDenominacion}: {formatCLP(d.monto)}
                    </Label>
                  ))}
                  <Label style={{ fontWeight: 'bold' }}>
                    Total: {formatCLP(arqueoGrabado.montoTotal)}
                  </Label>
                </>
              )}

              <FlexBox style={{ gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button design="Default" icon="print" onClick={() => window.print()}>
                  Imprimir
                </Button>
                <Button design="Emphasized" onClick={handleNuevoArqueo}>
                  Nuevo Arqueo
                </Button>
              </FlexBox>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // --- Vista formulario ---
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Title level="H3">Arqueo de Caja</Title>

      {error && (
        <MessageStrip design="Negative" hideCloseButton>
          {error}
        </MessageStrip>
      )}

      {/* ========== VISTA CAJERO (rol 3) ========== */}
      {!esAdmin && (
        <>
          <MessageStrip design="Information" hideCloseButton>
            Ingrese los montos por tipo de pago para cuadrar la caja del día.
          </MessageStrip>

          {/* Formulario de ingreso */}
          <FlexBox style={{ gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <Label>Tipo de Pago</Label>
              <Select
                onChange={(e) => {
                  const item = e.detail?.selectedOption
                  if (item) setTipoPagoSeleccionado(item.getAttribute('data-id') as TipoPagoCodigo)
                }}
                style={{ width: '220px' }}
                aria-label="Tipo de pago"
              >
                {TIPOS_PAGO.map((tp) => (
                  <Option key={tp.codigo} data-id={tp.codigo} selected={tp.codigo === tipoPagoSeleccionado}>
                    {tp.denominacion}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Monto</Label>
              <Input
                value={montoInput}
                onInput={(e: { target: { value: string } }) => setMontoInput(e.target.value)}
                placeholder="Ej: 450000"
                type="Number"
                style={{ width: '180px' }}
                aria-label="Monto"
              />
            </div>

            <Button
              icon="add"
              design="Emphasized"
              onClick={handleAgregar}
              disabled={!montoInput || parseInt(montoInput, 10) <= 0}
            >
              Agregar
            </Button>
          </FlexBox>

          {/* Tabla de detalles ingresados */}
          {detalles.length > 0 && (
            <>
              <Table data-testid="tabla-arqueo" headerRow={
                <TableHeaderRow>
                  <TableHeaderCell>Tipo Pago</TableHeaderCell>
                  <TableHeaderCell>Monto</TableHeaderCell>
                  <TableHeaderCell>Acciones</TableHeaderCell>
                </TableHeaderRow>
              }>
                {detalles.map((d) => (
                  <TableRow key={d.tipoPagoCodigo}>
                    <TableCell>{d.tipoPagoDenominacion}</TableCell>
                    <TableCell>{formatCLP(d.monto)}</TableCell>
                    <TableCell>
                      <Button
                        icon="delete"
                        design="Transparent"
                        onClick={() => handleEliminar(d.tipoPagoCodigo)}
                        aria-label={`Eliminar ${d.tipoPagoDenominacion}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </Table>

              <FlexBox justifyContent="SpaceBetween" style={{ alignItems: 'center' }}>
                <Title level="H4" data-testid="total-arqueo">
                  Total: {formatCLP(totalArqueo)}
                </Title>
                <Button
                  icon="save"
                  design="Emphasized"
                  onClick={handleGrabar}
                  disabled={isGrabando}
                >
                  {isGrabando ? 'Grabando...' : 'Grabar Arqueo'}
                </Button>
              </FlexBox>
            </>
          )}

          {detalles.length === 0 && (
            <MessageStrip design="Critical" hideCloseButton>
              Agregue al menos un tipo de pago para grabar el arqueo.
            </MessageStrip>
          )}
        </>
      )}

      {/* ========== VISTA JEFE ADMIN (rol 1) ========== */}
      {esAdmin && (
        <>
          <MessageStrip design="Information" hideCloseButton>
            Consulte el arqueo del cajero para generar el cierre de caja.
          </MessageStrip>

          {/* Parámetros de consulta */}
          <FlexBox style={{ gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <Label>Fecha</Label>
              <Input
                value={fechaCierre}
                onInput={(e: { target: { value: string } }) => setFechaCierre(e.target.value)}
                placeholder="DD/MM/YYYY"
                style={{ width: '150px' }}
                aria-label="Fecha cierre"
              />
            </div>

            <div>
              <Label>Sucursal</Label>
              <Input
                value={sucursalCierre}
                onInput={(e: { target: { value: string } }) => setSucursalCierre(e.target.value)}
                placeholder="Ej: D190"
                style={{ width: '120px' }}
                aria-label="Sucursal cierre"
              />
            </div>

            <div>
              <Label>Cajero</Label>
              <Input
                value={cajeroCierre}
                onInput={(e: { target: { value: string } }) => setCajeroCierre(e.target.value)}
                placeholder="ID cajero"
                style={{ width: '150px' }}
                aria-label="Cajero"
              />
            </div>

            <Button
              design="Emphasized"
              onClick={handleConsultarArqueo}
              disabled={!fechaCierre || !sucursalCierre || !cajeroCierre || isConsultando}
            >
              {isConsultando ? 'Consultando...' : 'Consultar Arqueo'}
            </Button>
          </FlexBox>

          {isConsultando && (
            <FlexBox justifyContent="Center" style={{ padding: '1rem' }}>
              <BusyIndicator active size="M" />
            </FlexBox>
          )}

          {/* Arqueo encontrado */}
          {arqueoDia && !cierre && (
            <Card header={<CardHeader titleText="Arqueo del Cajero" subtitleText={`ID: ${arqueoDia.id} — Cajero: ${arqueoDia.cajeroId}`} />}>
              <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <Table data-testid="tabla-arqueo-admin" headerRow={
                  <TableHeaderRow>
                    <TableHeaderCell>Tipo Pago</TableHeaderCell>
                    <TableHeaderCell>Monto Declarado</TableHeaderCell>
                  </TableHeaderRow>
                }>
                  {arqueoDia.detalles.map((d) => (
                    <TableRow key={d.tipoPagoCodigo}>
                      <TableCell>{d.tipoPagoDenominacion}</TableCell>
                      <TableCell>{formatCLP(d.monto)}</TableCell>
                    </TableRow>
                  ))}
                </Table>

                <Label style={{ fontWeight: 'bold' }}>
                  Total declarado: {formatCLP(arqueoDia.montoTotal)}
                </Label>

                <FlexBox justifyContent="End">
                  <Button
                    design="Emphasized"
                    onClick={handleGenerarBorrador}
                    disabled={isCerrando}
                  >
                    {isCerrando ? 'Generando...' : 'Generar Borrador de Cierre'}
                  </Button>
                </FlexBox>
              </div>
            </Card>
          )}

          {/* Borrador de cierre — tabla comparativa */}
          {cierre && cierre.estado === 'BORRADOR' && (
            <Card header={<CardHeader titleText="Borrador de Cierre" subtitleText={`ID: ${cierre.id}`} />}>
              <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <Table data-testid="tabla-cierre-borrador" headerRow={
                  <TableHeaderRow>
                    <TableHeaderCell>Tipo Pago</TableHeaderCell>
                    <TableHeaderCell>Arqueo (Cajero)</TableHeaderCell>
                    <TableHeaderCell>Recaudado (Sistema)</TableHeaderCell>
                    <TableHeaderCell>Diferencia</TableHeaderCell>
                  </TableHeaderRow>
                }>
                  {cierre.detalles.map((d) => (
                    <TableRow key={d.tipoPagoCodigo}>
                      <TableCell>{d.denominacion}</TableCell>
                      <TableCell>{formatCLP(d.montoArqueo)}</TableCell>
                      <TableCell>{formatCLP(d.montoRecaudado)}</TableCell>
                      <TableCell>
                        <span
                          data-testid={`diferencia-${d.tipoPagoCodigo}`}
                          style={{
                            color: d.diferencia !== 0 ? 'var(--sapNegativeColor, red)' : 'var(--sapPositiveColor, green)',
                            fontWeight: 'bold',
                          }}
                        >
                          {formatCLP(d.diferencia)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>

                <FlexBox justifyContent="End" style={{ gap: '0.5rem' }}>
                  <Button design="Default" onClick={handleNuevoArqueo}>
                    Cancelar
                  </Button>
                  <Button
                    icon="accept"
                    design="Emphasized"
                    onClick={() => setShowConfirmCierre(true)}
                    disabled={isCerrando}
                  >
                    Confirmar Cierre Definitivo
                  </Button>
                </FlexBox>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Confirmación de cierre definitivo */}
      {showConfirmCierre && (
        <MessageBox
          type="Confirm"
          open
          onClose={handleConfirmClose}
        >
          ¿Confirma el cierre definitivo de caja? Esta acción no se puede deshacer.
        </MessageBox>
      )}
    </div>
  )
}
