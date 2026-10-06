import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Pago Cta. Cte.: qué va fijo, qué es dinámico
// y qué falta definir (mismo criterio que PendientesHardcodePedido).
// Contenido estático — mantener alineado con server/src/routes/sapCtaCte.ts.
// Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'N° de documento del pago (AcDocNo, ej. 1400000061): falta definir DÓNDE guardarlo en el POS. Hoy queda solo en SAP (con el folio CAJ-… como referencia del documento) y se muestra en el modal de resultado.',
  'Compensación de las facturas pagadas: la realiza el equipo SAP (el pago es variante 3, sin compensación). Mientras tanto la factura sigue abierta en SAP.',
  'Caja del cajero logueado: cuenta de caja y centro de beneficio van FIJOS (pago y apertura). Pendiente tomarlos del cajero.',
  'Apertura de Caja con el formato nuevo (variante 1: 1010504000 / 1010401000, sin deudor): pendiente probarla en QAS.',
  'Vías de pago: solo efectivo. Tarjetas, cheques y vale vista usan otras cuentas, aún no informadas.',
  'Abonos y partidas CME: no se pueden aplicar al pago ni se muestran las CME (pendiente definir si se muestran aparte, ej. saldo a favor). Ojo: las aperturas de caja aparecen como CME del cliente cajero.',
  'Sucursal del documento: la API no la trae (Plant, BusinessArea y ProfitCenter vacíos). Se muestra "No informado" y el filtro Sucursal NO se aplica.',
  'Tipo documento: código SAP (D1, D6, DW…) con el nombre genérico ("Factura"). Pendiente la tabla con la descripción completa.',
  'Cuota ("1 de 5"): no existe en la API — columna omitida.',
  'Fecha vencimiento: datepicker provisorio (en SAP es un select); filtra "vence hasta" esa fecha.',
  'Búsqueda de clientes por RUT completo en el backend no funciona (Sap_cliente guarda el RUT con guion); el formulario lo resuelve buscando por el número sin dígito verificador.',
]

const FIJOS = [
  'Pago (ZCOOP_JOURNALENTRY_SRV, variante 3): DocType "DW", cuenta caja 1010504000, centro de beneficio PRP1000100, OperationMode "01", to_clearing_items vacío',
  'Folio de cobro RefDocNo "CAJ-<sucursal>-<correlativo NCOBRO>" (pos_parametro_general); HeaderTxt "PAGO FACT <folio|doc>" (1 factura) o "PAGO CTA CTE <n> DOCS"',
  'Fecha y período del pago = hoy (Chile), año y mes calendario; pago completo de cada factura (sin parciales)',
  "Partidas: CompanyCode 'COOP', IsCleared eq ' ' (abiertas), SpecialGeneralLedgerCode eq ' ' (sin CME), máximo 500, orden por vencimiento",
]

const DINAMICOS = [
  'Partidas: Customer ← cliente identificado (10 dígitos con ceros); NetDueDate le ← Fecha vencimiento',
  'Pago: Customer ← cliente (8 dígitos); una línea to_Receivable por factura con su monto (tomado de SAP, no del navegador) e ItemText "PAGO FACT <documento> FOLIO <folio>"; total de caja = suma de las facturas',
]

const DATOS = [
  'Pago real probado en QAS (05-10-2026): documento 1400000061.',
  'Antes de contabilizar, el backend vuelve a validar en SAP que cada factura siga abierta, sea del cliente, no tenga bloqueo y no esté ya pagada.',
  'Facturas pagadas desde el POS y aún sin compensar: se muestran "Pagada · pend. compensación" y no se pueden volver a cobrar (se reconocen por el texto "PAGO FACT <documento>" del pago).',
  'Si se corta la conexión con SAP al pagar, se busca el pago por su folio (RefDocNo) antes de permitir reintentar.',
  'El vuelto no se contabiliza: el asiento es por el total de las facturas.',
  'Signo del monto: positivo = cargo (factura, "S"), negativo = abono ("H"). La guía de FAR_CUSTOMER_LINE_ITEMS lo indica al revés.',
  'Estado: Vencida si tiene días de mora (> 0), Por vencer si vence en los próximos 7 días, Vigente en otro caso. Bloqueo pago vacío = "Autorizado el pago".',
  'Folio (DocumentReferenceID): en QAS viene en ceros (sin folio SII) y se muestra vacío.',
]

