import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/stock/:matnr — stock por centro/almacen
router.get('/:matnr', async (req: Request, res: Response) => {
  const matnr = String(req.params['matnr']);

  try {
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
  } catch (err) {
    console.error('Error obteniendo stock:', err);
    res.status(500).json({ error: 'Error al obtener stock' });
  }
});

export default router;
