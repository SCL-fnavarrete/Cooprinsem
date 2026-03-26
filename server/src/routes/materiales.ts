import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { sapResults } from '../utils/sapResponse';

const router = Router();

// GET /api/materiales?search=&centro= — buscar materiales (excluir bloqueados, ordenar por stock)
router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query['search'] ?? '').trim();
  const centro = String(req.query['centro'] ?? 'D190');
  const almacen = String(req.query['almacen'] ?? 'B000');

  const materiales = await prisma.material.findMany({
    where: {
      bloqueado: false,
      ...(search && {
        OR: [
          { descripcion: { contains: search, mode: 'insensitive' } },
          { matnr: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      stocks: {
        where: { centro, almacen },
      },
    },
  });

  // Ordenar por stock descendente en el almacen principal
  const materialesConStock = materiales.map((m) => ({
    ...m,
    stock_disponible: m.stocks[0]?.cantidad ?? 0,
  }));

  materialesConStock.sort((a, b) => b.stock_disponible - a.stock_disponible);

  sapResults(res, materialesConStock);
}));

export default router;
