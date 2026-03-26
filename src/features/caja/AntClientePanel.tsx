import { useState, useCallback } from 'react'
import {
  Title,
  Button,
  Label,
  FlexBox,
  Card,
  CardHeader,
  MessageStrip,
  BusyIndicator,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/print.js'
import { listarAnticiposPendientes } from '@/services/api/anticipos'
import { registrarCobroEfectivo } from '@/services/api/cobros'
import { PagoEfectivoModal } from '@/components/pos/PagoEfectivoModal'
import { ClienteSearch } from '@/components/pos/ClienteSearch'
import { useUser } from '@/stores/userContext'
import { formatCLP, formatFecha, formatFechaSAP } from '@/utils/format'
import type { IAnticipo } from '@/types/anticipo'
import type { ICliente } from '@/types/cliente'
import type { IResultadoCobro } from '@/types/caja'

type Estado = 'busqueda' | 'confirmacion' | 'comprobante'

interface ComprobanteAnticipo {
  resultado: IResultadoCobro
  anticipo: IAnticipo
  montoRecibido: number
  vuelto: number
  fecha: string
  hora: string
}

export function AntClientePanel() {
  const { usuario } = useUser()
  const sucursal = usuario?.sucursal ?? 'D190'
  const [estado, setEstado] = useState<Estado>('busqueda')

  // Cliente seleccionado
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null)

  // Lista de anticipos pendientes del cliente
  const [anticiposPendientes, setAnticiposPendientes] = useState<IAnticipo[]>([])
  const [isLoadingAnticipos, setIsLoadingAnticipos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Anticipo seleccionado para cobrar
  const [anticipo, setAnticipo] = useState<IAnticipo | null>(null)

  // Modal de pago
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [isCobrando, setIsCobrando] = useState(false)

  // Comprobante
  const [comprobante, setComprobante] = useState<ComprobanteAnticipo | null>(null)

  const handleClienteSeleccionado = useCallback(async (cliente: ICliente) => {
    setClienteSeleccionado(cliente)
    setError(null)
    setIsLoadingAnticipos(true)
    try {
      const results = await listarAnticiposPendientes(cliente.codigoCliente)
      setAnticiposPendientes(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar anticipos')
      setAnticiposPendientes([])
    } finally {
      setIsLoadingAnticipos(false)
    }
  }, [])

  const handleClienteDeseleccionado = useCallback(() => {
    setClienteSeleccionado(null)
    setAnticiposPendientes([])
    setError(null)
  }, [])

  const handleSeleccionarAnticipo = useCallback((ant: IAnticipo) => {
    setAnticipo(ant)
    setError(null)
    setEstado('confirmacion')
  }, [])

  const handleCancelar = useCallback(() => {
    setAnticipo(null)
    setError(null)
    setEstado('busqueda')
    // Mantiene clienteSeleccionado y anticiposPendientes para no re-buscar
  }, [])

  const handleConfirmarCobro = useCallback(async (montoRecibido: number) => {
    if (!anticipo) return

    setIsCobrando(true)
    try {
      const resultado = await registrarCobroEfectivo({
        kunnr: anticipo.kunnr,
        monto: anticipo.importe,
        montoRecibido,
        medio_pago: 'EFECTIVO',
        belnrs_cancelados: [anticipo.nroComprobante],
      })

      const ahora = new Date()
      setComprobante({
        resultado,
        anticipo,
        montoRecibido,
        vuelto: montoRecibido - anticipo.importe,
        fecha: formatFecha(formatFechaSAP(ahora)),
        hora: ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      })
      setShowPagoModal(false)
      setEstado('comprobante')
    } catch {
      setShowPagoModal(false)
      setError('Error al registrar el cobro del anticipo')
    } finally {
      setIsCobrando(false)
    }
  }, [anticipo])

  const handleNuevoAnticipo = useCallback(() => {
    setClienteSeleccionado(null)
    setAnticiposPendientes([])
    setAnticipo(null)
    setComprobante(null)
    setError(null)
    setEstado('busqueda')
  }, [])

  const handleImprimir = useCallback(() => {
    window.print()
  }, [])

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Title level="H3">Anticipo de Cliente</Title>

      {/* Estado 1 — Buscar cliente + tabla de anticipos pendientes */}
      {estado === 'busqueda' && (
        <>
          <MessageStrip design="Information" hideCloseButton>
            Busque el cliente por RUT, nombre o código para ver sus anticipos pendientes (clase DZ).
          </MessageStrip>

          <div style={{ maxWidth: '500px' }}>
            <ClienteSearch
              onClienteSeleccionado={handleClienteSeleccionado}
              onClienteDeseleccionado={handleClienteDeseleccionado}
              sucursal={sucursal}
            />
          </div>

          {isLoadingAnticipos && (
            <FlexBox justifyContent="Center" style={{ padding: '1rem' }}>
              <BusyIndicator active size="M" data-testid="loading-anticipos" />
            </FlexBox>
          )}

          {error && (
            <MessageStrip design="Negative" hideCloseButton>
              {error}
            </MessageStrip>
          )}

          {/* Tabla de anticipos pendientes */}
          {clienteSeleccionado && !isLoadingAnticipos && anticiposPendientes.length > 0 && (
            <div data-testid="tabla-anticipos">
              <Title level="H5" style={{ marginBottom: '0.5rem' }}>
                Anticipos Pendientes — {clienteSeleccionado.nombre}
              </Title>
              <Table
                headerRow={
                  <TableHeaderRow>
                    <TableHeaderCell>Nro Comprobante</TableHeaderCell>
                    <TableHeaderCell>Fecha</TableHeaderCell>
                    <TableHeaderCell>Glosa</TableHeaderCell>
                    <TableHeaderCell>Importe</TableHeaderCell>
                    <TableHeaderCell>Acción</TableHeaderCell>
                  </TableHeaderRow>
                }
              >
                {anticiposPendientes.map((ant) => (
                  <TableRow key={ant.nroComprobante}>
                    <TableCell>{ant.nroComprobante}</TableCell>
                    <TableCell>{ant.fechaDoc}</TableCell>
                    <TableCell>{ant.glosa}</TableCell>
                    <TableCell>
                      <Label style={{ fontWeight: 'bold' }}>{formatCLP(ant.importe)}</Label>
                    </TableCell>
                    <TableCell>
                      <Button
                        design="Emphasized"
                        onClick={() => handleSeleccionarAnticipo(ant)}
                        data-testid={`seleccionar-${ant.nroComprobante}`}
                      >
                        Seleccionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          )}

          {/* Sin anticipos pendientes */}
          {clienteSeleccionado && !isLoadingAnticipos && anticiposPendientes.length === 0 && !error && (
            <MessageStrip design="Critical" hideCloseButton data-testid="sin-anticipos">
              El cliente {clienteSeleccionado.nombre} no tiene anticipos pendientes.
            </MessageStrip>
          )}
        </>
      )}

      {/* Estado 2 — Confirmación del anticipo seleccionado */}
      {estado === 'confirmacion' && anticipo && (
        <Card
          header={
            <CardHeader
              titleText="Anticipo Encontrado"
              subtitleText={`Comprobante: ${anticipo.nroComprobante}`}
            />
          }
        >
          <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
              <Label>Cliente: {anticipo.nombre}</Label>
              {anticipo.rut && <Label>RUT: {anticipo.rut}</Label>}
              <Label>Nº Comprobante: {anticipo.nroComprobante}</Label>
              <Label>Fecha: {anticipo.fechaDoc}</Label>
              {anticipo.glosa && <Label>Glosa: {anticipo.glosa}</Label>}
            </FlexBox>

            <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
              <Label style={{ fontWeight: 'bold' }}>Importe</Label>
              <Title level="H3" data-testid="importe-anticipo">
                {formatCLP(anticipo.importe)}
              </Title>
            </FlexBox>

            {error && (
              <MessageStrip design="Negative" hideCloseButton>
                {error}
              </MessageStrip>
            )}

            <FlexBox style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button design="Default" onClick={handleCancelar}>
                Cancelar
              </Button>
              <Button design="Emphasized" onClick={() => setShowPagoModal(true)}>
                Procesar Pago
              </Button>
            </FlexBox>
          </div>
        </Card>
      )}

      {/* Modal de pago efectivo (reutilizado) */}
      {clienteSeleccionado && (
        <PagoEfectivoModal
          open={showPagoModal}
          totalACobrar={anticipo?.importe ?? 0}
          cliente={clienteSeleccionado}
          documentosSeleccionados={anticipo ? [anticipo.nroComprobante] : []}
          onConfirmar={handleConfirmarCobro}
          onCancelar={() => setShowPagoModal(false)}
          isCobrando={isCobrando}
        />
      )}

      {/* Estado 3 — Comprobante post-pago */}
      {estado === 'comprobante' && comprobante && (
        <div data-testid="comprobante-anticipo" style={{ maxWidth: '500px' }}>
          <Card
            header={
              <CardHeader
                titleText="Comprobante de Anticipo"
                subtitleText={`Documento SAP: ${comprobante.resultado.BELNR} — Clase ${comprobante.resultado.BLART}`}
              />
            }
          >
            <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <MessageStrip design="Positive" hideCloseButton>
                Anticipo cobrado exitosamente
              </MessageStrip>

              <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
                <Label style={{ fontWeight: 'bold' }}>N° Documento SAP</Label>
                <Title level="H4">{comprobante.resultado.BELNR}</Title>
              </FlexBox>

              <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
                <Label>Cliente: {comprobante.anticipo.nombre}</Label>
                {comprobante.anticipo.rut && <Label>RUT: {comprobante.anticipo.rut}</Label>}
                <Label>Comprobante anticipo: {comprobante.anticipo.nroComprobante}</Label>
              </FlexBox>

              <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
                <Label>Monto anticipo: {formatCLP(comprobante.anticipo.importe)}</Label>
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
                <Button design="Emphasized" onClick={handleNuevoAnticipo}>
                  Nuevo Anticipo
                </Button>
              </FlexBox>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
