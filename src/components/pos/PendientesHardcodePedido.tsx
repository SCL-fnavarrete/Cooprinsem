import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Crear Pedido: qué va fijo (hardcodeado) y qué sale
// del formulario en cada llamada a SAP. Contenido estático — debe mantenerse
// alineado a mano con construirBodySimulacion() / construirBodyCotizacion()
// en server/src/routes/sapPedidos.ts. Quitar este bloque cuando no queden
// valores fijos pendientes.

interface IEscenario {
  titulo: string
  servicio: string
  fijos: string[]
  dinamicos: string[]
  json: string
}

const FIJOS_COMUNES = [
  'SalesOrganization = "COOP" (pendiente confirmar Org. Ventas con ABAP)',
  'OrganizationDivision = "00"',
  'RequestedQuantityUnit = "UN" en todas las posiciones (ignora la UM del material)',
]

const ESCENARIOS: IEscenario[] = [
  {
    titulo: '1. Simular pedido (Grabar — paso 1)',
    servicio: 'POST API_SALES_ORDER_SIMULATION_SRV/A_SalesOrderSimulation',
    fijos: [
      ...FIJOS_COMUNES,
      'SalesOrderItemCategory = "Z001" (falla con materiales que no la admiten, ej. 11000074)',
      'Interlocutor ZB = 90001424 (valor de prueba)',
      'Destinatario mercancía se envía como PartnerFunction "WE" (temporal, en vez de "SH")',
      'RequestedDeliveryDate y CustomerPaymentTerms no se envían (temporal)',
      'Plant = sucursal del usuario (si no tiene, D190)',
    ],
    dinamicos: [
      'SalesOrderType ← Tipo Documento (pos_documento_venta)',
      'DistributionChannel ← Canal Distribución (pos_canal_distribucion)',
      'SoldToParty ← Cliente',
      'WE ← Destinatario Mercancía · ZA ← Id Vendedor del usuario',
      'Material / RequestedQuantity ← líneas de la grilla',
      'PurchaseOrderByCustomer ← generado "POS-<timestamp>"',
      'to_Pricing {} y to_PricingElement [] → gatillan el cálculo de precios (definitivo)',
    ],
    json: `{
  "SalesOrderType": "<FORM: Tipo Documento, ej. ZV01>",
  "SalesOrganization": "COOP",                 // FIJO
  "DistributionChannel": "<FORM: Canal, ej. VM>",
  "OrganizationDivision": "00",                // FIJO
  "SoldToParty": "<FORM: Cliente>",
  "PurchaseOrderByCustomer": "POS-<timestamp>",
  "TransactionCurrency": "CLP",
  "to_Pricing": {},
  "to_Partner": [
    { "PartnerFunction": "WE", "Customer": "<FORM: Destinatario>" },  // "WE" TEMPORAL
    { "PartnerFunction": "ZB", "Customer": "90001424" },              // FIJO de prueba
    { "PartnerFunction": "ZA", "Customer": "<USUARIO: Id Vendedor>" }
  ],
  "to_Item": [{
    "Material": "<FORM: Material>",
    "RequestedQuantity": "<FORM: Cantidad>",
    "RequestedQuantityUnit": "UN",             // FIJO
    "SalesOrderItemCategory": "Z001",          // FIJO
    "Plant": "<USUARIO: Sucursal>",
    "to_PricingElement": []
  }]
}`,
  },
  {
    titulo: '2. Crear pedido (Confirmar — paso 2)',
    servicio: 'POST API_SALES_ORDER_SRV/A_SalesOrder',
    fijos: [
      'Mismos valores fijos que la simulación (mismo cliente, líneas e interlocutores)',
      'El centro va como ProductionPlant (no Plant) — nombre distinto en esta entidad',
      'Sin to_Pricing / to_PricingElement (no probado en la creación)',
    ],
    dinamicos: ['Mismos campos dinámicos que la simulación'],
    json: `{
  ...misma cabecera y to_Partner que la simulación, sin "to_Pricing",
  "to_Item": [{
    "Material": "<FORM: Material>",
    "RequestedQuantity": "<FORM: Cantidad>",
    "RequestedQuantityUnit": "UN",             // FIJO
    "SalesOrderItemCategory": "Z001",          // FIJO
    "ProductionPlant": "<USUARIO: Sucursal>"
  }]
}`,
  },
  {
    titulo: '3. Cotizar (Tipo Documento "Cotización normal") — body según JSON de Arquitectura, pendiente prueba en vivo',
    servicio: 'POST API_SALES_QUOTATION_SRV/A_SalesQuotation',
    fijos: [
      ...FIJOS_COMUNES,
      'SDDocumentReason = "C01"',
      'BindingPeriodValidityEndDate = hoy + 30 días',
      'Interlocutores: solo AG (= cliente). No se envían destinatario (WE) ni vendedor (ZA)',
    ],
    dinamicos: [
      'SalesQuotationType ← Tipo Documento (ZC01)',
      'SoldToParty y AG ← Cliente',
      'Material / RequestedQuantity ← líneas de la grilla',
      'PurchaseOrderByCustomer ← generado "POS-COT-<timestamp>"',
      'Al crearse se guarda en el POS (pedidos_venta): Nº Pedido Interno = correlativo local, Nº Documento SAP = N° de cotización de SAP, más la fecha de vigencia',
    ],
    json: `{
  "SalesQuotationType": "ZC01",
  "SalesOrganization": "COOP",                 // FIJO
  "DistributionChannel": "<FORM: Canal>",
  "OrganizationDivision": "00",                // FIJO
  "SoldToParty": "<FORM: Cliente>",
  "PurchaseOrderByCustomer": "POS-COT-<timestamp>",
  "TransactionCurrency": "CLP",
  "SDDocumentReason": "C01",                   // FIJO
  "BindingPeriodValidityEndDate": "/Date(<hoy + 30 días>)/",
  "to_Partner": [
    { "PartnerFunction": "AG", "Customer": "<FORM: Cliente>" }
  ],
  "to_Item": [{
    "Material": "<FORM: Material>",
    "RequestedQuantity": "<FORM: Cantidad>",
    "RequestedQuantityUnit": "UN",             // FIJO
    "Plant": "<USUARIO: Sucursal>"
  }]
}`,
  },
]

