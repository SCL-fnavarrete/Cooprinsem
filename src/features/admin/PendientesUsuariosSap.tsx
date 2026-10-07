import { Title } from '@ui5/webcomponents-react'

// Aviso para quien prueba Admin > Usuarios y Tablas SAP > Perfiles Usuario:
// qué va fijo, qué falta definir y qué asumimos (mismo criterio que
// PendientesHardcodePedido / PendientesCtaCte). Contenido estático — mantener
// alineado con src/features/admin/usuarioSap.ts y server/src/routes/admin.ts.
// Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'TipoUsuario FI / CO: lo está validando SAP (Francisco). La primera respuesta fue FI = Ventas y CO = Caja, pero los datos muestran lo contrario (cajeros = FI sin vendedor y con cliente CME; terreno = CO con vendedor). Se muestra el código con la lectura según los datos.',
  'Canal de distribución VS (en algunos perfiles CAJA_): significado por confirmar con SAP.',
  'Perfiles ESTACION_: no se sabe si corresponden a Caja o a Ventas — no se sugiere rol, lo elige el administrador.',
  'Apertura de caja con el cliente CME del cajero (Kunnr): SAP confirmó que debe enviarse, falta el formato (¿línea de deudor con indicador CME?, ¿reemplaza la cuenta fondo 1010401000?). Hoy la apertura NO lo envía.',
  'El POS todavía NO usa el perfil al iniciar sesión (Fase 3): Pedidos y Caja siguen con centro, canal, oficina, grupo de vendedores, cuenta de caja y centro de beneficio fijos.',
  'Usuarios de prueba admin / venta / caja: no existen en Usuarios_pos, quedan sin perfil SAP.',
  'Nombre de sucursal: solo D190, D052 y D014 tienen nombre; los demás centros se muestran por código.',
]

const FIJOS = [
  'Vínculo usuario POS ↔ usuario SAP: username del POS = IdUsuario de Usuarios_pos (sin columna extra en usuarios).',
  'Rol sugerido por prefijo del perfil: CAJA_ → Caja (3); MESON_ / TERRENO → Ventas (2). El administrador puede cambiarlo. Los códigos de rol no cambian.',
  'Al elegir un usuario SAP se completan: usuario (login), nombre, oficina venta (centro del perfil) e Id Vendedor. Id Vendedor "00000000" se guarda vacío.',
  'Usuarios SAP ya creados en el POS no aparecen para crear de nuevo.',
]

const ASUMIDOS = [
  'Administrador y Consultas no tienen perfil SAP: se crean como hasta ahora (confirmado por SAP).',
  'Las contraseñas se administran en la tabla usuarios del POS (confirmado por SAP).',
  'Kunnr = cliente CME del cajero (confirmado); vacío en vendedores. IdVendedor real solo en vendedores (confirmado).',
  'Usuarios_pos y Perfiles_usuarios los alimenta el sync de Arquitectura SAP: el POS solo los lee.',
  'Usuarios del perfil = Usuarios_pos.IdRol igual a Perfiles_usuarios.IdRol (no se usan las columnas Perfil* copiadas en Usuarios_pos; hoy coinciden).',
  'Un usuario de Ventas o Caja sin usuario SAP se permite (pruebas): usará los valores fijos actuales.',
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

export function PendientesUsuariosSap() {
  return (
    <div style={estiloCaja} data-testid="pendientes-usuarios-sap">
      <Title level="H5">Pendientes — Usuarios y perfiles SAP</Title>
      <p style={{ margin: '0.25rem 0 0.75rem' }}>
        Usuarios SAP: tabla <code>Usuarios_pos</code> vía <code>GET /api/sap-maestro/usuarios-pos</code>.
        Perfiles: <code>Perfiles_usuarios</code> vía <code>GET /api/sap-maestro/perfiles</code>.
      </p>
      <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
      <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
      <Lista titulo="Asumido / confirmado" items={ASUMIDOS} />
    </div>
  )
}
