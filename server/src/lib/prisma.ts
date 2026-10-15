import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// Sesión en UTC: el adapter envía y lee las fechas sin zona horaria. Con la
// sesión en America/Santiago (default del servidor) las columnas timestamptz se
// leían 3 h antes y se escribían 3 h después (medido el 15-10-2026). Las
// columnas timestamp sin zona no cambian (el adapter envía el mismo texto).
const adapter = new PrismaPg({ connectionString, options: '-c timezone=UTC' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma = new PrismaClient({ adapter } as any);
