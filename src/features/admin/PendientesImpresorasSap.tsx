import { Title } from '@ui5/webcomponents-react'

// Aviso para quien revisa Admin > Tablas SAP > Usuario Vendedor, Config.
// Impresoras e Impresoras Usuario (mismo criterio que PendientesUsuariosSap).
// Contenido estático — mantener alineado con server/src/routes/sapMaestro.ts.
// Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'Significado de las columnas: confirmar con Arquitectura Kschl (clase de mensaje: ZFE2, ZGN1/ZGN2, ZBO2, ZNC1/ZNC2, ZND2, ZFFI, ZFMM, ZGBM…), Zip (ruta de la impresora de red) e ImpCopago / CopagoActivo / ImpCtaCte / ImpCotizacion. Se muestran con el nombre SAP.',
  'Código de vendedor: en los usuarios que también están en Usuarios_pos, Sap_usuario_vendedor.Zvendedor NO coincide con Usuarios_pos.IdVendedor (6 de 6 al 13-10-2026). Pendiente definir cuál es la fuente válida; hoy Admin > Usuarios toma el de Usuarios_pos.',
  'Uso de las impresoras en el POS: hoy solo se listan. Pendiente definir si el POS debe imprimir con ellas (copago, cuenta corriente, cotización, documentos por clase de mensaje) y cómo (impresora de red \\\\IP\\cola).',
  'Config. Impresoras con usuario vacío (14 filas al 13-10-2026): se asume que aplica a toda la oficina de ventas. Por confirmar.',
]

const FIJOS = [
  'Impresoras Usuario: búsqueda en el backend y máximo 1.000 filas por consulta (la tabla tiene ~3.200); si hay más se avisa para acotar con el buscador.',
  'Paginación en el navegador (10/30/50/100 filas por página), igual que Perfiles Usuario.',
  'Usuario Vendedor: el código se compara con Usuarios_pos sin ceros a la izquierda.',
]

const ASUMIDOS = [
  'Las 3 tablas las alimenta el sync de Arquitectura SAP (creadas el 13-10-2026): el POS solo las lee.',
  'Están modeladas en schema.prisma idénticas a la BD (ADR-028): un prisma db push ya no las borra.',
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

export function PendientesImpresorasSap() {
  return (
    <div style={estiloCaja} data-testid="pendientes-impresoras-sap">
      <Title level="H5">Pendientes — Vendedores e impresoras SAP</Title>
      <p style={{ margin: '0.25rem 0 0.75rem' }}>
        Tablas <code>Sap_usuario_vendedor</code>, <code>Sap_impresora_config</code> y <code>Sap_usuario_impresora</code> vía{' '}
        <code>GET /api/sap-maestro/usuario-vendedor</code>, <code>/impresora-config</code> y <code>/usuario-impresora</code>.
      </p>
      <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
      <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
      <Lista titulo="Asumido / confirmado" items={ASUMIDOS} />
    </div>
  )
}
