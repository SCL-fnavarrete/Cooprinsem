import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/clientes?search= — buscar clientes (case-insensitive, priorizar sucursal actual)
router.get('/', async (req: Request, res: Response) => {
  const search = String(req.query['search'] ?? '').trim();
  const sucursal = String(req.query['sucursal'] ?? 'D190');

  try {
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

    res.json({ d: { results: [...sucursalActual, ...otrosSucursales] } });
  } catch (err) {
    console.error('Error buscando clientes:', err);
    res.status(500).json({ error: 'Error al buscar clientes' });
  }
});

// GET /api/clientes/:kunnr — cliente por código + estado crédito
router.get('/:kunnr', async (req: Request, res: Response) => {
  const kunnr = String(req.params['kunnr']);

  try {
    const cliente = await prisma.cliente.findUnique({ where: { kunnr } });

    if (!cliente) {
      return res.status(404).json({ error: `Cliente ${kunnr} no encontrado` });
    }

    const porcentajeAgotamiento =
      cliente.credito_asignado > 0
        ? Math.round((cliente.credito_utilizado / cliente.credito_asignado) * 100)
        : 0;

    res.json({
      d: {
        ...cliente,
        porcentaje_agotamiento: porcentajeAgotamiento,
      },
    });
  } catch (err) {
    console.error('Error obteniendo cliente:', err);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

export default router;
