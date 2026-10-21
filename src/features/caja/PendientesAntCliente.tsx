import { useState } from 'react'
import { Title, Button, FlexBox } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/navigation-down-arrow.js'
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js'

// Aviso para quien prueba Ant. Cliente (pago de la solicitud de anticipo):
// cómo funciona, qué va fijo y qué falta en SAP. Contenido estático — mantener
// alineado con server/src/routes/sapCtaCte.ts (sección "Ant. Cliente") y
// sapPagoCompensacion.ts (construirBodyPagoAnticipo). Se puede contraer y
// recuerda el estado en el navegador.

const FLUJO = [
  'Origen: correo de José y especificación funcional de Priscila (20-10-2026, probada en QAS con el doc. 1400000110).',
  'La jefatura crea la solicitud en SAP con F-37 (clave 09, CME F) y le entrega el N° a la cajera. Sin solicitud, el POS no contabiliza nada. Depósitos y transferencias no pasan por aquí (anticipo DZ directo en SAP).',
  'Ant. Cliente: buscar el cliente (RUT, nombre, código o "Busca Cliente SAP_CLIENTES") o botón "Anticipo" → popup "Anticipos": con el cliente elegido, "Nº documento" es un select con sus solicitudes abiertas (22-10-2026); elegir una muestra sus datos → "Ir a pagar". "Otro N° (digitar)" (o sin solicitudes en la lista): N° documento + ejercicio → Aceptar.',
  'Lista de solicitudes (select del popup): FAR_CUSTOMER_LINE_ITEMS con Customer + CompanyCode COOP + AccountingDocumentCategory "S" (apunte estadístico, consulta de José) + SpecialGeneralLedgerCode "F" + IsCleared vacío (solo por pagar). Sin filtro de ejercicio.',
  'Aceptar consulta FAR_CUSTOMER_LINE_ITEMS por Customer + CompanyCode COOP + AccountingDocument + FiscalYear y muestra N° documento, importe, vencimiento, asignación y texto. "Ir a pagar" abre la pantalla de pago (efectivo).',
  'Validaciones (backend): existe para el cliente y la sociedad, es CME F, está abierta (no compensada) y tiene una sola partida; importe = el de la solicitud (pago parcial o mayor fuera de alcance; en efectivo lo recibido de más es vuelto); el cajero tiene cliente CME (Usuarios_pos.Kunnr) y, para contabilizar, caja abierta hoy.',
]

const DOCUMENTO = [
  'ZCOOP_PAYMENT_SRV/PaymentHeaderSet, clase DW, mismo formato que el pago residual (arreglos, Count "001").',
  '001 · clave 41 (Debe Caja) · CUENTA_ANTICIPO_EFECTIVO · importe · Assignment "EF-0000".',
  '002 · clave 09 · cliente CME del cajero · SglInd "2" (efectivo) · DueDate hoy · Assignment "EF-0000".',
  '003 · clave 51 (Haber Caja) · CUENTA_COMPL_FXR (1105000799) · Assignment = fecha AAAAMMDD.',
  'to_Clearing = la solicitud. SAP genera la 4.ª posición (clave 19, CME A: anticipo abierto del cliente) al compensarla.',
  'FIJOS: CompCode COOP, DocType DW, Currency CLP, claves 41/09/51, CME 2 (efectivo), Assignment "EF-0000" (= <medio>-<N° comprobante>; efectivo sin comprobante), textos "RECAUDACION CAJA <sucursal> EF". RefDocNo = CAJ-<sucursal>-<NCOBRO>: número interno del POS, confirmado por José (21-10-2026) en vez de la sucursal que pedía la especificación; permite buscar el pago si se corta la red.',
]

const PENDIENTES = [
  'EN PAUSA (21-10-2026) hasta que Arquitectura responda los 2 puntos que bloquean (correo enviado): compensación CME F en ZCOOP_PAYMENT_SRV (Javier) y cuenta de efectivo de la pos. 001 (Mariela/Priscila).',
  'BLOQUEA: ZCOOP_PAYMENT_SRV no tiene en PaymentClearing (ItemNo, AccountingDocument, FiscalYear) un campo para el CME de la partida a compensar (AGUMS = F). Consultado a Javier: ampliar el servicio u otra vía.',
  'BLOQUEA: cuenta de la posición 001 para efectivo (la especificación solo confirma débito = 1010504000). CUENTA_ANTICIPO_EFECTIVO queda provisoria en 1010504000. Consultado a Mariela.',
  'Repetir la prueba de Priscila con clave 41 (usó 40). Posiciones 41/51 sin DueDate ni SglInd: confirmar que el servicio las acepte así.',
  'ANTICIPO_SAP_HABILITADO = N: "Ejecutar Pago" solo muestra el JSON. Con S contabiliza (crea documentos reales).',
  'Medios de pago: por ahora solo efectivo (José, 21-10-2026). Priscila enviará los ejemplos de los otros medios: el flujo es el mismo, cambian la cuenta de la pos. 001, el CME de la pos. 002 y los datos extra (N° comprobante, banco, girador…).',
  'Datos de prueba en DEV: cliente 10000003, solicitudes 1400000113 ($55.000) y 1400000114 ($65.000). La 1400000109 de Priscila ya está compensada.',
  'Aplicación posterior del anticipo a facturas: otro desarrollo ("Saldo a Favor" en Pago Cta. Cte.).',
]

const CLAVE_ABIERTO = 'cooprinsem.aviso.ant-cliente.abierto'

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

export function PendientesAntCliente() {
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
    <div style={estiloCaja} data-testid="pendientes-ant-cliente">
      <FlexBox alignItems="Center" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={alternar}>
        <Button
          design="Transparent"
          icon={abierto ? 'navigation-down-arrow' : 'navigation-right-arrow'}
          tooltip={abierto ? 'Contraer' : 'Expandir'}
          accessibleName={abierto ? 'Contraer pendientes' : 'Expandir pendientes'}
        />
        <Title level="H5">Pendientes — Ant. Cliente (pago de la solicitud de anticipo)</Title>
      </FlexBox>
      {abierto && (
        <div style={{ paddingTop: '0.25rem' }} data-testid="pendientes-ant-cliente-detalle">
          <Lista titulo="Flujo y validaciones" items={FLUJO} />
          <Lista titulo="Documento que se envía a SAP" items={DOCUMENTO} />
          <Lista titulo="Pendientes y datos de prueba" items={PENDIENTES} />
        </div>
      )}
    </div>
  )
}
