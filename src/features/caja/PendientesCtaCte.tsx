import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Pago Cta. Cte.: qué va fijo, qué es dinámico
// y qué falta definir (mismo criterio que PendientesHardcodePedido).
// Contenido estático — mantener alineado con server/src/routes/sapCtaCte.ts.
// Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'PRIMERA PRUEBA EN DEV: el pago con ZCOOP_PAYMENT_SRV (pago + compensación) aún no se ha ejecutado desde el POS. Probar 1 factura (escenario A) y revisar en FB03/FBL5N que quede compensada. Si SAP rechaza, enviar el error a José Castillo.',
  "Pago de varias facturas (escenario C): HABILITADO para pruebas el 14-10-2026 (parámetro PAGO_MULTIPLE = 'S' en pos_parametro_general; con 'N' vuelve a una factura por cobro). SAP tampoco lo ha probado.",
  'Cuenta de caja: depende del cajero (José, 13-10-2026), pero ese dato no viene en Usuarios_pos ni en Perfiles_usuarios. Va FIJA en el parámetro CUENTA_CAJA_PAGO (1010504000). Consultado a José de dónde sale.',
  'Centro de beneficio: el servicio nuevo no lo recibe. José lo está consultando.',
  'Pagos anteriores al 13-10-2026 (variante 3, sin compensación, ej. documento 1400000061): sus facturas siguen abiertas en SAP y se muestran "Pagada · pend. compensación" (no se pueden cobrar). Consultado a José si el equipo SAP las compensa a mano.',
  'Documentos en cuotas (más de una partida abierta del mismo documento): bloqueados. La API compensa el documento completo; el pago por cuota quedó pendiente (José, 13-10-2026).',
  'Saldo a favor (escenario B, PK 15): HABILITADO para pruebas el 14-10-2026 como opción en la pantalla de pago ("Dejar el excedente como saldo a favor"). Por defecto el excedente sigue siendo vuelto. Según José aplica a cheques: pendiente definir si queda disponible para efectivo.',
  'Notas de crédito y débito: pendiente aclarar con José si es emitirlas (otra API, la entrega Francisco) o aplicarlas en el pago. Hoy los abonos no se pueden seleccionar.',
  'N° de documento del pago (AcDocNo): falta definir DÓNDE guardarlo en el POS. Hoy queda solo en SAP (con el folio CAJ-… como referencia) y se muestra en el modal de resultado.',
  'Recuperación ante corte de red: busca el pago por su folio (RefDocNo) en FAR_CUSTOMER_LINE_ITEMS. Con compensación la línea del cliente queda compensada: verificar en la primera prueba que igual se encuentre.',
  'Apertura de Caja (variante 1, sin deudor): fondo cambiado a 1010101050 (SAP rechaza el 1010401000 de la guía) y sin ProfitCtr, pendiente confirmar con Arquitectura. Sigue usando ZCOOP_JOURNALENTRY_SRV. Detalle en el aviso del modal de Apertura.',
  'Vías de pago: solo efectivo. Tarjetas, cheques y vale vista usan otras cuentas, aún no informadas.',
  'Abonos y partidas CME: no se pueden aplicar al pago ni se muestran las CME (pendiente definir si se muestran aparte). Ojo: las aperturas de caja aparecen como CME del cliente cajero.',
  'Sucursal del documento: la API no la trae (Plant, BusinessArea y ProfitCenter vacíos). Se muestra "No informado" y el filtro Sucursal NO se aplica.',
  'Tipo documento: se muestra la descripción de la tabla tipo_documento (Administración > Maestros POS > Tipo Documento; ej. D6 = "Boleta Electronica"). Si el código no está en la tabla se muestra el código. La tabla también la carga un sync de Arquitectura, que puede reemplazar lo editado en el POS. El filtro de la API a solo D1/D6 quedó en espera (José, 14-10-2026).',
  'Búsqueda de clientes: solo lista clientes del grupo BP ZNAC (José, 14-10-2026). El Cliente Boleta 999999 (grupo ZESP) NO aparece en el listado.',
  'Cuota ("1 de 5"): no existe en la API — columna omitida.',
  'Fecha vencimiento: datepicker provisorio (en SAP es un select); filtra "vence hasta" esa fecha.',
  'Búsqueda de clientes por RUT completo en el backend no funciona (Sap_cliente guarda el RUT con guion); el formulario lo resuelve buscando por el número sin dígito verificador.',
]

