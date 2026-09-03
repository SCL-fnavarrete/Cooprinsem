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

    console.log('PostgreSQL: tabla pos_parametro_general verificada (MANDANTE=200 por defecto)');
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
