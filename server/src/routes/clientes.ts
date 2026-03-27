import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { sapResults, sapSingle, sapCreated } from '../utils/sapResponse';

const router = Router();

// GET /api/clientes?search= — buscar clientes (case-insensitive, priorizar sucursal actual)
router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query['search'] ?? '').trim();
  const sucursal = String(req.query['sucursal'] ?? 'D190');

  // Limpiar puntos y guiones para búsqueda por RUT (usuario puede escribir con o sin formato)
  const searchLimpioRut = search.replace(/[.\-]/g, '');
  const looksLikeRut = /^\d{3,}/.test(searchLimpioRut);

  // Buscar por nombre y kunnr en BD
  const clientes = await prisma.cliente.findMany({
    where: search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { rut: { contains: search, mode: 'insensitive' } },
            { kunnr: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {},
    orderBy: [{ nombre: 'asc' }],
  });

  // Si parece RUT (solo dígitos), filtrar también comparando sin puntos/guiones
  let resultado = clientes;
  if (looksLikeRut && clientes.length === 0) {
    const todos = await prisma.cliente.findMany({ orderBy: [{ nombre: 'asc' }] });
    resultado = todos.filter(c => c.rut.replace(/[.\-]/g, '').includes(searchLimpioRut));
  }

  // Priorizar clientes de la sucursal actual
  const sucursalActual = resultado.filter((c) => c.sucursal === sucursal);
  const otrosSucursales = resultado.filter((c) => c.sucursal !== sucursal);

  sapResults(res, [...sucursalActual, ...otrosSucursales]);
}));

// GET /api/clientes/:kunnr — cliente por código + estado crédito
router.get('/:kunnr', asyncHandler(async (req, res) => {
  const kunnr = String(req.params['kunnr']);
  const cliente = await prisma.cliente.findUnique({ where: { kunnr } });

  if (!cliente) {
    return res.status(404).json({ error: `Cliente ${kunnr} no encontrado` });
  }

  const porcentajeAgotamiento =
    cliente.credito_asignado > 0
      ? Math.round((cliente.credito_utilizado / cliente.credito_asignado) * 100)
      : 0;

  sapSingle(res, { ...cliente, porcentaje_agotamiento: porcentajeAgotamiento });
}));

// POST /api/clientes — crear cliente nuevo
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body;

  // Validar campos obligatorios
  const obligatorios = ['tratamiento', 'rut', 'nombre', 'concepto_busqueda', 'giro', 'direccion', 'region', 'ciudad', 'comuna', 'zona_transporte'];
  const faltantes = obligatorios.filter(campo => !body[campo]?.toString().trim());
  if (faltantes.length > 0) {
    return res.status(400).json({ error: `Campos obligatorios faltantes: ${faltantes.join(', ')}` });
  }

  // Validar RUT único
  const rutLimpio = String(body.rut).replace(/[^0-9kK]/g, '').toUpperCase();
  const existente = await prisma.cliente.findFirst({
    where: { rut: { contains: rutLimpio.slice(0, -1) } },
  });
  if (existente) {
    return res.status(409).json({ error: `Ya existe un cliente con RUT similar: ${existente.kunnr} - ${existente.nombre}` });
  }

  // Generar kunnr correlativo
  const ultimo = await prisma.cliente.findFirst({
    where: { kunnr: { not: '999999' } },
    orderBy: { kunnr: 'desc' },
  });
  const nuevoKunnr = ultimo
    ? String(Number(ultimo.kunnr) + 1).padStart(10, '0')
    : '0001000010';

  const cliente = await prisma.cliente.create({
    data: {
      kunnr: nuevoKunnr,
      nombre: String(body.nombre).trim(),
      rut: String(body.rut).trim(),
      condicion_pago: 'CONT',
      estado_credito: 'AL_DIA',
      credito_asignado: 0,
      credito_utilizado: 0,
      sucursal: String(body.sucursal ?? 'D190'),
      tratamiento: body.tratamiento ?? null,
      nombre2: body.nombre2 ?? null,
      concepto_busqueda: body.concepto_busqueda ?? null,
      giro: body.giro ?? null,
      direccion: body.direccion ?? null,
      region: body.region ?? null,
      ciudad: body.ciudad ?? null,
      comuna: body.comuna ?? null,
      zona_transporte: body.zona_transporte ?? null,
      telefono: body.telefono ?? null,
      celular: body.celular ?? null,
      fax: body.fax ?? null,
      direccion_postal: body.direccion_postal ?? null,
      ciudad_postal: body.ciudad_postal ?? null,
      casilla: body.casilla ?? null,
      correo_contacto: body.correo_contacto ?? null,
      correo_factura: body.correo_factura ?? null,
    },
  });

  const porcentajeAgotamiento = 0;
  sapCreated(res, { ...cliente, porcentaje_agotamiento: porcentajeAgotamiento });
}));

export default router;
