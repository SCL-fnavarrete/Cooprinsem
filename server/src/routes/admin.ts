import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

const router = Router();

const ROLES_NOMBRES: Record<number, string> = { 1: 'Administrador', 2: 'Ventas', 3: 'Caja', 4: 'Consultas' };
// No hay modelo Sucursal — mismo mapa estático que ya usaba USUARIOS_MOCK.
const SUCURSALES_NOMBRES: Record<string, string> = { D190: 'Osorno', D052: 'Puerto Montt', D014: 'Temuco' };

type UsuarioConRol = Prisma.UsuarioGetPayload<{ include: { rol: true } }>;

function mapUsuario(u: UsuarioConRol) {
  return {
    id: String(u.id),
    username: u.username,
    rut: u.rut ?? '',
    nombreCompleto: u.nombre_completo,
    email: u.email ?? '',
    rolCod: u.rol_cod,
    rolNombre: u.rol?.nombre ?? ROLES_NOMBRES[u.rol_cod] ?? '',
    sucursalId: u.sucursal_id,
    sucursalNombre: SUCURSALES_NOMBRES[u.sucursal_id] ?? u.sucursal_id,
    estado: u.estado,
    idVendedor: u.IdVendedor ?? '',
  };
}

// Numérico, 3-15 dígitos. Retorna un mensaje de error, o null si es válido.
function validarIdVendedor(valor: string): string | null {
  if (!/^\d{3,15}$/.test(valor)) {
    return 'Id Vendedor debe ser numérico, entre 3 y 15 dígitos';
  }
  return null;
}

function manejarErrorPrisma(e: unknown, res: Response): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const target = (e.meta?.['target'] as string[] | undefined) ?? [];
    if (target.includes('IdVendedor')) {
      res.status(409).json({ error: 'Ese Id Vendedor ya está asignado a otro usuario' });
    } else if (target.includes('username')) {
      res.status(409).json({ error: 'Ese usuario ya existe' });
    } else {
      res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    }
    return true;
  }
  return false;
}

const ROLES_MOCK = [
  { codigo: 1, nombre: 'Administrador', descripcion: 'Jefe de sucursal. Acceso total incluyendo mantenedores.', accesoAdmin: true, accesoPedidos: true, accesoCaja: true },
  { codigo: 2, nombre: 'Ventas', descripcion: 'Vendedor de mesón o terreno. Crea y gestiona pedidos.', accesoAdmin: false, accesoPedidos: true, accesoCaja: false },
  { codigo: 3, nombre: 'Caja', descripcion: 'Cajero. Cobros, pagos, arqueo.', accesoAdmin: false, accesoPedidos: false, accesoCaja: true },
  { codigo: 4, nombre: 'Consultas', descripcion: 'Reportes y consultas sin escritura.', accesoAdmin: false, accesoPedidos: false, accesoCaja: false },
];

const SUCURSALES_MOCK = [
  { codigo: 'D190', nombre: 'Osorno', sociedad: 'COOP', oficinaVentas: 'D190' },
  { codigo: 'D052', nombre: 'Puerto Montt', sociedad: 'COOP', oficinaVentas: 'D052' },
  { codigo: 'D014', nombre: 'Temuco', sociedad: 'COOP', oficinaVentas: 'D014' },
];

// GET /api/admin/usuarios
router.get('/usuarios', asyncHandler(async (_req: Request, res: Response) => {
  const usuarios = await prisma.usuario.findMany({ include: { rol: true }, orderBy: { id: 'asc' } });
  res.json({ d: { results: usuarios.map(mapUsuario) } });
}));

// POST /api/admin/usuarios — crear usuario
router.post('/usuarios', asyncHandler(async (req: Request, res: Response) => {
  const { username, password, rut, nombreCompleto, email, rolCod, sucursalId, estado, idVendedor } = req.body;

  if (!username || !nombreCompleto || !password) {
    res.status(400).json({ error: 'username, password y nombreCompleto son requeridos' });
    return;
  }

  if (idVendedor) {
    const errorValidacion = validarIdVendedor(idVendedor);
    if (errorValidacion) {
      res.status(400).json({ error: errorValidacion });
      return;
    }
  }

  try {
    const nuevo = await prisma.usuario.create({
      data: {
        username,
        password,
        rut: rut || null,
        nombre_completo: nombreCompleto,
        email: email || null,
        rol_cod: rolCod ?? 2,
        sucursal_id: sucursalId ?? 'D190',
        estado: estado ?? 1,
        IdVendedor: idVendedor || null,
      },
      include: { rol: true },
    });
    res.status(201).json({ d: mapUsuario(nuevo) });
  } catch (e) {
    if (!manejarErrorPrisma(e, res)) throw e;
  }
}));

