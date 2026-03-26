import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { EstadoPartida } from '../generated/prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { sapResults } from '../utils/sapResponse';

const router = Router();

// Calcula dias de mora para cada partida
function conDiasMora(partidas: { fecha_venc: Date }[]) {
  const hoy = new Date();
  return partidas.map((p) => {
    const venc = new Date(p.fecha_venc);
    const diasMora = Math.max(0, Math.floor((hoy.getTime() - venc.getTime()) / 86400000));
    return { ...p, dias_mora: diasMora };
  });
}

// GET /api/partidas — todas las partidas (abiertas por defecto, o todas si ?incluirPagadas=true)
router.get('/', asyncHandler(async (req, res) => {
  const incluirPagadas = req.query['incluirPagadas'] === 'true';
  const where = incluirPagadas ? {} : { estado: { not: EstadoPartida.PAGADO } };

  const partidas = await prisma.partidaAbierta.findMany({
    where,
    orderBy: { fecha_doc: 'desc' },
  });

  sapResults(res, conDiasMora(partidas));
}));

// GET /api/partidas/:kunnr — partidas abiertas del cliente
router.get('/:kunnr', asyncHandler(async (req, res) => {
  const kunnr = String(req.params['kunnr']);
  const incluirPagadas = req.query['incluirPagadas'] === 'true';

  const partidas = await prisma.partidaAbierta.findMany({
    where: {
      kunnr,
      ...(incluirPagadas ? {} : { estado: { not: EstadoPartida.PAGADO } }),
    },
    orderBy: { fecha_doc: 'desc' },
  });

  sapResults(res, conDiasMora(partidas));
}));

export default router;