const CONSULTA = `GET FAR_CUSTOMER_LINE_ITEMS/Items?sap-client=200&sap-language=ES
  &$filter=Customer eq '<FORM: cliente, 10 dígitos>'
           and CompanyCode eq 'COOP'                       // FIJO
           and IsCleared eq ' '                            // FIJO (abiertas)
           and SpecialGeneralLedgerCode eq ' '             // FIJO (sin CME)
           [and NetDueDate le datetime'<FORM: vence hasta>T00:00:00']
  &$select=AccountingDocument,AccountingDocumentItem,FiscalYear,AccountingDocumentType,DocumentDate,
           ReferenceDocumentTypeName,DocumentReferenceID,BillingDocument,DebitCreditCode,
           AmountInTransactionCurrency,TransactionCurrency,AmountInCompanyCodeCurrency,
           CompanyCodeCurrency,NetDueDate,NetDueArrearsDays,PaymentBlockingReason,DocumentItemText
  &$orderby=NetDueDate asc&$top=500&$format=json`

const PAGO = `POST ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet   (token CSRF)
{
  "CompCode": "COOP", "DocType": "DW",                       // FIJO
  "DocDate" / "PstngDate": "/Date(<hoy>)/",
  "FiscYear": "<año>", "FisPeriod": "<mes>",
  "RefDocNo": "CAJ-<sucursal>-<NCOBRO>",
  "HeaderTxt": "PAGO FACT <folio|doc>" | "PAGO CTA CTE <n> DOCS",
  "to_control": { "OperationMode": "01" },                   // FIJO
  "to_Items": { "results": [
    { "ItemnoAcc": "0000000001", "GlAccount": "1010504000",  // FIJO
      "ProfitCtr": "PRP1000100", "ItemText": "RECAUDACION CAJA" } ] },
  "to_Receivable": { "results": [                             // 1 por factura
    { "ItemnoAcc": "0000000002", "Customer": "<cliente>",
      "ItemText": "PAGO FACT <documento> FOLIO <folio>" } ] },
  "to_Currency": { "results": [                               // suma 0
    { "ItemnoAcc": "0000000001", "AmtDoccur": "<total>" },
    { "ItemnoAcc": "0000000002", "AmtDoccur": "-<monto factura>" } ] },
  "to_clearing_items": { "results": [] }                      // sin compensación
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
  fontSize: '0.75rem',
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

export function PendientesCtaCte() {
  return (
    <div style={estiloCaja} data-testid="pendientes-ctacte">
      <Title level="H5">Pendientes — Pago Cta. Cte.</Title>
      <p style={{ margin: '0.25rem 0 0.75rem' }}>
        Partidas: SAP <code>FAR_CUSTOMER_LINE_ITEMS/Items</code> vía <code>GET /api/sap-cta-cte/partidas</code>.
        Pago: SAP <code>ZCOOP_JOURNALENTRY_SRV</code> (variante 3) vía <code>POST /api/sap-cta-cte/pagos</code>.
      </p>
      <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
      <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
      <Lista titulo="Dinámico" items={DINAMICOS} />
      <Lista titulo="Datos importantes" items={DATOS} />
      <details>
        <summary style={{ cursor: 'pointer' }}>Ver JSON del pago que se envía a SAP</summary>
        <pre style={estiloJson}>{PAGO}</pre>
      </details>
      <details>
        <summary style={{ cursor: 'pointer' }}>Ver consulta de partidas abiertas que se envía a SAP</summary>
        <pre style={estiloJson}>{CONSULTA}</pre>
      </details>
    </div>
  )
}
