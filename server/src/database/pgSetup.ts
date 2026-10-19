import { Pool } from 'pg';
import { prisma } from '../lib/prisma';

// Verifica que las tablas propias del POC existan en PostgreSQL y las crea
// si faltan, para que nadie tenga que correr scripts SQL manualmente al
// actualizar la aplicación (mismo espíritu que server/createTables.js,
// pero ejecutado automáticamente al levantar el backend).
export async function inicializarTablasPostgres(): Promise<void> {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pos_parametro_general (
        id          SERIAL PRIMARY KEY,
        clave       VARCHAR(50) UNIQUE NOT NULL,
        valor       VARCHAR(100) NOT NULL,
        descripcion VARCHAR(200)
      );
    `);

    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('MANDANTE', '200', 'SAP Client Number')
       ON CONFLICT (clave) DO NOTHING;`
    );

    // Contador de BusinessPartner para numeración externa ZNAC (ver ADR-027).
    // ON CONFLICT DO NOTHING es clave acá: si la fila ya existe (ambiente con
    // clientes ya creados), NUNCA se sobrescribe el valor actual del contador.
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('IDCLIENTE', '10000010', 'Id de cliente a usar en la creación de nuevos, número actual de clientes creados')
       ON CONFLICT (clave) DO NOTHING;`
    );

    // Contador de vbeln local (pedidos_venta) para el registro espejo que se
    // crea al confirmar un pedido real en SAP (ver /api/sap-pedidos/crear).
    // Arranca en 8000000005 para no chocar con los 5 pedidos sintéticos del
    // seed (8000000001-8000000005). ON CONFLICT DO NOTHING: igual que
    // IDCLIENTE, nunca pisa el valor actual si el ambiente ya viene usándolo.
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('NPEDIDO', '8000000005', 'Correlativo de vbeln local para pedidos_venta, número actual de pedidos creados')
       ON CONFLICT (clave) DO NOTHING;`
    );

    // Correlativo del folio de cobro de Caja > Pago Cta. Cte. (RefDocNo
    // "CAJ-<sucursal>-<correlativo>" del asiento en SAP). Se reserva con
    // SELECT ... FOR UPDATE antes de contabilizar (ver sapCtaCte.ts).
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('NCOBRO', '0', 'Correlativo del folio de cobro Pago Cta. Cte. (RefDocNo CAJ-<sucursal>-<n>)')
       ON CONFLICT (clave) DO NOTHING;`
    );

    // Pago Cta. Cte. con ZCOOP_PAYMENT_SRV (ver sapCtaCte.ts): cuenta de caja
    // (PK 40) y si se permite pagar varias facturas en un cobro. PAGO_MULTIPLE
    // arranca en 'N' hasta validar en DEV el pago de una factura; se habilita
    // con UPDATE ... SET valor='S', sin desplegar código.
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('CUENTA_CAJA_PAGO', '1010504000', 'Cuenta de caja (PK 40) del pago Cta. Cte. — provisoria, depende del cajero')
       ON CONFLICT (clave) DO NOTHING;`
    );
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('PAGO_MULTIPLE', 'N', 'S = permite pagar varias facturas en un cobro Cta. Cte. (escenario C)')
       ON CONFLICT (clave) DO NOTHING;`
    );

    // Cuentas de la apertura de caja (ver sapCaja.ts): caja (DEBE) y fondo
    // (HABER). Por defecto las que SAP aceptó; se cambian con UPDATE para probar otra.
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('CUENTA_CAJA_APERTURA', '1010504000', 'Cuenta de caja (debe) de la apertura de caja')
       ON CONFLICT (clave) DO NOTHING;`
    );
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('CUENTA_FONDO_APERTURA', '1010101050', 'Cuenta del fondo (haber) de la apertura de caja — la guía dice 1010401000, SAP la rechazó el 14-10-2026')
       ON CONFLICT (clave) DO NOTHING;`
    );

    // Facturación del pedido (sapFacturas.ts, 16-10-2026): arrancan en 'N' (solo
    // muestra el JSON propuesto); la clase de factura es la de la guía, por confirmar.
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('FACTURA_SAP_HABILITADO', 'N', 'S = crea la factura en SAP (API_BILLINGDOCUMENT); N = solo muestra el JSON propuesto')
       ON CONFLICT (clave) DO NOTHING;`
    );
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('FACTURA_CLASE_SAP', 'ZF2', 'BillingDocumentType de la factura (guía de José: ZF2, por confirmar con SAP)')
       ON CONFLICT (clave) DO NOTHING;`
    );
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('FOLIO_SAP_HABILITADO', 'N', 'S = pide el folio DTE (ZPOS_PRINT_SRV); N = se detiene después de la factura')
       ON CONFLICT (clave) DO NOTHING;`
    );

    // Pago residual (menor valor) de Pago Cta. Cte. (sapCtaCte.ts, 19-10-2026):
    // arranca en 'N' (solo muestra el JSON propuesto).
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('PAGO_RESIDUAL_HABILITADO', 'N', 'S = el pago parcial (residual) se contabiliza en SAP; N = solo muestra el JSON propuesto')
       ON CONFLICT (clave) DO NOTHING;`
    );

    // Egreso de caja: 'S' habilita la contabilización real en SAP. Arranca en
    // 'N' hasta que Arquitectura confirme el asiento (ver sapCaja.ts).
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('EGRESO_SAP_HABILITADO', 'N', 'S = el egreso de caja se contabiliza en SAP; N = solo muestra el JSON propuesto')
       ON CONFLICT (clave) DO NOTHING;`
    );
    // Asiento del egreso: CLIENTES (ejemplo de José) o CUENTAS (variante 2 con caja 1010101050).
    await pool.query(
      `INSERT INTO pos_parametro_general (clave, valor, descripcion)
       VALUES ('EGRESO_ASIENTO', 'CLIENTES', 'Asiento del egreso de caja: CLIENTES (ejemplo José) o CUENTAS (variante 2, caja 1010101050)')
       ON CONFLICT (clave) DO NOTHING;`
    );

    console.log('PostgreSQL: tabla pos_parametro_general verificada (MANDANTE=200, IDCLIENTE=10000010, NPEDIDO=8000000005, NCOBRO=0, CUENTA_CAJA_PAGO=1010504000, CUENTA_CAJA_APERTURA=1010504000, CUENTA_FONDO_APERTURA=1010101050, PAGO_MULTIPLE=N, EGRESO_SAP_HABILITADO=N, EGRESO_ASIENTO=CLIENTES por defecto si faltan)');
  } catch (error) {
    console.error('PostgreSQL: error al verificar/crear pos_parametro_general:', error);
  } finally {
    await pool.end();
  }
}

