import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Egr. de Caja: qué va fijo, qué es dinámico y
// qué falta definir (mismo criterio que PendientesAperturaCaja). Contenido
// estático — mantener alineado con server/src/routes/sapCaja.ts.
// Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'Arquitectura (respuesta comprometida para el 16-10-2026): ¿qué son los clientes 10000001 y 10000002 del ejemplo de José? ¿los signos son correctos? (en el ejemplo "EGRESO CAJA" va al debe). Hasta entonces se usa el ejemplo tal cual.',
  'Variante CUENTAS: SAP la RECHAZA ("Cuenta de mayor 4110000001 no prevista en plan de cuentas CL01", prueba directa 15-10-2026). Falta la cuenta de gasto correcta; no usar EGRESO_ASIENTO = CUENTAS.',
  'Motivos de egreso: existen pero no están definidos. Por ahora se envía y guarda solo "EGRESO".',
  'Endpoint anterior /api/sap-egreso/contabilizar (API_JOURNALENTRY_POST, con cliente y documento): sin uso desde la pantalla; retirar cuando Arquitectura confirme el asiento.',
]

const FIJOS = [
  'Servicio ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet (el mismo de la apertura), formato de la guía: listas con "results", to_control OperationMode "01", to_clearing_items vacío',
  'CompCode "COOP", DocType "DW", HeaderTxt "EGRESO", moneda CLP',
  'Sin ProfitCtr y sin monto máximo ni restricción por rol (confirmado por el usuario, 15-10-2026)',
  'Asiento CLIENTES (activo, ejemplo de José): to_Items vacío; to_Receivable cliente 10000001 "EGRESO" (−monto) y cliente 10000002 "EGRESO CAJA" (+monto). Clientes fijos, POR VALIDAR',
  "Parámetros en pos_parametro_general: EGRESO_SAP_HABILITADO = 'S' (contabiliza; 'N' solo muestra el JSON propuesto) y EGRESO_ASIENTO = 'CLIENTES'",
  'Nombre de sociedad "COOPRINSEM LTDA." (solo pantalla)',
]

const DINAMICOS = [
  'Usuario ← usuario logueado (se muestra "login — nombre" en el formulario y en el resultado); Sucursal ← su sucursal → RefDocNo "EGRESO CAJA <sucursal>"',
  'Fecha ← hoy en hora de Chile, fija → DocDate / PstngDate, FiscYear, FisPeriod',
  'Monto ← ingresado (CLP entero) → −monto al cliente 10000001 y +monto al cliente 10000002',
  'Descripción ← campo del formulario (opcional, hasta 500 caracteres) → solo egreso_caja.descripcion; NO se envía a SAP',
  'Al contabilizar con éxito se graba en egreso_caja: usuario, sociedad COOP, sucursal, fecha, monto, CLP, nro_documento ← AcDocNo, ejercicio ← FiscYear, motivo "EGRESO", descripcion, creado_en ← fecha y hora',
  'Listado: egreso_caja de la sucursal del usuario, de todos los cajeros, filtrado por fecha (por defecto hoy)',
]

const DATOS = [
  'CONTABILIZACIÓN REAL ACTIVA desde el 15-10-2026 (hasta nuevo aviso): cada egreso crea un asiento real en SAP y deja partidas en las cuentas corrientes de los clientes 10000001 y 10000002 (aparecen, por ejemplo, en Pago Cta. Cte. de esos clientes).',
  'Prueba directa en SAP DEV con $1.000: CLIENTES aceptado (doc 1400000085). Esa prueba no se grabó en egreso_caja: el listado solo muestra los egresos hechos desde esta pantalla.',
  'Requiere la caja abierta hoy (apertura_caja del mismo cajero y sucursal). Si no, se rechaza sin enviar nada a SAP.',
  'El servicio no evita duplicados: el POS bloquea el doble clic, pero no reintentar un egreso sin revisar antes el listado.',
  'Si SAP acepta pero falla el grabado en egreso_caja, el resultado lo avisa con el N° de documento: no repetir el egreso.',
  'egreso_caja: columnas nro_documento, ejercicio, motivo y creado_en agregadas por el POS (15-10-2026, informadas a Arquitectura); descripcion la agregó Arquitectura.',
]

const BODY = `POST ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet   (token CSRF)
{
  "CompCode": "COOP", "DocType": "DW",                        // FIJO
  "DocDate" / "PstngDate": "/Date(<hoy>)/",
  "FiscYear": "<año>", "FisPeriod": "<mes>",
  "RefDocNo": "EGRESO CAJA <sucursal>",
  "HeaderTxt": "EGRESO",                                      // FIJO
  "to_control": { "OperationMode": "01" },                    // FIJO
  "to_Items": { "results": [] },
  "to_Receivable": { "results": [
    { "ItemnoAcc": "0000000001", "Customer": "10000001",      // FIJO (por validar)
      "CompCode": "COOP", "ItemText": "EGRESO" },
    { "ItemnoAcc": "0000000002", "Customer": "10000002",      // FIJO (por validar)
      "CompCode": "COOP", "ItemText": "EGRESO CAJA" } ] },
  "to_Currency": { "results": [
    { "ItemnoAcc": "0000000001", "CurrType": "00", "Currency": "CLP", "AmtDoccur": "-<FORM: monto>" },
    { "ItemnoAcc": "0000000002", "CurrType": "00", "Currency": "CLP", "AmtDoccur": "<FORM: monto>" } ] },
  "to_clearing_items": { "results": [] }
}`

const estiloJson = {
  margin: '0.5rem 0 0',
  padding: '0.5rem',
  background: 'var(--sapList_Background)',
  borderRadius: '4px',
  fontSize: '0.7rem',
  overflowX: 'auto' as const,
  whiteSpace: 'pre' as const,
}

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
      <Lista titulo="Datos importantes" items={DATOS} />
      <details>
        <summary style={{ cursor: 'pointer' }}>Ver JSON del egreso que se envía a SAP</summary>
        <pre style={estiloJson}>{BODY}</pre>
      </details>
    </div>
  )
}
