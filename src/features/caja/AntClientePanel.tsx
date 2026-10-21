import { useState, useCallback } from 'react'
import {
  Title,
  Button,
  FlexBox,
  MessageStrip,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/payment-approval.js'
import { ClienteSearch } from '@/components/pos/ClienteSearch'
import { AnticipoCajaDialog } from '@/components/pos/AnticipoCajaDialog'
import { useUser } from '@/stores/userContext'
import type { ICliente } from '@/types/cliente'
import { SoloModoTecnico } from '@/components/common/SoloModoTecnico'
import { PendientesAntCliente } from './PendientesAntCliente'

// Caja > Ant. Cliente (correo de José y especificación de Priscila, 20-10-2026):
// la cajera cobra una solicitud de anticipo que la jefatura creó en SAP (F-37,
// CME F). Todo se hace en el popup "Anticipos" (botón "Anticipo"): cliente,
// select con sus solicitudes abiertas (o el N° digitado), datos de la
// solicitud e "Ir a pagar". El buscador de esta pantalla solo precarga el
// cliente en el popup.
// Solo consulta: el Visualizador puede usarlo (la confirmación del pago queda
// deshabilitada en la pantalla de pago).
export function AntClientePanel() {
  const { usuario } = useUser()
  const sucursal = usuario?.sucursal ?? 'D190'

  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null)
  const [popupAbierto, setPopupAbierto] = useState(false)

  const handleClienteSeleccionado = useCallback((cliente: ICliente) => {
    setClienteSeleccionado(cliente)
    setPopupAbierto(true)
  }, [])

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <FlexBox justifyContent="SpaceBetween" alignItems="Center" wrap="Wrap" style={{ gap: '0.75rem' }}>
        <Title level="H3">Anticipo de Cliente</Title>
        <Button design="Emphasized" icon="payment-approval" onClick={() => setPopupAbierto(true)} data-testid="btn-anticipo">
          Anticipo
        </Button>
      </FlexBox>

      <SoloModoTecnico><PendientesAntCliente /></SoloModoTecnico>

      <MessageStrip design="Information" hideCloseButton>
        Busque el cliente por RUT, nombre o código (o presione "Anticipo"): se abre la ventana "Anticipos" para elegir la
        solicitud de anticipo abierta en SAP (creada por la jefatura) e ir a pagarla.
      </MessageStrip>

      <div style={{ maxWidth: '640px' }}>
        <ClienteSearch
          onClienteSeleccionado={handleClienteSeleccionado}
          onClienteDeseleccionado={() => setClienteSeleccionado(null)}
          sucursal={sucursal}
          ocultarClienteBoleta
          ocultarPanelCredito
        />
      </div>

      {/* Popup "Anticipos" (se monta solo abierto: no deja un segundo buscador en el DOM) */}
      {popupAbierto && (
        <AnticipoCajaDialog
          open
          sucursal={sucursal}
          clienteInicial={clienteSeleccionado}
          onCancelar={() => setPopupAbierto(false)}
        />
      )}
    </div>
  )
}
