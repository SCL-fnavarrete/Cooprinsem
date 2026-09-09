require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Este script crea las tablas adicionales que no maneja Prisma.
// Es seguro ejecutarlo múltiples veces — usa IF NOT EXISTS.

const sql = `
  -- Tabla de centros asignados a usuarios
  -- Columnas alineadas con server/src/routes/admin.ts (usa "plant", no "plant_code")
  CREATE TABLE IF NOT EXISTS usuario_centros (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50) NOT NULL,
    plant      VARCHAR(4) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (username, plant)
  );

  -- Eliminar restricción antigua si existe (de versiones anteriores)
  ALTER TABLE usuario_centros
  DROP CONSTRAINT IF EXISTS fk_usuario;

  -- Migrar estructura vieja (plant_code) a la real si la tabla ya existía con ese nombre
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'usuario_centros' AND column_name = 'plant_code'
    ) THEN
      ALTER TABLE usuario_centros RENAME COLUMN plant_code TO plant;
      ALTER TABLE usuario_centros ALTER COLUMN plant TYPE VARCHAR(4);
      ALTER TABLE usuario_centros ALTER COLUMN username TYPE VARCHAR(50);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'usuario_centros' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE usuario_centros ADD COLUMN created_at TIMESTAMP DEFAULT now();
    END IF;
  END $$;
`;

pool.query(sql)
  .then(() => {
    console.log('✅ Tablas creadas/verificadas correctamente');
    pool.end();
  })
  .catch(e => {
    console.error('❌ Error:', e.message);
    pool.end();
  });