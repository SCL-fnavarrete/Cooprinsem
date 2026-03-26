import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/stock/:matnr — stock por centro/almacen
router.get('/:matnr', asyncHandler(async (req, res) => {
  const matnr = String(req.params['matnr']);

  const stocks = await prisma.stock.findMany({
    where: { matnr },
    orderBy: [{ centro: 'asc' }, { almacen: 'asc' }],
  });

  // Estructura: { centro: { almacen: cantidad } }
  const stockMap: Record<string, Record<string, number>> = {};
  for (const s of stocks) {
    if (!stockMap[s.centro]) stockMap[s.centro] = {};
    stockMap[s.centro][s.almacen] = s.cantidad;
  }

  res.json({ d: { results: stocks, stockMap } });
}));

export default router;
