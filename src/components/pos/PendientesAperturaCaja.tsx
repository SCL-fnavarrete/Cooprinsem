import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Apertura de Caja ("Simular apertura"): qué va
// fijo, qué es dinámico y qué falta definir (mismo criterio que
// PendientesCtaCte). Contenido estático — mantener alineado con
// server/src/routes/sapCaja.ts. Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'Centro de beneficio (ProfitCtr): QUITADO del asiento el 14-10-2026 para probar en la GUI (antes iba fijo PRP1000100). Pendiente confirmar con SAP si es obligatorio y de dónde sale (según José depende del cajero; lo está consultando).',
  'Cuenta del fondo: 1010101050 (PROVISORIA, para probar en la GUI). La guía dice 1010401000, pero SAP la rechaza ("no es contabilizable directamente"). Con 1010101050 SAP aceptó en pruebas directas del 14-10-2026 (docs 1400000074 sin ProfitCtr y 1400000075 con ProfitCtr). Pendiente que Arquitectura confirme la cuenta.',
  'Cuentas FIJAS (1010504000 / 1010101050): según José dependen del cajero, pero ese dato no viene en Usuarios_pos ni en Perfiles_usuarios. Consultado de dónde salen (13-10-2026).',
  'Identificación del cajero: el asiento no lleva ningún dato del cajero. SAP lo registra con el usuario técnico del backend (SCLPOS_01) y el POS no guarda quién abrió. Del usuario logueado solo se usa su sucursal (monto sugerido, referencia y texto). Pendiente definir con Arquitectura.',
  'RefDocNo vuelve vacío en la respuesta de SAP aunque se envía "A.CAJA <sucursal>": verificar en FB03 si queda guardado.',
  'Cliente CME del cajero (Usuarios_pos.Kunnr): SAP confirmó que debe enviarse, falta el formato. Hoy la apertura NO lo envía (variante 1, sin deudor).',
  'Formato variante 1 pendiente de probar en QAS.',
  'Validación real de "caja abierta": el modal previo es temporal. No consulta a SAP si la caja ya se abrió hoy ni lo guarda; "Caja ya Abierta" solo desbloquea el módulo en el navegador y al volver a entrar a Caja se pide de nuevo. Se puede abrir dos veces el mismo día.',
  'Referencia sin correlativo: RefDocNo es "A.CAJA <sucursal>" igual todos los días, así que no sirve para detectar una apertura duplicada.',
  'Fecha por defecto: se calcula en UTC; después de las 21:00 (hora de Chile) propone la fecha de mañana. Revisar antes de aceptar.',
  'Usuario: se muestra pero no se envía a SAP (el documento queda con el usuario técnico del backend).',
]

const FIJOS = [
  'Servicio ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet, variante 1 de la guía (solo cuentas de mayor, sin deudor)',
  'CompCode "COOP", DocType "DW", OperationMode "01", moneda CLP (CurrType "00")',
  'Caja principal 1010504000 al DEBE ("APERTURA CAJA") y Fondo 1010101050 al HABER ("FONDO INICIAL"), sin centro de beneficio (cuentas hardcodeadas en sapCaja.ts, no salen de ninguna tabla)',
  'to_Receivable y to_clearing_items vacíos',
  'Nombre de sociedad "COOPRINSEM LTDA." (solo pantalla)',
]

const DINAMICOS = [
  'Sucursal ← sucursal del usuario logueado → RefDocNo "A.CAJA <sucursal>" y HeaderTxt "APERTURA CAJA <sucursal>"',
  'Monto ← tabla monto_apertura del centro (la llena Arquitectura); editable. Se envía +monto a la caja y −monto al fondo',
  'Fecha ← campo Fecha (hoy por defecto, editable) → DocDate / PstngDate, FiscYear = año, FisPeriod = mes',
  'Mandante ← parámetro MANDANTE (pos_parametro_general)',
]

const BODY = `POST ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet   (token CSRF)
{
  "CompCode": "COOP", "DocType": "DW",                       // FIJO
  "DocDate" / "PstngDate": "/Date(<FORM: fecha>)/",
  "FiscYear": "<año>", "FisPeriod": "<mes>",
  "RefDocNo": "A.CAJA <sucursal>",
  "HeaderTxt": "APERTURA CAJA <sucursal>",
  "to_control": { "OperationMode": "01" },                   // FIJO
  "to_Items": { "results": [
    { "ItemnoAcc": "0000000001", "GlAccount": "1010504000",  // FIJO
      "CompCode": "COOP", "ItemText": "APERTURA CAJA" },     // sin ProfitCtr
    { "ItemnoAcc": "0000000002", "GlAccount": "1010101050",  // FIJO (guía: 1010401000)
      "CompCode": "COOP", "ItemText": "FONDO INICIAL" } ] }, // sin ProfitCtr
  "to_Receivable": { "results": [] },
  "to_Currency": { "results": [
    { "ItemnoAcc": "0000000001", "CurrType": "00", "Currency": "CLP", "AmtDoccur": "<FORM: monto>" },
    { "ItemnoAcc": "0000000002", "CurrType": "00", "Currency": "CLP", "AmtDoccur": "-<FORM: monto>" } ] },
  "to_clearing_items": { "results": [] }
}`

const estiloCaja = {
  padding: '1rem',
  background: 'var(--sapWarningBackground, #fff8d6)',
  border: '1px solid var(--sapWarningBorderColor, #e9730c)',
  borderRadius: '0.5rem',
  color: 'var(--sapTextColor)',
  fontSize: '0.8125rem',
}

const estiloJson = {
  margin: '0.5rem 0 0',
  padding: '0.5rem',
  background: 'var(--sapList_Background)',
  borderRadius: '4px',
  fontSize: '0.7rem',
  overflowX: 'auto' as const,
  whiteSpace: 'pre' as const,
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

export function PendientesAperturaCaja() {
  return (
    <div style={estiloCaja} data-testid="pendientes-apertura-caja">
      <Title level="H5">Pendientes — Apertura de Caja</Title>
      <p style={{ margin: '0.25rem 0 0.75rem' }}>
        Asiento real en SAP <code>ZCOOP_JOURNALENTRY_SRV</code> (variante 1) vía <code>POST /api/sap-caja/apertura</code>.
      </p>
      <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
      <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
      <Lista titulo="Dinámico" items={DINAMICOS} />
      <details>
        <summary style={{ cursor: 'pointer' }}>Ver JSON que se envía a SAP</summary>
        <pre style={estiloJson}>{BODY}</pre>
      </details>
    </div>
  )
}
