import { Router, Request, Response } from 'express';

const router = Router();

// Datos mock de anticipos — en Fase 1 será OData SAP (clase DZ, transacción F-37)
const ANTICIPOS_MOCK = [
  {
    nroComprobante: '1400000015',
    kunnr: '0001000001',
    nombre: 'Agricola Los Boldos Ltda.',
    rut: '76.543.210-K',
    importe: 350000,
    fechaDoc: '07/03/2026',
    glosa: 'Anticipo para compra de fertilizantes',
    estado: 'PENDIENTE',
  },
  {
    nroComprobante: '1400000020',
    kunnr: '0001000002',
    nombre: 'Fundo El Roble SpA',
    rut: '77.123.456-K',
    importe: 150000,
    fechaDoc: '05/03/2026',
    glosa: 'Anticipo herbicidas temporada',
    estado: 'PENDIENTE',
  },
];

// POST /api/anticipos/buscar — buscar anticipo por kunnr + nroComprobante
router.post('/buscar', (req: Request, res: Response) => {
  const { kunnr, nroComprobante } = req.body;

  if (!kunnr || !nroComprobante) {
    res.status(400).json({ error: 'Código cliente y Nº comprobante son requeridos' });
    return;
  }

  const anticipo = ANTICIPOS_MOCK.find(
    (a) => a.kunnr === kunnr && a.nroComprobante === nroComprobante
  );

  if (!anticipo) {
    res.status(404).json({ error: 'Comprobante no encontrado para el cliente indicado' });
    return;
  }

  res.json({ d: anticipo });
});

export default router;
