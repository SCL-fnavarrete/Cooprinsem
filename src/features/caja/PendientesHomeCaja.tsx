import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Caja > Home ("Listado documentos"): qué va fijo, qué
// falta definir y qué asumimos (mismo criterio que PendientesCtaCte).
// Contenido estático — mantener alineado con ListadoDocumentosCaja.tsx y
// CajaPage.tsx. Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'Fuente de los "documentos disponibles para pagar": por definir (¿qué documentos son?, ¿de SAP?, ¿de la sucursal o del día?). Mientras tanto la tabla se muestra vacía.',
  'Botón "Actualizar Documento" del WebDynpro: no implementado.',
  'Columnas "Cliente" (¿nombre o código?) y "Fecha" (¿del documento o de vencimiento?): pendiente confirmar qué muestran.',
  'Pagos: con la fuente definida, confirmar a qué pantalla de pago van los documentos seleccionados (hoy usa la pantalla de pago del listado anterior).',
]

const FIJOS = [
  'La tabla no consulta datos: se muestra "No hay documentos disponibles para pagar".',
  'Columnas: Sel. y Estado, y luego las del WebDynpro: Tipo documento, Folio, Rut, Cliente, Moneda Doc., Monto Doc., Moneda, Monto, Fecha, Bloqueo pago.',
  'Filtros visibles: Cliente, Nombre y Estado (corresponden a columnas de la tabla). Ocultos: Nº Documento SAP y Nº Pedido Interno.',
  'Botón "Pagos": deshabilitado hasta que se seleccione al menos un documento.',
]

const ASUMIDOS = [
  'Estado (no está en el WebDynpro) con el mismo criterio del resto de Caja: Vigente, Por vencer (≤ 7 días), Vencida, Pagada.',
  'Solo se pueden pagar juntos documentos de un mismo cliente.',
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
        Réplica de la grilla "Listado de Documentos" del WebDynpro de Caja. Sin fuente de datos definida.
      </p>
      <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
      <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
      <Lista titulo="Asumido" items={ASUMIDOS} />
    </div>
  )
}