const FIJOS = [
  'Pago (ZCOOP_PAYMENT_SRV/PaymentHeaderSet): CompCode "COOP", DocType "DW", Currency "CLP"; posición Count "1" con PostingKey "40" (caja al debe)',
  'Cuenta de caja = parámetro CUENTA_CAJA_PAGO (1010504000); pago múltiple = parámetro PAGO_MULTIPLE (arranca en "N")',
  'Folio de cobro RefDocNo "CAJ-<sucursal>-<correlativo NCOBRO>" (pos_parametro_general)',
  'Fecha de documento y contabilización = hoy (Chile) en YYYYMMDD; FiscYear = año; FisPeriod = mes con 2 dígitos ("01" a "12")',
  "Partidas: CompanyCode 'COOP', IsCleared eq ' ' (abiertas), SpecialGeneralLedgerCode eq ' ' (sin CME), máximo 500, orden por vencimiento",
]

const DINAMICOS = [
  'Partidas: Customer ← cliente identificado (10 dígitos con ceros); NetDueDate le ← Fecha vencimiento',
  'Pago: Amount de la caja = suma de las facturas (montos tomados de SAP, no del navegador), formato "446.00"; to_Clearing = una línea por factura con su N° de documento SAP (BELNR, no el folio SII) y ejercicio',
  'Texto de la caja: "COBRO FACTURA <documento>" (1 factura) o "COBRO CTA CTE <n> FACTURAS"',
]

const DATOS = [
  'El servicio NO es idempotente: cada envío crea un documento. El POS nunca reintenta solo; ante un corte, busca el pago por su folio antes de dejar reintentar.',
  'Antes de contabilizar, el backend vuelve a validar en SAP que cada factura siga abierta, sea del cliente, no tenga bloqueo, no esté en cuotas ni ya pagada, y que el pago cuadre (caja = facturas + saldo a favor).',
  'El vuelto no se contabiliza: la caja es por el total de las facturas.',
  'Errores frecuentes de SAP se muestran explicados (F5/093 factura no encontrada, F5/263 monto no cuadra, 00088 importe, 00349 cabecera) junto al mensaje original.',
  'Ejemplos validados por SAP en DEV (12-10-2026): cobro exacto doc. 1400000068 (factura 1800000006, $446); saldo a favor doc. 1400000069 (factura 1800000002).',
  'Signo del monto: positivo = cargo (factura, "S"), negativo = abono ("H"). La guía de FAR_CUSTOMER_LINE_ITEMS lo indica al revés.',
  'Orden de la grilla: por defecto la fecha de vencimiento más próxima primero; clic en una cabecera ordena por esa columna (otro clic invierte). Se ordena en el navegador sobre las partidas ya consultadas, sin volver a consultar SAP.',
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

const PAGO = `POST ZCOOP_PAYMENT_SRV/PaymentHeaderSet   (token CSRF)
{
  "CompCode": "COOP", "DocType": "DW", "Currency": "CLP",    // FIJO
  "DocDate": "<hoy YYYYMMDD>", "PstngDate": "<hoy YYYYMMDD>",
  "FiscYear": "<año>", "FisPeriod": "<mes 01-12>",
  "RefDocNo": "CAJ-<sucursal>-<NCOBRO>",
  "to_Positions": { "results": [
    { "Count": "1", "PostingKey": "40",                     // FIJO (caja al debe)
      "Account": "<CUENTA_CAJA_PAGO>",
      "Amount": "<suma facturas>.00",
      "Text": "COBRO FACTURA <documento>" } ] },
  "to_Clearing": { "results": [                             // 1 por factura
    { "ItemNo": "1", "AccountingDocument": "<BELNR factura>",
      "FiscalYear": "<ejercicio>" } ] }
}
// Escenario B (solo cheques, aún no en pantalla): + posición
// { "Count": "2", "PostingKey": "15", "Account": "<cliente 8 dígitos>", "Amount": "<saldo a favor>.00" }
// y la caja (Count 1) por el total cobrado.`

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
        Pago y compensación: SAP <code>ZCOOP_PAYMENT_SRV</code> (guía v1.0, 12-10-2026) vía <code>POST /api/sap-cta-cte/pagos</code>.
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