const PENDIENTES_FORM = [
  'Precios automáticos: al agregar un producto, cambiar la cantidad, eliminar una línea o cambiar cliente / tipo de documento / canal, se consultan los precios a SAP (POST /api/sap-pedidos/precios, 0,5 s después del último cambio). Subtotal e IVA del panel salen de SAP.',
  'La consulta de precios va SIN interlocutores y con SalesOrderItemCategory "Z001" fijo. Si el tipo de documento no es de pedido (ej. Cotización normal), el precio se calcula con el tipo "ZV01" (Venta normal).',
  'Si SAP no puede calcular una línea (ej. material que no admite Z001), esa línea muestra "Sin precio" (motivo al pasar el cursor) y las demás sí traen precio.',
  'Series (PE-23): botón "Serie" por línea (solo pedidos). La validación del rango usa DATOS DE PRUEBA (POST /api/sap-series/validar): el material sí se valida contra Sap_producto, pero la disponibilidad es simulada (las series terminadas en 7 salen "No disponible").',
  'Series — pendiente: las series NO se envían a SAP ni se guardan en pedido_posicion_serie. Falta la API de validación real y la API Z de envío (se llama después de crear el pedido; se graba localmente solo si SAP responde OK).',
]

const estiloCaja = {
  marginTop: '1rem',
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

export function PendientesHardcodePedido() {
  return (
    <div style={estiloCaja} data-testid="pendientes-hardcode-pedido">
      <Title level="H5">Pendientes — valores fijos (hardcodeados) en Crear Pedido</Title>
      <p style={{ margin: '0.25rem 0 0.75rem' }}>
        Para pruebas: <strong>FIJO</strong> = hardcodeado en el sistema, no cambia con lo que se ingrese.{' '}
        <strong>FORM / USUARIO</strong> = dinámico, sale del formulario o del usuario logueado.
      </p>

      <strong>Formulario</strong>
      <ul style={{ margin: '0.25rem 0 0.75rem', paddingLeft: '1.25rem' }}>
        {PENDIENTES_FORM.map((p) => <li key={p}>{p}</li>)}
      </ul>

      {ESCENARIOS.map((e) => (
        <div key={e.titulo} style={{ marginBottom: '0.75rem' }}>
          <strong>{e.titulo}</strong>
          <div style={{ color: 'var(--sapContent_LabelColor)' }}><code>{e.servicio}</code></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 2rem' }}>
            <div style={{ flex: '1 1 20rem' }}>
              <em>Fijo / pendiente:</em>
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
                {e.fijos.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
            <div style={{ flex: '1 1 20rem' }}>
              <em>Dinámico:</em>
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
                {e.dinamicos.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          </div>
          <details>
            <summary style={{ cursor: 'pointer' }}>Ver JSON que se envía</summary>
            <pre style={estiloJson}>{e.json}</pre>
          </details>
        </div>
      ))}
    </div>
  )
}
