import { Router, Request, Response } from 'express';

const router = Router();

// Datos mock de usuarios — en Fase 1 serán usuarios SAP vía OData
const ROLES_NOMBRES: Record<number, string> = { 1: 'Administrador', 2: 'Ventas', 3: 'Caja', 4: 'Consultas' };
const SUCURSALES_NOMBRES: Record<string, string> = { D190: 'Osorno', D052: 'Puerto Montt', D014: 'Temuco' };

const USUARIOS_MOCK = [
  { id: 'usr-001', username: 'admin', nombreCompleto: 'Admin Sistema', email: 'admin@cooprinsem.cl', rolCod: 1, rolNombre: 'Administrador', sucursalId: 'D190', sucursalNombre: 'Osorno', estado: 1 },
  { id: 'usr-002', username: 'vendedor', nombreCompleto: 'Juan Vendedor López', email: 'jvendedor@cooprinsem.cl', rolCod: 2, rolNombre: 'Ventas', sucursalId: 'D190', sucursalNombre: 'Osorno', estado: 1 },
  { id: 'usr-003', username: 'cajero', nombreCompleto: 'María Cajero Soto', email: 'mcajero@cooprinsem.cl', rolCod: 3, rolNombre: 'Caja', sucursalId: 'D190', sucursalNombre: 'Osorno', estado: 1 },
  { id: 'usr-004', username: 'consulta', nombreCompleto: 'Pedro Consultas Muñoz', email: 'pconsultas@cooprinsem.cl', rolCod: 4, rolNombre: 'Consultas', sucursalId: 'D190', sucursalNombre: 'Osorno', estado: 1 },
  { id: 'usr-005', username: 'vendedor2', nombreCompleto: 'Ana Vendedor Ríos', email: 'avendedor@cooprinsem.cl', rolCod: 2, rolNombre: 'Ventas', sucursalId: 'D052', sucursalNombre: 'Puerto Montt', estado: 2 },
  { id: 'usr-006', username: 'cajero2', nombreCompleto: 'Luis Cajero Vera', email: 'lcajero@cooprinsem.cl', rolCod: 3, rolNombre: 'Caja', sucursalId: 'D014', sucursalNombre: 'Temuco', estado: 1 },
];

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
router.get('/usuarios', (_req: Request, res: Response) => {
  res.json({ d: { results: USUARIOS_MOCK } });
});

// POST /api/admin/usuarios — crear usuario
router.post('/usuarios', (req: Request, res: Response) => {
  const { username, nombreCompleto, email, rolCod, sucursalId, estado } = req.body;

  if (!username || !nombreCompleto) {
    res.status(400).json({ error: 'username y nombreCompleto son requeridos' });
    return;
  }

  const nuevoUsuario = {
    id: `usr-${Date.now()}`,
    username,
    nombreCompleto,
    email: email ?? '',
    rolCod: rolCod ?? 2,
    rolNombre: ROLES_NOMBRES[rolCod ?? 2] ?? 'Ventas',
    sucursalId: sucursalId ?? 'D190',
    sucursalNombre: SUCURSALES_NOMBRES[sucursalId ?? 'D190'] ?? sucursalId,
    estado: estado ?? 1,
  };

  USUARIOS_MOCK.push(nuevoUsuario);
  res.status(201).json({ d: nuevoUsuario });
});

// PUT /api/admin/usuarios/:id — actualizar usuario
router.put('/usuarios/:id', (req: Request, res: Response) => {
  const id = String(req.params['id']);
  const idx = USUARIOS_MOCK.findIndex((u) => u.id === id);

  if (idx === -1) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const { nombreCompleto, email, rolCod, sucursalId, estado } = req.body;
  const existing = USUARIOS_MOCK[idx];

  const updated = {
    ...existing,
    ...(nombreCompleto !== undefined && { nombreCompleto }),
    ...(email !== undefined && { email }),
    ...(rolCod !== undefined && { rolCod, rolNombre: ROLES_NOMBRES[rolCod] ?? existing.rolNombre }),
    ...(sucursalId !== undefined && { sucursalId, sucursalNombre: SUCURSALES_NOMBRES[sucursalId] ?? sucursalId }),
    ...(estado !== undefined && { estado }),
  };

  USUARIOS_MOCK[idx] = updated;
  res.json({ d: updated });
});

// PATCH /api/admin/usuarios/:id/estado — activar/desactivar
router.patch('/usuarios/:id/estado', (req: Request, res: Response) => {
  const id = String(req.params['id']);
  const idx = USUARIOS_MOCK.findIndex((u) => u.id === id);

  if (idx === -1) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const { estado } = req.body;
  USUARIOS_MOCK[idx] = { ...USUARIOS_MOCK[idx], estado: estado ?? USUARIOS_MOCK[idx].estado };
  res.json({ d: USUARIOS_MOCK[idx] });
});

// GET /api/admin/roles
router.get('/roles', (_req: Request, res: Response) => {
  res.json({ d: { results: ROLES_MOCK } });
});

// GET /api/admin/sucursales
router.get('/sucursales', (_req: Request, res: Response) => {
  res.json({ d: { results: SUCURSALES_MOCK } });
});

export default router;
