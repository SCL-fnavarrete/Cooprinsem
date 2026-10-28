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
  'Pago parcial (residual, 19-10-2026): UNA factura, monto < total y casilla "Pago parcial". Clave 09 al cliente CME del cajero logueado (Usuarios_pos.Kunnr; SglInd y Assignment vacíos según Javier, 28-10-2026 — BLOQUEADO: SAP lo rechaza, ver ADR-036) por lo cobrado + clave 04 al cliente por lo pendiente (factura − cobrado) con su vencimiento original; ambas suman el saldo de la factura. SAP compensa la factura y la clave 04 queda como partida pendiente.',
  'Corregido 20-10-2026: la clave 04 iba por la factura completa (ej. 2.000 + 6.490 sobre una factura de 6.490) y SAP rechazaba con F5/263. Ahora va por la diferencia (2.000 + 4.490).',
]

const MEDIOS = [
  'Vías de pago (22-10-2026, pantallas del WebDynpro enviadas por José): cada botón abre un popup con los datos del medio. Al aceptar, el resumen queda bajo el botón; al volver a abrirlo se puede editar, Limpiar (quita el medio) o Cancelar. Un solo medio por cobro: aceptar otra vía limpia la anterior (el popup lo avisa).',
  'Efectivo: monto (el exceso es vuelto). Tarjeta débito: RUT emisor, N° tarjeta (4), valor, N° operación, código de autorización. Crédito: lo mismo + cuotas. Las tarjetas no permiten sobrepago.',
  'Cheque al día / a fecha: fecha giro, fecha cheque, RUT girador, banco (maestro Sap_banco), plaza, cuenta, N° cheque, monto, teléfono. El sobrepago con cheque queda en TOTAL A CTA.CTE.',
  'Cheque a fecha: fecha posterior a hoy y hasta la "fecha máxima cheque" = hoy + días de la condición de pago del cliente o, si no trae días (hoy en SAP viene vacía), hoy + parámetro DIAS_MAX_CHEQUE_FECHA (30). PROVISORIO.',
  'Solo el EFECTIVO se envía a SAP. Con tarjeta o cheque, "Ejecutar Pago" queda bloqueado (aviso naranjo) hasta tener el ejemplo de SAP; en modo técnico se ve el JSON de los medios capturados.',
  'Pendiente: Vale Vista (sin definición de campos, deshabilitado); formato SAP de cada medio (cuentas, CME, Assignment); pago mixto y varios cheques por pago; fuente real de la fecha máxima del cheque.',
]

const PRUEBA = [
  'Pago parcial HABILITADO en DEV (PAGO_RESIDUAL_HABILITADO = S): cada pago parcial crea un documento real en SAP. Con N solo se muestra el JSON.',
  'Cómo probar: elegir UNA factura, en Efectivo ingresar un monto menor al total y Aceptar, marcar "Pago parcial" en Totales (aparece "QUEDA PENDIENTE"), "Ejecutar Pago" y confirmar.',
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
          <Lista titulo="Vías de pago (tarjetas y cheques sin envío a SAP)" items={MEDIOS} />
          <Lista titulo="Prueba y datos importantes" items={PRUEBA} />
        </div>
      )}
    </div>
  )
}
