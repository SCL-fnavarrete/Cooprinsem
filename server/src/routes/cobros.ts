import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

interface BodyCobro {
  kunnr: string;
  monto: number;
  medio_pago?: string;
  belnrs_cancelados?: string[];
}

// POST /api/cobros — registrar cobro efectivo, retorna { belnr }
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as BodyCobro;

  if (!body.kunnr || !body.monto || body.monto <= 0) {
    return res.status(400).json({ error: 'kunnr y monto > 0 son requeridos' });
  }

  try {
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
    }

    res.status(201).json({
      d: {
        BELNR: cobro.belnr,
        BLART: 'W',
        BUKRS: 'COOP',
        monto: cobro.monto,
        status: 'OK',
      },
    });
  } catch (err) {
    console.error('Error registrando cobro:', err);
    res.status(500).json({ error: 'Error al registrar cobro en SAP' });
  }
});

export default router;
