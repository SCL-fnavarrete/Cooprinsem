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
  observaciones?: string;
  ubicacion_predio?: string;
  lineas: LineaPedido[];
}

// Mapa condición de pago → días de plazo
const DIAS_PAGO: Record<string, number> = { 'CONT': 0, '30D': 30, '60D': 60 };

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
        observaciones: pedido.observaciones ?? '',
        ubicacionPredio: pedido.ubicacion_predio ?? '',
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
    const filtroVbeln = String(req.query['vbeln'] ?? '');
    const filtroCliente = String(req.query['cliente'] ?? '');

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
    if (filtroVbeln) {
      where['vbeln'] = { contains: filtroVbeln };
    }

    // Filtro por nombre de cliente: buscar kunnrs que matcheen
    if (filtroCliente) {
      const clientesMatch = await prisma.cliente.findMany({
        where: { nombre: { contains: filtroCliente, mode: 'insensitive' } },
        select: { kunnr: true },
      });
      where['kunnr'] = { in: clientesMatch.map(c => c.kunnr) };
    }

    const pedidos = await prisma.pedidoVenta.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: 100,
    });

    // Batch lookup de nombres de clientes
    const kunnrs = [...new Set(pedidos.map((p) => p.kunnr))];
    const clientes = await prisma.cliente.findMany({
      where: { kunnr: { in: kunnrs } },
      select: { kunnr: true, nombre: true },
    });
    const clienteMap = new Map(clientes.map((c) => [c.kunnr, c.nombre]));

    const results = pedidos.map((p) => ({
      vbeln: p.vbeln,
      fecha: p.fecha.toISOString().slice(0, 10),
      kunnr: p.kunnr,
      nombreCliente: clienteMap.get(p.kunnr) ?? '',
      tipoDoc: p.tipo_doc,
      canal: p.canal,
      total: p.total,
      estado: p.estado,
      nroDocumento: p.belnr_cobro ?? '',
    }));

    res.json({ d: { results } });
  } catch (err) {
    console.error('Error listando pedidos:', err);
    res.status(500).json({ error: 'Error al consultar pedidos' });
  }
});

// POST /api/pedidos — crear pedido + partida abierta, retorna { vbeln }
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

    // Buscar condición de pago del cliente para calcular fecha vencimiento
    const cliente = await prisma.cliente.findFirst({
      where: { kunnr: body.kunnr },
      select: { condicion_pago: true },
    });
    const diasPlazo = DIAS_PAGO[cliente?.condicion_pago ?? 'CONT'] ?? 0;
    const hoy = new Date();
    const fechaVenc = new Date(hoy);
    fechaVenc.setDate(fechaVenc.getDate() + diasPlazo);

    // Generar BELNR correlativo para la partida abierta
    const partidaCount = await prisma.partidaAbierta.count();
    const belnr = String(1900000100 + partidaCount + 1);

    // Importe con IVA 19%
    const importe = total + Math.round(total * 0.19);

    // Crear pedido + partida abierta en transacción atómica
    const pedido = await prisma.$transaction(async (tx) => {
      const nuevoPedido = await tx.pedidoVenta.create({
        data: {
          vbeln,
          kunnr: body.kunnr,
          tipo_doc: body.tipo_doc ?? 'ZPOS',
          canal: body.canal ?? 'Venta Mesón',
          total,
          observaciones: body.observaciones ?? null,
          ubicacion_predio: body.ubicacion_predio ?? null,
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

      // Crear partida abierta asociada al pedido
      await tx.partidaAbierta.create({
        data: {
          belnr,
          kunnr: body.kunnr,
          vbeln,
          clase_doc: 'FV',
          fecha_doc: hoy,
          fecha_venc: fechaVenc,
          importe,
          estado: 'ABIERTO',
          dias_mora: 0,
        },
      });

      return nuevoPedido;
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
