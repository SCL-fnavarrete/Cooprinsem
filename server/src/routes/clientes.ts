import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { sapResults, sapSingle } from '../utils/sapResponse';

const router = Router();

// GET /api/clientes?search= — buscar clientes (case-insensitive, priorizar sucursal actual)
router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query['search'] ?? '').trim();
  const sucursal = String(req.query['sucursal'] ?? 'D190');

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

  // Priorizar clientes de la sucursal actual
  const sucursalActual = clientes.filter((c) => c.sucursal === sucursal);
  const otrosSucursales = clientes.filter((c) => c.sucursal !== sucursal);

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

export default router;
