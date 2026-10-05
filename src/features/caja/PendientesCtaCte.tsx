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
  'Pagos: se seleccionan partidas y el botón Pagos abre la pantalla de pago (vías de pago, monto, vuelto), pero "Ejecutar Pago" está DESHABILITADO hasta que SAP entregue la API de pagos (documento de cobro clase W que compense las partidas). No se graba nada.',
  'No se pueden seleccionar partidas con bloqueo de pago ni abonos (aplicación de abonos al pago pendiente de definir). Solo efectivo habilitado como vía de pago.',
  'Fecha vencimiento: datepicker provisorio (en SAP es un select); filtra las partidas que vencen hasta esa fecha.',
  'Folio: DocumentReferenceID. En QAS viene en ceros (sin folio SII) y se muestra vacío.',
  'Clientes: maestro local Sap_cliente. La búsqueda por RUT completo del backend no funciona (RUT guardado con guion); el formulario lo resuelve buscando por el número sin dígito verificador.',
]

const FIJOS = [
  "CompanyCode = 'COOP'",
  "IsCleared eq ' ' (solo partidas abiertas)",
  "SpecialGeneralLedgerCode eq ' ' (solo partidas normales, sin CME)",
  'Máximo 500 partidas por consulta, ordenadas por fecha de vencimiento',
]

const DINAMICOS = [
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
