import { Router, Request, Response } from 'express';

const router = Router();

// Datos mock del arqueo — en Fase 1 será OData SAP (ZFI26, FBL5N)
const ARQUEO_MOCK = {
  id: 'ARQ-001',
  fechaCaja: '07/03/2026',
  sucursalId: 'D190',
  cajeroId: 'cajero',
  estado: 'GRABADO',
  montoTotal: 630000,
  detalles: [
    { tipoPagoCodigo: 'EF', tipoPagoDenominacion: 'EFECTIVO', monto: 450000, moneda: 'CLP' },
    { tipoPagoCodigo: 'TD', tipoPagoDenominacion: 'TARJETA DE DÉBITO', monto: 180000, moneda: 'CLP' },
  ],
  fechaGrabado: new Date().toISOString(),
};

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

  const arqueo = {
    id: `ARQ-${Date.now()}`,
    fechaCaja,
    sucursalId,
    cajeroId,
    estado: 'GRABADO',
    montoTotal,
    detalles,
    fechaGrabado: new Date().toISOString(),
  };

  res.json({ d: arqueo });
});

// GET /api/arqueo/dia — obtener arqueo del día para cierre
router.get('/dia', (req: Request, res: Response) => {
  const { fecha, sucursal, cajero } = req.query;

  if (!fecha || !sucursal || !cajero) {
    res.status(400).json({ error: 'Parámetros fecha, sucursal y cajero son requeridos' });
    return;
  }

  // Retorna arqueo mock con datos de prueba
  res.json({ d: { ...ARQUEO_MOCK, fechaCaja: String(fecha), sucursalId: String(sucursal), cajeroId: String(cajero) } });
});

// POST /api/arqueo/cierre — ejecutar cierre de caja
router.post('/cierre', (req: Request, res: Response) => {
  const { arqueoId, estado, jefeAdminId } = req.body;

  if (!arqueoId || !estado || !jefeAdminId) {
    res.status(400).json({ error: 'arqueoId, estado y jefeAdminId son requeridos' });
    return;
  }

  // Tabla comparativa con diferencias realistas (RN-09: diferencia = arqueo - recaudado)
  const cierre = {
    id: `CIE-${Date.now()}`,
    arqueoId,
    fechaCaja: ARQUEO_MOCK.fechaCaja,
    sucursalId: ARQUEO_MOCK.sucursalId,
    cajeroId: ARQUEO_MOCK.cajeroId,
    jefeAdminId,
    estado,
    detalles: [
      { tipoPagoCodigo: 'EF', denominacion: 'EFECTIVO', montoArqueo: 450000, montoRecaudado: 445000, diferencia: 5000, moneda: 'CLP' },
      { tipoPagoCodigo: 'TD', denominacion: 'TARJETA DE DÉBITO', montoArqueo: 180000, montoRecaudado: 180000, diferencia: 0, moneda: 'CLP' },
    ],
    fechaCierre: estado === 'DEFINITIVO' ? new Date().toISOString() : undefined,
  };

  res.json({ d: cierre });
});

export default router;