// Las 16 regiones de Chile (mismo listado que server/createRegiones.js,
// que se mantiene como script manual de respaldo).
const REGIONES_CHILE = [
  { Codigo: '01', Descripcion: 'I- Tarapacá' },
  { Codigo: '02', Descripcion: 'II- Antofagasta' },
  { Codigo: '03', Descripcion: 'III- Atacama' },
  { Codigo: '04', Descripcion: 'IV- Coquimbo' },
  { Codigo: '05', Descripcion: 'V- Valparaíso' },
  { Codigo: '06', Descripcion: 'VI- Libertador G.B.O' },
  { Codigo: '07', Descripcion: 'VII- Maule' },
  { Codigo: '08', Descripcion: 'VIII- Biobío' },
  { Codigo: '09', Descripcion: 'IX- Araucanía' },
  { Codigo: '10', Descripcion: 'X- De los Lagos' },
  { Codigo: '11', Descripcion: 'XI- Aisén del Gral C' },
  { Codigo: '12', Descripcion: 'XII- Magallanes y A.' },
  { Codigo: '13', Descripcion: 'RM- Metropolitana' },
  { Codigo: '14', Descripcion: 'XIV- De los Ríos' },
  { Codigo: '15', Descripcion: 'XV- Arica y Parinacota' },
  { Codigo: '16', Descripcion: 'XVI- Del Ñuble' },
];

// Verifica que el maestro Sap_region tenga datos y lo puebla si está vacío,
// para que nadie tenga que correr server/createRegiones.js manualmente al
// actualizar la aplicación (mismo espíritu que inicializarTablasPostgres(),
// pero para datos en vez de estructura).
export async function inicializarRegiones(): Promise<void> {
  try {
    for (const region of REGIONES_CHILE) {
      await prisma.sapRegion.upsert({
        where: { Codigo: region.Codigo },
        update: { Descripcion: region.Descripcion },
        create: region,
      });
    }
    console.log('PostgreSQL: maestro Sap_region verificado (16 regiones de Chile)');
  } catch (error) {
    console.error('PostgreSQL: error al verificar/cargar Sap_region:', error);
  }
}