// PUT /api/admin/usuarios/:id — actualizar usuario
router.put('/usuarios/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params['id']);
  const { rut, nombreCompleto, email, rolCod, sucursalId, estado, idVendedor } = req.body;

  if (idVendedor) {
    const errorValidacion = validarIdVendedor(idVendedor);
    if (errorValidacion) {
      res.status(400).json({ error: errorValidacion });
      return;
    }
  }

  try {
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(rut !== undefined && { rut: rut || null }),
        ...(nombreCompleto !== undefined && { nombre_completo: nombreCompleto }),
        ...(email !== undefined && { email: email || null }),
        ...(rolCod !== undefined && { rol_cod: rolCod }),
        ...(sucursalId !== undefined && { sucursal_id: sucursalId }),
        ...(estado !== undefined && { estado }),
        ...(idVendedor !== undefined && { IdVendedor: idVendedor || null }),
      },
      include: { rol: true },
    });
    res.json({ d: mapUsuario(actualizado) });
  } catch (e) {
    if (manejarErrorPrisma(e, res)) return;
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    throw e;
  }
}));

// PATCH /api/admin/usuarios/:id/estado — activar/desactivar
router.patch('/usuarios/:id/estado', asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params['id']);
  const { estado } = req.body;

  try {
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { estado },
      include: { rol: true },
    });
    res.json({ d: mapUsuario(actualizado) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    throw e;
  }
}));

// GET /api/admin/roles
router.get('/roles', (_req: Request, res: Response) => {
  res.json({ d: { results: ROLES_MOCK } });
});

// GET /api/admin/sucursales
router.get('/sucursales', (_req: Request, res: Response) => {
  res.json({ d: { results: SUCURSALES_MOCK } });
});

// GET /api/admin/usuarios/:username/sociedades — obtener sociedades de un usuario
router.get('/usuarios/:username/sociedades', asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });

  try {
    const result = await pool.query(
      'SELECT company_code FROM usuario_sociedades WHERE username = $1',
      [username]
    );
    res.json({ d: { results: result.rows.map((r: any) => r.company_code) } });
  } finally {
    await pool.end();
  }
}));

// POST /api/admin/usuarios/:username/sociedades — asignar sociedades a un usuario
router.post('/usuarios/:username/sociedades', asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;
  const { sociedades } = req.body as { sociedades: string[] };
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });

  try {
    await pool.query('DELETE FROM usuario_sociedades WHERE username = $1', [username]);

    if (sociedades && sociedades.length > 0) {
      const values = sociedades.map((s: string, i: number) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO usuario_sociedades (username, company_code) VALUES ${values}`,
        [username, ...sociedades]
      );
    }

    res.json({ d: { message: 'Sociedades actualizadas', total: sociedades?.length ?? 0 } });
  } finally {
    await pool.end();
  }
}));

// GET /api/admin/usuarios/:username/centros — obtener centros de un usuario
router.get('/usuarios/:username/centros', asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });

  try {
    const result = await pool.query(
      'SELECT plant FROM usuario_centros WHERE username = $1',
      [username]
    );
    res.json({ d: { results: result.rows.map((r: { plant: string }) => r.plant) } });
  } finally {
    await pool.end();
  }
}));

// POST /api/admin/usuarios/:username/centros — asignar centros a un usuario
router.post('/usuarios/:username/centros', asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;
  const { centros } = req.body as { centros: string[] };
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });

  try {
    await pool.query('DELETE FROM usuario_centros WHERE username = $1', [username]);

    if (centros && centros.length > 0) {
      const values = centros.map((plant: string, i: number) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO usuario_centros (username, plant) VALUES ${values}`,
        [username, ...centros]
      );
    }

    res.json({ d: { message: 'Centros actualizados', total: centros?.length ?? 0 } });
  } finally {
    await pool.end();
  }
}));
export default router;
