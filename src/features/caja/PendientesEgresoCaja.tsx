import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Egr. de Caja: qué va fijo, qué es dinámico y
// qué falta definir (mismo criterio que PendientesAperturaCaja). Contenido
// estático — mantener alineado con server/src/routes/sapCaja.ts.
// Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'BLOQUEANTE — esperando validación de Arquitectura: ¿qué son los clientes 10000001 y 10000002 del ejemplo de José y de dónde salen? ¿los signos son correctos? (en el ejemplo "EGRESO CAJA" va al debe). Mientras tanto el egreso NO se contabiliza ni se registra: al aceptar se muestra el JSON propuesto.',
  "Contabilización real: se habilita con EGRESO_SAP_HABILITADO = 'S' (pos_parametro_general) cuando se valide el asiento. EGRESO_ASIENTO elige el asiento: CLIENTES (ejemplo de José, por defecto) o CUENTAS (variante 2 de la guía con la caja 1010101050).",
  'Variante CUENTAS: usa la caja 1010101050 (respuesta del usuario 15-10-2026: la cuenta que funciona) y la cuenta de gasto 4110000001 de la guía, sin validar en SAP.',
  'Motivos de egreso: existen pero no están definidos (15-10-2026). Por ahora se envía y guarda solo "EGRESO".',
  'Endpoint anterior /api/sap-egreso/contabilizar (API_JOURNALENTRY_POST, con cliente y documento): sin uso desde la pantalla; retirar cuando se confirme el asiento nuevo.',
]

const FIJOS = [
  'Servicio ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet (el mismo de la apertura), formato de la guía: listas con "results", to_control OperationMode "01", to_clearing_items vacío',
  'CompCode "COOP", DocType "DW", HeaderTxt "EGRESO", moneda CLP, sin ProfitCtr (confirmado: no enviar), sin monto máximo (por ahora)',
  'Asiento CLIENTES (por defecto, ejemplo de José): to_Items vacío; to_Receivable cliente 10000001 "EGRESO" (−monto) y cliente 10000002 "EGRESO CAJA" (+monto) — clientes fijos POR VALIDAR',
  'Asiento CUENTAS: to_Items caja 1010101050 "EGRESO CAJA" (−monto) y gasto 4110000001 "EGRESO" (+monto); to_Receivable vacío',
  'Nombre de sociedad "COOPRINSEM LTDA." (solo pantalla)',
]

const DINAMICOS = [
  'Usuario ← usuario logueado; Sucursal ← su sucursal → RefDocNo "EGRESO CAJA <sucursal>"',
  'Fecha ← hoy en hora de Chile, fija → DocDate / PstngDate, FiscYear, FisPeriod',
  'Monto ← ingresado (CLP entero)',
  'Requiere la caja abierta hoy (apertura_caja del mismo cajero y sucursal)',
  'Al contabilizar con éxito se graba en egreso_caja: usuario, sociedad COOP, sucursal, fecha de hoy, monto, CLP, nro_documento ← AcDocNo, ejercicio ← FiscYear, motivo "EGRESO", creado_en ← fecha y hora del registro',
  'egreso_caja: columnas nro_documento, ejercicio, motivo y creado_en agregadas por el POS el 15-10-2026 (informar a Arquitectura)',
  'Listado: egreso_caja de la sucursal del usuario, de todos los cajeros, filtrado por fecha (por defecto hoy)',
]

const estiloCaja = {
  padding: '1rem',
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

export function PendientesEgresoCaja() {
  return (
    <div style={estiloCaja} data-testid="pendientes-egreso-caja">
      <Title level="H5">Pendientes — Egreso de Caja</Title>
      <p style={{ margin: '0.25rem 0 0.75rem' }}>
        Solicitud de José Castillo (14-10-2026). Vía <code>POST /api/sap-caja/egreso</code> y{' '}
        <code>GET /api/sap-caja/egresos</code> (tabla <code>egreso_caja</code>).
      </p>
      <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
      <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
      <Lista titulo="Dinámico" items={DINAMICOS} />
    </div>
  )
}
