import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Home ("Listado documentos"): qué va fijo, qué
// falta definir y qué asumimos (mismo criterio que PendientesCtaCte).
// Contenido estático — mantener alineado con ListadoDocumentosCaja.tsx y
// CajaPage.tsx. Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'Filtro por sucursal: aún no se aplica (se muestran todas las sucursales). Propuesto a Arquitectura filtrar por BusinessPlace = sucursal del cajero (16-10-2026).',
  'Columna Sucursal = BusinessPlace de SAP tal cual. Viene en todas las facturas y boletas; los asientos que crea el POS (aperturas, egresos, pagos — usuario SCLPOS_01) no lo traen y se muestran "No informado". Pedido a Arquitectura que ZCOOP_JOURNALENTRY_SRV y ZCOOP_PAYMENT_SRV acepten el lugar comercial.',
  'Filtros 1 a 3 aplicados el 16-10-2026 a pedido del usuario (recomendación enviada a José/Arquitectura): pendiente que lo validen.',
  'Rango por defecto desde el 01-10-2026: confirmar si luego pasa a ser "últimos N días".',
  'Abonos (H) y documentos en cuotas o con bloqueo: se muestran pero no se pueden pagar (mismas reglas que Pago Cta. Cte.). Por confirmar si los abonos deben verse.',
]

const FIJOS = [
  'FAR_CUSTOMER_LINE_ITEMS/Items con PostingDate entre el 01-10-2026 y hoy (Chile) y CompanyCode "COOP" (consulta de José), más: IsCleared eq \' \' (solo abiertas), SpecialGeneralLedgerCode eq \' \' (sin CME), $orderby=PostingDate desc y $top 500 (el POS pide 501 solo para avisar si hay más).',
  'Ya no aparecen documentos pagados ni CME: el estado "Pagada" del filtro queda sin resultados.',
  'Columnas: Sel., Estado, Sucursal (BusinessPlace), Tipo documento (descripción de tipo_documento), Folio (N° de documento si no hay folio SII), Rut (TaxID1), Cliente (CustomerName), Moneda Doc., Monto Doc., Moneda, Monto, Fecha (fecha del documento), Bloqueo pago.',
  'Filtros: Desde / Hasta (fecha de contabilización, consulta SAP al cambiarlos; por defecto 01-10-2026 a hoy), Cliente (código), Nombre y Estado (estos tres sobre lo ya cargado). Botón "Actualizar" vuelve a consultar SAP.',
  'Paginación en pantalla: 10 filas por página por defecto (10/30/50/100). La selección se mantiene al cambiar de página.',
  'Pagos: va a la misma pantalla de pago de Pago Cta. Cte. (fuente SAP, ZCOOP_PAYMENT_SRV) con el cliente y los documentos elegidos.',
]

const ASUMIDOS = [
  'Estado: Pagada si está compensada; Vencida si tiene días de mora; Por vencer si vence en 7 días o menos; Vigente en otro caso.',
  'Solo se pueden seleccionar juntos documentos de un mismo cliente (si se elige otro cliente se avisa y no se agrega). Con PAGO_MULTIPLE = "N", uno solo.',
  'Orden: fecha del documento, más reciente primero (la consulta de SAP no trae orden).',
  'Montos en CLP enteros, sin decimales.',
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

export function PendientesHomeCaja() {
  return (
    <div style={estiloCaja} data-testid="pendientes-home-caja">
      <Title level="H5">Pendientes — Caja: Listado documentos</Title>
      <p style={{ margin: '0.25rem 0 0.75rem' }}>
        Réplica de la grilla "Listado de Documentos" del WebDynpro de Caja, con la consulta a SAP pedida por José (15-10-2026).
      </p>
      <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
      <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
      <Lista titulo="Asumido" items={ASUMIDOS} />
    </div>
  )
}
