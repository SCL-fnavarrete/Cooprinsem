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

// GET /api/pedidos/:vbeln — detalle de un pedido
router.get('/:vbeln', async (req: Request, res: Response) => {
  try {
    const vbeln = String(req.params['vbeln']);

    const pedido = await prisma.pedidoVenta.findUnique({
      where: { vbeln },
      include: { posiciones: true },
    });

    if (!pedido) {
      return res.status(404).json({ error: `Pedido ${vbeln} no encontrado` });
    }

    // Buscar datos del cliente
    const cliente = await prisma.cliente.findFirst({
      where: { kunnr: pedido.kunnr },
    });

    // Obtener descripciones de materiales
    const matnrs = pedido.posiciones.map((pos) => pos.matnr);
    const materiales = await prisma.material.findMany({
      where: { matnr: { in: matnrs } },
      select: { matnr: true, descripcion: true, unidad_medida: true },
    });
    const matMap = new Map(materiales.map((m) => [m.matnr, m]));

    const lineas = pedido.posiciones.map((pos, idx) => {
      const mat = matMap.get(pos.matnr);
      return {
        posicion: String((idx + 1) * 10),
        codigoMaterial: pos.matnr,
        descripcion: mat?.descripcion ?? pos.matnr,
        cantidad: pos.cantidad,
        unidadMedida: mat?.unidad_medida ?? 'UN',
        precioUnitario: pos.precio_unitario,
        subtotal: pos.subtotal,
      };
    });

    const subtotal = lineas.reduce((sum, l) => sum + l.subtotal, 0);
    const totalIVA = Math.round(subtotal * 0.19);

    res.json({
      d: {
        vbeln: pedido.vbeln,
        fecha: pedido.fecha.toISOString().slice(0, 10),
        kunnr: pedido.kunnr,
        nombreCliente: cliente?.nombre ?? '',
        rut: cliente?.rut ?? '',
        tipoDoc: pedido.tipo_doc,
        canal: pedido.canal,
        condicionPago: cliente?.condicion_pago ?? '',
        vendedor: '',
        estado: pedido.estado,
        lineas,
        subtotal,
        totalIVA,
        total: subtotal + totalIVA,
      },
    });
  } catch (err) {
    console.error('Error consultando pedido:', err);
    res.status(500).json({ error: 'Error al consultar pedido' });
  }
});

// GET /api/pedidos — listado de pedidos con filtros opcionales
router.get('/', async (req: Request, res: Response) => {
  try {
    const estado = String(req.query['estado'] ?? '');
    const desde = String(req.query['desde'] ?? '');
    const hasta = String(req.query['hasta'] ?? '');

    const where: Record<string, unknown> = {};
    if (estado) {
      where['estado'] = estado;
    }
    if (desde || hasta) {
      const dateFilter: Record<string, Date> = {};
      if (desde) dateFilter['gte'] = new Date(desde);
      if (hasta) dateFilter['lte'] = new Date(hasta + 'T23:59:59');
      where['fecha'] = dateFilter;
    }

    const pedidos = await prisma.pedidoVenta.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: 100,
    });

    const results = pedidos.map((p) => ({
      vbeln: p.vbeln,
      fecha: p.fecha.toISOString().slice(0, 10),
      kunnr: p.kunnr,
      nombreCliente: '',
      tipoDoc: p.tipo_doc,
      canal: p.canal,
      total: p.total,
      estado: p.estado,
    }));

    res.json({ d: { results } });
  } catch (err) {
    console.error('Error listando pedidos:', err);
    res.status(500).json({ error: 'Error al consultar pedidos' });
  }
});

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
        canal: body.canal ?? 'Venta Mesón',
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
