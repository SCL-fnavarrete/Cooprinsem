import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Pago Cta. Cte.: qué va fijo, qué es dinámico
// y qué falta definir (mismo criterio que PendientesHardcodePedido).
// Contenido estático — mantener alineado con server/src/routes/sapCtaCte.ts.
// Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'Sucursal del documento: la API no la trae (Plant, BusinessArea y ProfitCenter vienen vacíos). Se muestra "No informado" y el filtro Sucursal del formulario NO se aplica.',
  'Tipo documento: se muestra el código SAP (D1, D6, DW…) con el nombre genérico de la API (ej. "Factura"). Pendiente conectar la tabla con la descripción completa.',
  'Cuota ("1 de 5"): no existe en la API — columna omitida por ahora.',
  'Partidas CME (mayor especial, código 4): excluidas del listado. Pendiente confirmar si se muestran aparte (ej. saldo a favor). Ojo: las aperturas de caja aparecen como CME del cliente cajero.',
  'Pagos: "Ejecutar Pago" contabiliza en SAP (ZCOOP_JOURNALENTRY_SRV, variante 3 — sin compensación) previa confirmación con el JSON a enviar; el resultado muestra el N° de documento, el JSON enviado y la respuesta. La compensación de la factura la realiza el equipo SAP.',
  'Facturas ya pagadas desde el POS siguen abiertas en SAP hasta su compensación: se muestran como "Pagada · pend. compensación" y no se pueden volver a cobrar (se reconocen por el texto "PAGO FACT <documento>" del pago).',
  'Caja del cajero: cuenta y centro de beneficio FIJOS por ahora (ver Fijo). Pendiente: tomarlos del cajero logueado (también en Apertura de Caja).',
  'No se pueden seleccionar partidas con bloqueo de pago ni abonos (aplicación de abonos al pago pendiente de definir). Solo efectivo habilitado como vía de pago.',
  'Fecha vencimiento: datepicker provisorio (en SAP es un select); filtra las partidas que vencen hasta esa fecha.',
  'Folio: DocumentReferenceID. En QAS viene en ceros (sin folio SII) y se muestra vacío.',
  'Clientes: maestro local Sap_cliente. La búsqueda por RUT completo del backend no funciona (RUT guardado con guion); el formulario lo resuelve buscando por el número sin dígito verificador.',
]

const FIJOS = [
  'Pago (variante 3): DocType "DW", cuenta caja 1010504000, centro de beneficio PRP1000100, OperationMode "01", to_clearing_items vacío',
  'Folio de cobro RefDocNo "CAJ-<sucursal>-<correlativo NCOBRO>" (pos_parametro_general); HeaderTxt "PAGO FACT <folio|doc>" o "PAGO CTA CTE <n> DOCS"',
  'Fecha y período = hoy (Chile), año y mes calendario; solo efectivo; pago completo de cada factura (sin parciales)',
  "CompanyCode = 'COOP'",
  "IsCleared eq ' ' (solo partidas abiertas)",
  "SpecialGeneralLedgerCode eq ' ' (solo partidas normales, sin CME)",
  'Máximo 500 partidas por consulta, ordenadas por fecha de vencimiento',
]

const DINAMICOS = [
  'Pago: Customer (cliente, 8 dígitos), una línea to_Receivable por factura con su monto (tomado de SAP) e ItemText "PAGO FACT <documento> FOLIO <folio>"',
  'Customer ← cliente identificado en el formulario (con ceros a 10 dígitos)',
  'NetDueDate le ← Fecha vencimiento ("vence hasta")',
]

const DATOS = [
  'Signo del monto: positivo = cargo (factura, DebitCreditCode "S"), negativo = abono (DebitCreditCode "H"). La guía de la API lo indica al revés.',
  'Estado: Vencida si tiene días de mora (> 0), Por vencer si vence en los próximos 7 días, Vigente en otro caso.',
  'Bloqueo pago vacío = "Autorizado el pago".',
]

const CONSULTA = `GET FAR_CUSTOMER_LINE_ITEMS/Items?sap-client=200&sap-language=ES
  &$filter=Customer eq '<FORM: cliente, 10 dígitos>'
           and CompanyCode eq 'COOP'                       // FIJO
           and IsCleared eq ' '                            // FIJO (abiertas)
           and SpecialGeneralLedgerCode eq ' '             // FIJO (sin CME)
           [and NetDueDate le datetime'<FORM: vence hasta>T00:00:00']
  &$select=AccountingDocument,AccountingDocumentItem,FiscalYear,AccountingDocumentType,
           ReferenceDocumentTypeName,DocumentReferenceID,BillingDocument,DebitCreditCode,
           AmountInTransactionCurrency,TransactionCurrency,AmountInCompanyCodeCurrency,
           CompanyCodeCurrency,NetDueDate,NetDueArrearsDays,PaymentBlockingReason
  &$orderby=NetDueDate asc&$top=500&$format=json`

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

export function PendientesCtaCte() {
  return (
    <div style={estiloCaja} data-testid="pendientes-ctacte">
      <Title level="H5">Pendientes — Pago Cta. Cte. (Partidas Abiertas)</Title>
      <p style={{ margin: '0.25rem 0 0.75rem' }}>
        Fuente: SAP <code>FAR_CUSTOMER_LINE_ITEMS/Items</code> vía <code>GET /api/sap-cta-cte/partidas</code>.
      </p>
      <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
      <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
      <Lista titulo="Dinámico" items={DINAMICOS} />
      <Lista titulo="Datos importantes" items={DATOS} />
      <details>
        <summary style={{ cursor: 'pointer' }}>Ver consulta que se envía a SAP</summary>
        <pre style={{ margin: '0.5rem 0 0', padding: '0.5rem', background: 'var(--sapList_Background)', borderRadius: '4px', fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre' }}>{CONSULTA}</pre>
      </details>
    </div>
  )
}
