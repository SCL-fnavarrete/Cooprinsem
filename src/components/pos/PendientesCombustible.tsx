import { useState } from 'react'
import { Title, Button, FlexBox } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/navigation-down-arrow.js'
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js'

// Aviso para quien prueba la venta de combustible (ZV15). Contenido estático —
// mantener alineado con server/src/routes/sapCombustible.ts y sapPedidos.ts.
// Se puede contraer y recuerda el estado en el navegador.

const FLUJO = [
  'Origen: correo de José (21-10-2026) y ejemplo de Juan Francisco (pedido ZV15 74). Respuestas de José: ZA = Id Vendedor; todos los perfiles VT; fecha = fecha del pedido; se informa la respuesta de la simulación (no se bloquea); todos los materiales; el destinatario lo elige el vendedor.',
  'Quién: usuarios con perfil de canal VT en Usuarios_pos (PerfilVtweg) y bodega móvil en Sap_usuario_vendedor (Zvendedor). Sin bodega no se puede grabar. Hoy: CCARDENAS, MALVARADO, R.BELTRAN (combustible) y HAMPUERO, MDIAZ, RLORCA (inseminación).',
  'Cabecera: clase ZV15, canal VT (siempre, aunque el formulario diga otro), RequestedDeliveryDate y PricingDate = hoy (Chile).',
  'Interlocutores: WE (destinatario elegido), ZB (quien retira, opcional), ZA (Id Vendedor; SAP lo guarda en Personnel) y SB = bodega móvil (Customer).',
  'Posiciones: sin unidad ni tipo de posición (SAP pone L y Z006). La simulación pide to_ScheduleLine para leer la cantidad confirmada (ConfdOrderQtyByMatlAvailCheck) contra la bodega móvil.',
]

const PRUEBA = [
  'Probado en DEV (21-10-2026): simulación 10 L de 91000001 para 10000003 → Z006, 10 L confirmados, neto $12.316. Pedido de prueba creado: 126 (SAP creó la entrega 8000000099).',
  'Al crear, SAP agrega el detalle "No pueden realizarse entradas en campo PARTY_ID": viene del ZA enviado en Customer; el pedido se graba igual (mismo caso que el pedido normal).',
  'El stock que muestra el POS es el del centro; el de la bodega móvil lo confirma SAP al simular.',
]

const PENDIENTES = [
  'Factura y folio del combustible: van por otra API que aún no envían (José, 21-10-2026). El ZV15 no pasa por la facturación de 3 pasos (solo Venta normal + Factura).',
  'Boleta / Factura: el vendedor lo elige; se definirá su uso cuando llegue la API de facturación.',
]

const CLAVE_ABIERTO = 'cooprinsem.aviso.combustible.abierto'

function leerAbierto(): boolean {
  try {
    return localStorage.getItem(CLAVE_ABIERTO) !== 'N'
  } catch {
    return true
  }
}

const estiloCaja = {
  padding: '0.5rem 1rem',
  background: 'var(--sapWarningBackground, #fff8d6)',
  border: '1px solid var(--sapWarningBorderColor, #e9730c)',
  borderRadius: '0.5rem',
  color: 'var(--sapTextColor)',
  fontSize: '0.8125rem',
}

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <>
      <strong>{titulo}</strong>
      <ul style={{ margin: '0.25rem 0 0.75rem', paddingLeft: '1.25rem' }}>
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </>
  )
}

export function PendientesCombustible() {
  const [abierto, setAbierto] = useState(leerAbierto)

  const alternar = () => {
    const nuevo = !abierto
    setAbierto(nuevo)
    try {
      localStorage.setItem(CLAVE_ABIERTO, nuevo ? 'S' : 'N')
    } catch {
      // Sin almacenamiento (modo privado): solo se pierde recordar el estado
    }
  }

  return (
    <div style={estiloCaja} data-testid="pendientes-combustible">
      <FlexBox alignItems="Center" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={alternar}>
        <Button
          design="Transparent"
          icon={abierto ? 'navigation-down-arrow' : 'navigation-right-arrow'}
          tooltip={abierto ? 'Contraer' : 'Expandir'}
          accessibleName={abierto ? 'Contraer pendientes' : 'Expandir pendientes'}
        />
        <Title level="H5">Pendientes — Venta de combustible (ZV15)</Title>
      </FlexBox>
      {abierto && (
        <div style={{ paddingTop: '0.25rem' }} data-testid="pendientes-combustible-detalle">
          <Lista titulo="Cómo se arma el pedido" items={FLUJO} />
          <Lista titulo="Prueba y datos importantes" items={PRUEBA} />
          <Lista titulo="Pendientes" items={PENDIENTES} />
        </div>
      )}
    </div>
  )
}
