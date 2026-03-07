import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EstadoPartida } from '../generated/prisma/client';

const router = Router();

// GET /api/partidas/:kunnr — partidas abiertas del cliente
router.get('/:kunnr', async (req: Request, res: Response) => {
  const kunnr = String(req.params['kunnr']);

  try {
    const partidas = await prisma.partidaAbierta.findMany({
      where: {
        kunnr,
        estado: { not: EstadoPartida.PAGADO },
      },
      orderBy: { fecha_venc: 'asc' },
    });

    // Recalcular dias_mora en base a hoy
    const hoy = new Date();
    const partidasActualizadas = partidas.map((p) => {
      const venc = new Date(p.fecha_venc);
      const diasMora = Math.max(0, Math.floor((hoy.getTime() - venc.getTime()) / 86400000));
      return { ...p, dias_mora: diasMora };
    });

    res.json({ d: { results: partidasActualizadas } });
  } catch (err) {
    console.error('Error obteniendo partidas:', err);
    res.status(500).json({ error: 'Error al obtener partidas abiertas' });
  }
});

export default router;
