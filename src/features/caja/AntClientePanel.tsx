import { useState, useCallback } from 'react'
import {
  Title,
  Button,
  Label,
  FlexBox,
  MessageStrip,
  BusyIndicator,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/payment-approval.js'
import { getSolicitudesAnticipo } from '@/services/api/sapCtaCte'
import { ClienteSearch } from '@/components/pos/ClienteSearch'
import { AnticipoCajaDialog } from '@/components/pos/AnticipoCajaDialog'
import { useUser } from '@/stores/userContext'
import { formatCLP, formatFecha } from '@/utils/format'
import type { ICliente } from '@/types/cliente'
import type { ISolicitudAnticipo } from '@/types/ctaCte'
import { SoloModoTecnico } from '@/components/common/SoloModoTecnico'
import { PendientesAntCliente } from './PendientesAntCliente'

// Caja > Ant. Cliente (correo de José y especificación de Priscila, 20-10-2026):
// la cajera cobra una solicitud de anticipo que la jefatura creó en SAP (F-37,
// CME F). Puede buscar el cliente y elegir una de sus solicitudes abiertas, o
// ingresar directamente el N° con el botón "Anticipo". En ambos casos el popup
// "Anticipos" muestra los datos de la solicitud y lleva a la pantalla de pago.
// Solo consulta: el Visualizador puede usarlo (la confirmación del pago queda
// deshabilitada en la pantalla de pago).
export function AntClientePanel() {
  const { usuario } = useUser()
  const sucursal = usuario?.sucursal ?? 'D190'

  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null)
  const [solicitudes, setSolicitudes] = useState<ISolicitudAnticipo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Popup "Anticipos": vacío (botón) o precargado con la solicitud elegida en la tabla.
  const [popup, setPopup] = useState<{ open: boolean; documento?: string; ejercicio?: string }>({ open: false })

  const cargarSolicitudes = useCallback(async (cliente: ICliente) => {
    setIsLoading(true)
    setError(null)
    try {
      const r = await getSolicitudesAnticipo(cliente.codigoCliente)
      if (r.success) {
        setSolicitudes(r.data ?? [])
      } else {
        setSolicitudes([])
        setError(r.message ?? 'No se pudieron consultar las solicitudes de anticipo en SAP')
      }
    } catch (err) {
      setSolicitudes([])
      setError(err instanceof Error ? `Error de red al consultar SAP: ${err.message}` : 'Error de red al consultar SAP')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleClienteSeleccionado = useCallback((cliente: ICliente) => {
    setClienteSeleccionado(cliente)
    cargarSolicitudes(cliente)
  }, [cargarSolicitudes])

  const handleClienteDeseleccionado = useCallback(() => {
    setClienteSeleccionado(null)
    setSolicitudes([])
    setError(null)
  }, [])

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <FlexBox justifyContent="SpaceBetween" alignItems="Center" wrap="Wrap" style={{ gap: '0.75rem' }}>
        <Title level="H3">Anticipo de Cliente</Title>
        <Button design="Emphasized" icon="payment-approval" onClick={() => setPopup({ open: true })} data-testid="btn-anticipo">
          Anticipo
        </Button>
      </FlexBox>

      <SoloModoTecnico><PendientesAntCliente /></SoloModoTecnico>

      <MessageStrip design="Information" hideCloseButton>
        Busque el cliente por RUT, nombre o código para ver sus solicitudes de anticipo abiertas en SAP (creadas por la jefatura),
        o use el botón "Anticipo" para ingresar el N° de documento de la solicitud.
      </MessageStrip>

      <div style={{ maxWidth: '640px' }}>
        <ClienteSearch
          onClienteSeleccionado={handleClienteSeleccionado}
          onClienteDeseleccionado={handleClienteDeseleccionado}
          sucursal={sucursal}
          ocultarClienteBoleta
          ocultarPanelCredito
        />
      </div>

      {isLoading && (
        <FlexBox justifyContent="Center" style={{ padding: '1rem' }}>
          <BusyIndicator active size="M" data-testid="loading-anticipos" />
        </FlexBox>
      )}

      {error && (
        <MessageStrip design="Negative" hideCloseButton data-testid="error-anticipos">
          {error}
        </MessageStrip>
      )}

      {clienteSeleccionado && !isLoading && !error && solicitudes.length > 0 && (
        <div data-testid="tabla-anticipos" style={{ minWidth: 0, overflowX: 'auto' }}>
          <Title level="H5" style={{ marginBottom: '0.5rem' }}>
            Solicitudes de anticipo abiertas — {clienteSeleccionado.nombre}
          </Title>
          <Table
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell>Nº Documento</TableHeaderCell>
                <TableHeaderCell>Fecha</TableHeaderCell>
                <TableHeaderCell>Vencimiento</TableHeaderCell>
                <TableHeaderCell>Asignación</TableHeaderCell>
                <TableHeaderCell>Texto</TableHeaderCell>
                <TableHeaderCell>Importe</TableHeaderCell>
                <TableHeaderCell>Acción</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {solicitudes.map((s) => (
              <TableRow key={`${s.documento}-${s.posicion}-${s.ejercicio}`}>
                <TableCell>{s.documento}</TableCell>
                <TableCell>{s.fechaDocumento ? formatFecha(s.fechaDocumento) : '—'}</TableCell>
                <TableCell>{s.fechaVencimiento ? formatFecha(s.fechaVencimiento) : '—'}</TableCell>
                <TableCell>{s.asignacion || '—'}</TableCell>
                <TableCell>{s.texto || '—'}</TableCell>
                <TableCell>
                  <Label style={{ fontWeight: 'bold' }}>{formatCLP(s.monto)}</Label>
                </TableCell>
                <TableCell>
                  <Button
                    design="Emphasized"
                    onClick={() => setPopup({ open: true, documento: s.documento, ejercicio: s.ejercicio })}
                    data-testid={`seleccionar-${s.documento}`}
                  >
                    Seleccionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>
      )}

      {clienteSeleccionado && !isLoading && !error && solicitudes.length === 0 && (
        <MessageStrip design="Critical" hideCloseButton data-testid="sin-anticipos">
          El cliente {clienteSeleccionado.nombre} no tiene solicitudes de anticipo abiertas en SAP. La jefatura debe crearla antes (F-37).
        </MessageStrip>
      )}

      {/* Se monta solo abierto: así cada apertura parte limpia y no queda un segundo buscador en el DOM */}
      {popup.open && (
        <AnticipoCajaDialog
          open
          sucursal={sucursal}
          clienteInicial={clienteSeleccionado}
          documentoInicial={popup.documento}
          ejercicioInicial={popup.ejercicio}
          onCancelar={() => setPopup({ open: false })}
        />
      )}
    </div>
  )
}
