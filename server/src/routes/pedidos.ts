import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

interface LineaPedido {
  matnr: string;
  cantidad: number;
  precio_unitario: number;
}

interface BodyPedido {
  kunnr: string;
  tipo_doc?: string;
  canal?: string;
  lineas: LineaPedido[];
}

// POST /api/pedidos — crear pedido, retorna { vbeln }
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as BodyPedido;

  if (!body.kunnr || !body.lineas || body.lineas.length === 0) {
    return res.status(400).json({ error: 'kunnr y al menos una linea son requeridos' });
  }

  try {
    // Generar VBELN correlativo
    const count = await prisma.pedidoVenta.count();
    const vbeln = String(8000000000 + count + 1).padStart(10, '0');

    const total = body.lineas.reduce((sum, l) => sum + l.cantidad * l.precio_unitario, 0);

    const pedido = await prisma.pedidoVenta.create({
      data: {
        vbeln,
        kunnr: body.kunnr,
        tipo_doc: body.tipo_doc ?? 'ZPOS',
        canal: body.canal ?? 'Venta Meson',
        total,
        posiciones: {
          create: body.lineas.map((l) => ({
            matnr: l.matnr,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
            subtotal: l.cantidad * l.precio_unitario,
          })),
        },
      },
      include: { posiciones: true },
    });

    res.status(201).json({
      d: {
        VBELN: pedido.vbeln,
        BLART: pedido.tipo_doc,
        total: pedido.total,
      },
    });
  } catch (err) {
    console.error('Error creando pedido:', err);
    res.status(500).json({ error: 'Error al crear pedido en SAP' });
  }
});

export default router;
