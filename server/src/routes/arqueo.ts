import { Router, Request, Response } from 'express';

const router = Router();

// Almacén en memoria de arqueos y cierres — en Fase 1 será OData SAP
interface ArqueoData {
  id: string;
  fechaCaja: string;
  sucursalId: string;
  cajeroId: string;
  estado: 'GRABADO' | 'CERRADO';
  montoTotal: number;
  detalles: Array<{ tipoPagoCodigo: string; tipoPagoDenominacion: string; monto: number; moneda: string }>;
  fechaGrabado: string;
}

// Clave compuesta: fecha|sucursal|cajero
const arqueosStore = new Map<string, ArqueoData>();
const cierresStore = new Set<string>(); // Claves de arqueos ya cerrados

function arqueoKey(fecha: string, sucursal: string, cajero: string): string {
  return `${fecha}|${sucursal}|${cajero}`;
}

// Seed: un arqueo de ejemplo para que haya datos al iniciar
const SEED_KEY = arqueoKey('11/03/2026', 'D190', 'cajero');
arqueosStore.set(SEED_KEY, {
  id: 'ARQ-001',
  fechaCaja: '11/03/2026',
  sucursalId: 'D190',
  cajeroId: 'cajero',
  estado: 'GRABADO',
  montoTotal: 630000,
  detalles: [
    { tipoPagoCodigo: 'EF', tipoPagoDenominacion: 'EFECTIVO', monto: 450000, moneda: 'CLP' },
    { tipoPagoCodigo: 'TD', tipoPagoDenominacion: 'TARJETA DE DÉBITO', monto: 180000, moneda: 'CLP' },
  ],
  fechaGrabado: new Date().toISOString(),
});

// POST /api/arqueo/grabar — grabar arqueo del cajero
router.post('/grabar', (req: Request, res: Response) => {
  const { fechaCaja, sucursalId, cajeroId, detalles } = req.body;

  if (!fechaCaja || !sucursalId || !cajeroId || !detalles || detalles.length === 0) {
    res.status(400).json({ error: 'Faltan datos requeridos para grabar el arqueo' });
    return;
  }

  const montoTotal = detalles.reduce(
    (sum: number, d: { monto: number }) => sum + Math.round(d.monto),
    0
  );

  const key = arqueoKey(fechaCaja, sucursalId, cajeroId);

  // Si ya existe un cierre definitivo para esta combinación, rechazar
  if (cierresStore.has(key)) {
    res.status(409).json({ error: 'Ya existe un cierre definitivo para esta fecha, sucursal y cajero' });
    return;
  }

  const arqueo: ArqueoData = {
    id: `ARQ-${Date.now()}`,
    fechaCaja,
    sucursalId,
    cajeroId,
    estado: 'GRABADO',
    montoTotal,
    detalles,
    fechaGrabado: new Date().toISOString(),
  };

  // Guardar (sobreescribe si existía uno previo no cerrado)
  arqueosStore.set(key, arqueo);

  res.json({ d: arqueo });
});

// GET /api/arqueo/dia — obtener arqueo del día para cierre
router.get('/dia', (req: Request, res: Response) => {
  const { fecha, sucursal, cajero } = req.query;

  if (!fecha || !sucursal || !cajero) {
    res.status(400).json({ error: 'Parámetros fecha, sucursal y cajero son requeridos' });
    return;
  }

  const key = arqueoKey(String(fecha), String(sucursal), String(cajero));
  const arqueo = arqueosStore.get(key);

  if (!arqueo) {
    res.status(404).json({ error: 'No se encontró arqueo para la fecha, sucursal y cajero indicados' });
    return;
  }

  if (arqueo.estado === 'CERRADO') {
    res.status(409).json({ error: 'El arqueo de esta fecha ya fue cerrado definitivamente' });
    return;
  }

  res.json({ d: arqueo });
});

// POST /api/arqueo/cierre — ejecutar cierre de caja
router.post('/cierre', (req: Request, res: Response) => {
  const { arqueoId, estado, jefeAdminId } = req.body;

  if (!arqueoId || !estado || !jefeAdminId) {
    res.status(400).json({ error: 'arqueoId, estado y jefeAdminId son requeridos' });
    return;
  }

  // Buscar el arqueo original para usar sus datos reales
  let arqueoOrigen: ArqueoData | undefined;
  for (const [, arq] of arqueosStore) {
    if (arq.id === arqueoId) { arqueoOrigen = arq; break; }
  }

  if (!arqueoOrigen) {
    res.status(404).json({ error: 'Arqueo no encontrado' });
    return;
  }

  // Generar tabla comparativa con montos recaudados simulados (pequeñas diferencias realistas)
  const cierreDetalles = arqueoOrigen.detalles.map((d) => {
    // Simular monto recaudado con diferencia aleatoria pequeña (±5%)
    const variacion = Math.round(d.monto * (Math.random() * 0.1 - 0.05));
    const montoRecaudado = d.monto - variacion;
    return {
      tipoPagoCodigo: d.tipoPagoCodigo,
      denominacion: d.tipoPagoDenominacion,
      montoArqueo: d.monto,
      montoRecaudado,
      diferencia: d.monto - montoRecaudado,
      moneda: d.moneda,
    };
  });

  const cierre = {
    id: `CIE-${Date.now()}`,
    arqueoId,
    fechaCaja: arqueoOrigen.fechaCaja,
    sucursalId: arqueoOrigen.sucursalId,
    cajeroId: arqueoOrigen.cajeroId,
    jefeAdminId,
    estado,
    detalles: cierreDetalles,
    fechaCierre: estado === 'DEFINITIVO' ? new Date().toISOString() : undefined,
  };

  // Si es cierre definitivo, marcar el arqueo como cerrado
  if (estado === 'DEFINITIVO') {
    arqueoOrigen.estado = 'CERRADO';
    const key = arqueoKey(arqueoOrigen.fechaCaja, arqueoOrigen.sucursalId, arqueoOrigen.cajeroId);
    cierresStore.add(key);
  }

  res.json({ d: cierre });
});

export default router;
