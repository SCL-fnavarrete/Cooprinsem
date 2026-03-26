import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { sapCreated } from '../utils/sapResponse';

const router = Router();

interface BodyCobro {
  kunnr: string;
  monto: number;
  medio_pago?: string;
  belnrs_cancelados?: string[];
}

// POST /api/cobros — registrar cobro efectivo, retorna { belnr }
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body as BodyCobro;

  if (!body.kunnr || !body.monto || body.monto <= 0) {
    return res.status(400).json({ error: 'kunnr y monto > 0 son requeridos' });
  }

  // Generar BELNR correlativo clase W
  const count = await prisma.cobro.count();
  const belnr = String(1500000000 + count + 1).padStart(10, '0');

  const cobro = await prisma.cobro.create({
    data: {
      belnr,
      kunnr: body.kunnr,
      monto: body.monto,
      medio_pago: body.medio_pago ?? 'EFECTIVO',
      clase_doc: 'W',
    },
  });

  // Marcar partidas como pagadas si se informaron
  if (body.belnrs_cancelados && body.belnrs_cancelados.length > 0) {
    await prisma.partidaAbierta.updateMany({
      where: { belnr: { in: body.belnrs_cancelados } },
      data: { estado: 'PAGADO' },
    });

    // Actualizar pedidos vinculados a "Procesado"
    const partidasConPedido = await prisma.partidaAbierta.findMany({
      where: { belnr: { in: body.belnrs_cancelados }, vbeln: { not: null } },
      select: { vbeln: true },
    });
    const vbelns = [...new Set(partidasConPedido.map(p => p.vbeln).filter(Boolean))] as string[];
    if (vbelns.length > 0) {
      await prisma.pedidoVenta.updateMany({
        where: { vbeln: { in: vbelns } },
        data: { estado: 'Procesado' },
      });
    }
  }

  sapCreated(res, {
    BELNR: cobro.belnr,
    BLART: 'W',
    BUKRS: 'COOP',
    monto: cobro.monto,
    status: 'OK',
  });
}));

export default router;
