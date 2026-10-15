import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Home ("Listado documentos"): qué va fijo, qué
// falta definir y qué asumimos (mismo criterio que PendientesCtaCte).
// Contenido estático — mantener alineado con ListadoDocumentosCaja.tsx y
// CajaPage.tsx. Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'Filtro por sucursal: la API no trae Plant/BusinessArea (vienen vacíos). Se muestran los documentos de todas las sucursales.',
  'Recomendación enviada a José/Arquitectura (15-10-2026): filtrar solo partidas abiertas (IsCleared eq \' \', SpecialGeneralLedgerCode eq \' \') y subir el $top. Con la consulta actual vienen documentos ya pagados y CME, y el $top 100 corta el resultado.',
  'Rango por defecto desde el 01-10-2026: confirmar si luego pasa a ser "últimos N días".',
  'Abonos (H), documentos en cuotas y partidas CME: se muestran pero no se pueden pagar (mismas reglas que Pago Cta. Cte.).',
]

const FIJOS = [
  'Consulta de José: FAR_CUSTOMER_LINE_ITEMS/Items con PostingDate entre el 01-10-2026 y hoy (Chile), CompanyCode "COOP", $top 100 (el POS pide 101 solo para avisar si hay más).',
  'Sin filtro de partidas abiertas: vienen también las ya compensadas (IsCleared "X", estado "Pagada") y las CME (ej. aperturas de caja).',
  'Columnas: Sel., Estado, Tipo documento (descripción de tipo_documento), Folio (N° de documento si no hay folio SII), Rut (TaxID1), Cliente (CustomerName), Moneda Doc., Monto Doc., Moneda, Monto, Fecha (fecha del documento), Bloqueo pago.',
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
