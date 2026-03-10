import { Router, Request, Response } from 'express';

const router = Router();

// Datos mock de pagarés — solo lectura, sin tabla Prisma
// En Fase 1 será un servicio OData SAP (pendiente confirmar con ABAP)
const PAGARES_MOCK = [
  { id: 'PAG-001', kunnr: '0001000001', nombre: 'Agricola Los Boldos Ltda.', rut: '76.543.210-K', referencia: 'PAG-2026-0001', cuota: 1, valorPagare: 850000, fechaVencimiento: '15/04/2026' },
  { id: 'PAG-002', kunnr: '0001000001', nombre: 'Agricola Los Boldos Ltda.', rut: '76.543.210-K', referencia: 'PAG-2026-0001', cuota: 2, valorPagare: 850000, fechaVencimiento: '15/05/2026' },
  { id: 'PAG-003', kunnr: '0001000002', nombre: 'Fundo El Roble SpA', rut: '77.123.456-K', referencia: 'PAG-2026-0015', cuota: 1, valorPagare: 1500000, fechaVencimiento: '01/03/2026' },
  { id: 'PAG-004', kunnr: '0001000004', nombre: 'Cooperativa Campesina San Jose', rut: '73.456.789-5', referencia: 'PAG-2026-0022', cuota: 1, valorPagare: 2000000, fechaVencimiento: '20/06/2026' },
  { id: 'PAG-005', kunnr: '0001000004', nombre: 'Cooperativa Campesina San Jose', rut: '73.456.789-5', referencia: 'PAG-2026-0022', cuota: 2, valorPagare: 2000000, fechaVencimiento: '20/07/2026' },
  { id: 'PAG-006', kunnr: '0001000007', nombre: 'Semillas y Fertilizantes del Sur Ltda.', rut: '77.654.321-4', referencia: 'PAG-2026-0030', cuota: 1, valorPagare: 350000, fechaVencimiento: '10/02/2026' },
  { id: 'PAG-007', kunnr: '0001000008', nombre: 'Insumos Agropecuarios Rucalhue SpA', rut: '78.345.678-2', referencia: 'PAG-2026-0041', cuota: 1, valorPagare: 75000, fechaVencimiento: '28/03/2026' },
  { id: 'PAG-008', kunnr: '0001000008', nombre: 'Insumos Agropecuarios Rucalhue SpA', rut: '78.345.678-2', referencia: 'PAG-2026-0041', cuota: 2, valorPagare: 75000, fechaVencimiento: '28/04/2026' },
];

// GET /api/pagares — lista completa de pagarés
router.get('/', (_req: Request, res: Response) => {
  res.json({ d: { results: PAGARES_MOCK } });
});

export default router;
