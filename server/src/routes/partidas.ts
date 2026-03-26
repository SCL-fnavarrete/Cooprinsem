import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { EstadoPartida } from '../generated/prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { sapResults } from '../utils/sapResponse';

const router = Router();

// Calcula dias de mora para cada partida
function conDiasMora<T extends { fecha_venc: Date }>(partidas: T[]) {
  const hoy = new Date();
  return partidas.map((p) => {
    const venc = new Date(p.fecha_venc);
    const diasMora = Math.max(0, Math.floor((hoy.getTime() - venc.getTime()) / 86400000));
    return { ...p, dias_mora: diasMora };
  });
}

// Enriquecer partidas con nombreCliente via batch lookup
async function conNombreCliente<T extends { kunnr: string }>(partidas: T[]) {
  const kunnrs = [...new Set(partidas.map(p => p.kunnr))];
  if (kunnrs.length === 0) return partidas.map(p => ({ ...p, nombre_cliente: '' }));
  const clientes = await prisma.cliente.findMany({
    where: { kunnr: { in: kunnrs } },
    select: { kunnr: true, nombre: true },
  });
  const map = new Map(clientes.map(c => [c.kunnr, c.nombre]));
  return partidas.map(p => ({ ...p, nombre_cliente: map.get(p.kunnr) ?? '' }));
}

// GET /api/partidas — todas las partidas (abiertas por defecto, o todas si ?incluirPagadas=true)
router.get('/', asyncHandler(async (req, res) => {
  const incluirPagadas = req.query['incluirPagadas'] === 'true';
  const where = incluirPagadas ? {} : { estado: { not: EstadoPartida.PAGADO } };

  const partidas = await prisma.partidaAbierta.findMany({
    where,
    orderBy: { fecha_doc: 'desc' },
  });

  const conMora = conDiasMora(partidas);
  const conCliente = await conNombreCliente(conMora);
  sapResults(res, conCliente);
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

  const conMora = conDiasMora(partidas);
  const conCliente = await conNombreCliente(conMora);
  sapResults(res, conCliente);
}));

export default router;
