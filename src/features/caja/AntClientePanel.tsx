import { useState, useCallback } from 'react'
import {
  Title,
  Button,
  Label,
  Input,
  FlexBox,
  Card,
  CardHeader,
  MessageStrip,
  BusyIndicator,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/print.js'
import { buscarAnticipo } from '@/services/api/anticipos'
import { registrarCobroEfectivo } from '@/services/api/cobros'
import { PagoEfectivoModal } from '@/components/pos/PagoEfectivoModal'
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
  const [estado, setEstado] = useState<Estado>('busqueda')

  // Formulario de búsqueda
  const [kunnr, setKunnr] = useState('')
  const [nroComprobante, setNroComprobante] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Anticipo encontrado
  const [anticipo, setAnticipo] = useState<IAnticipo | null>(null)

  // Modal de pago
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [isCobrando, setIsCobrando] = useState(false)

  // Comprobante
  const [comprobante, setComprobante] = useState<ComprobanteAnticipo | null>(null)

  const handleBuscar = useCallback(async () => {
    if (!kunnr.trim() || !nroComprobante.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await buscarAnticipo({ kunnr: kunnr.trim(), nroComprobante: nroComprobante.trim() })
      setAnticipo(result)
      setEstado('confirmacion')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar anticipo')
    } finally {
      setIsLoading(false)
    }
  }, [kunnr, nroComprobante])

  const handleCancelar = useCallback(() => {
    setAnticipo(null)
    setError(null)
    setEstado('busqueda')
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
    setKunnr('')
    setNroComprobante('')
    setAnticipo(null)
    setComprobante(null)
    setError(null)
    setEstado('busqueda')
  }, [])

  const handleImprimir = useCallback(() => {
    window.print()
  }, [])

  const canBuscar = kunnr.trim().length > 0 && nroComprobante.trim().length > 0 && !isLoading

  // Construir ICliente mínimo para PagoEfectivoModal
  const clienteParaModal: ICliente | null = anticipo
    ? {
        codigoCliente: anticipo.kunnr,
        nombre: anticipo.nombre,
        rut: anticipo.rut,
        condicionPago: 'CONT',
        estadoCredito: 'AL_DIA',
        creditoAsignado: 0,
        creditoUtilizado: 0,
        porcentajeAgotamiento: 0,
        sucursal: usuario?.sucursal ?? 'D190',
      }
    : null

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Title level="H3">Anticipo de Cliente</Title>

      {/* Estado 1 — Formulario de búsqueda */}
      {estado === 'busqueda' && (
        <>
          <MessageStrip design="Information" hideCloseButton>
            Ingrese el código del cliente y el Nº de comprobante SAP para buscar el anticipo pendiente (clase DZ).
          </MessageStrip>

          <FlexBox direction="Column" style={{ gap: '0.75rem', maxWidth: '400px' }}>
            <div>
              <Label>Código Cliente SAP</Label>
              <Input
                value={kunnr}
                onInput={(e: { target: { value: string } }) => setKunnr(e.target.value)}
                placeholder="Ej: 0001000001"
                style={{ width: '100%' }}
                aria-label="Código cliente"
              />
            </div>

            <div>
              <Label>Nº Comprobante SAP</Label>
              <Input
                value={nroComprobante}
                onInput={(e: { target: { value: string } }) => setNroComprobante(e.target.value)}
                placeholder="Ej: 1400000015"
                style={{ width: '100%' }}
                aria-label="Nº comprobante"
              />
            </div>

            <Button
              design="Emphasized"
              icon="search"
              onClick={handleBuscar}
              disabled={!canBuscar}
            >
              {isLoading ? 'Buscando...' : 'Buscar'}
            </Button>
          </FlexBox>

          {isLoading && (
            <FlexBox justifyContent="Center" style={{ padding: '1rem' }}>
              <BusyIndicator active size="M" data-testid="loading-indicator" />
            </FlexBox>
          )}

          {error && (
            <MessageStrip design="Negative" hideCloseButton>
              {error}
            </MessageStrip>
          )}
        </>
      )}

      {/* Estado 2 — Confirmación del anticipo encontrado */}
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
      {clienteParaModal && (
        <PagoEfectivoModal
          open={showPagoModal}
          totalACobrar={anticipo?.importe ?? 0}
          cliente={clienteParaModal}
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
