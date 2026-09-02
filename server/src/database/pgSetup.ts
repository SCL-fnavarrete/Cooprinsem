import { Pool } from 'pg';

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
