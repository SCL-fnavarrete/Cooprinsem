import { useState } from 'react'
import { Title, Button, FlexBox } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/navigation-down-arrow.js'
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js'

// Aviso para quien prueba la pantalla de pago con partidas SAP (ZCOOP_PAYMENT_SRV):
// qué escenarios hay y cómo se arma cada uno. Contenido estático — mantener
// alineado con server/src/routes/sapCtaCte.ts y sapPagoCompensacion.ts. Se puede
// contraer y recuerda el estado en el navegador. Detalle completo en la caja
// "Pendientes — Pago Cta. Cte.".

const ESCENARIOS = [
  'Pago total (1 o varias facturas): monto ≥ total. Clave 40 a la cuenta de caja (parámetro CUENTA_CAJA_PAGO) por la suma de las facturas; el excedente es vuelto y no se contabiliza.',
  'Saldo a favor: monto > total y casilla "Dejar el excedente como saldo a favor". Clave 40 por lo recibido + clave 15 al cliente por la diferencia.',
  'Pago parcial (residual, 19-10-2026): UNA factura, monto < total y casilla "Pago parcial". Clave 09 al cliente CME del cajero logueado (Usuarios_pos.Kunnr, SglInd "2", Assignment "EF-0000") por lo cobrado + clave 04 al cliente por lo pendiente (factura − cobrado) con su vencimiento original; ambas suman el saldo de la factura. SAP compensa la factura y la clave 04 queda como partida pendiente.',
  'Corregido 20-10-2026: la clave 04 iba por la factura completa (ej. 2.000 + 6.490 sobre una factura de 6.490) y SAP rechazaba con F5/263. Ahora va por la diferencia (2.000 + 4.490).',
]

const PRUEBA = [
  'Pago parcial HABILITADO en DEV (PAGO_RESIDUAL_HABILITADO = S): cada pago parcial crea un documento real en SAP. Con N solo se muestra el JSON.',
  'Cómo probar: elegir UNA factura, ingresar en Efectivo un monto menor al total, "Agregar", marcar "Pago parcial" en Totales (aparece "QUEDA PENDIENTE"), "Ejecutar Pago" y confirmar.',
  'Después del pago: la factura deja de estar abierta y aparece una partida nueva por lo pendiente (en el Home de Caja o al volver a consultar el cliente).',
  'El cajero debe tener cliente CME en Usuarios_pos (ej. DVIANA → 10128704). Los usuarios de prueba (admin, caja) no tienen y el pago parcial se rechaza.',
  'Pendiente: Assignment "EF-0000" fijo por ahora; diferencias del manual de Javier en saldo a favor (monto de la clave 15) y cuenta de caja (1105000799 vs 1010504000) consultadas a José.',
]

const CLAVE_ABIERTO = 'cooprinsem.aviso.pago-sap.abierto'

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

export function PendientesPagoSap() {
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
    <div style={estiloCaja} data-testid="pendientes-pago-sap">
      <FlexBox alignItems="Center" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={alternar}>
        <Button
          design="Transparent"
          icon={abierto ? 'navigation-down-arrow' : 'navigation-right-arrow'}
          tooltip={abierto ? 'Contraer' : 'Expandir'}
          accessibleName={abierto ? 'Contraer pendientes' : 'Expandir pendientes'}
        />
        <Title level="H5">Pendientes — Pago en SAP (total, saldo a favor y pago parcial)</Title>
      </FlexBox>
      {abierto && (
        <div style={{ paddingTop: '0.25rem' }} data-testid="pendientes-pago-sap-detalle">
          <Lista titulo="Escenarios (ZCOOP_PAYMENT_SRV)" items={ESCENARIOS} />
          <Lista titulo="Prueba y datos importantes" items={PRUEBA} />
        </div>
      )}
    </div>
  )
}
