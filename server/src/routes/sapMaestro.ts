import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler, withRetry } from '../middleware/errorHandler';

const router = Router();

// GET /api/sap-maestro/bancos
router.get('/bancos', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const bancos = await prisma.sapBanco.findMany({
    where: search ? {
      OR: [
        { BankKey: { contains: String(search), mode: 'insensitive' } },
        { BankName: { contains: String(search), mode: 'insensitive' } },
        { BankCountry: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { BankKey: 'asc' },
    take: 200,
  });

  res.json({ d: { results: bancos } });
}));

// GET /api/sap-maestro/centros
router.get('/centros', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const centros = await prisma.sapCentro.findMany({
    where: search ? {
      OR: [
        { Plant: { contains: String(search), mode: 'insensitive' } },
        { PlantName: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { Plant: 'asc' },
    take: 200,
  });

  res.json({ d: { results: centros } });
}));

// GET /api/sap-maestro/centros-costo
router.get('/centros-costo', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const centrosCosto = await prisma.sapCentroCosto.findMany({
    where: search ? {
      OR: [
        { CostCenter: { contains: String(search), mode: 'insensitive' } },
        { ControllingArea: { contains: String(search), mode: 'insensitive' } },
        { Department: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { CostCenter: 'asc' },
    take: 200,
  });

  res.json({ d: { results: centrosCosto } });
}));

// GET /api/sap-maestro/sociedades
router.get('/sociedades', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const sociedades = await prisma.sapSociedad.findMany({
    where: search ? {
      OR: [
        { CompanyCode: { contains: String(search), mode: 'insensitive' } },
        { CompanyCodeName: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { CompanyCode: 'asc' },
    take: 200,
  });

  res.json({ d: { results: sociedades } });
}));

// GET /api/sap-maestro/regiones
router.get('/regiones', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;
  const regiones = await withRetry(() => prisma.sapRegion.findMany({
    where: search ? {
      OR: [
        { Codigo: { contains: String(search), mode: 'insensitive' } },
        { Descripcion: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { Codigo: 'asc' },
  }));
  res.json({ d: { results: regiones } });
}));

// GET /api/sap-maestro/interlocutores?customer=0001234567
router.get('/interlocutores', asyncHandler(async (req: Request, res: Response) => {
  const { customer } = req.query;

  if (!customer) {
    return res.status(400).json({ error: 'Parámetro customer es requerido' });
  }

  const customerClean = String(customer).replace(/^0+/, '') || '0';
  const interlocutores = await prisma.sapClienteInterlocutor.findMany({
    where: { Customer: customerClean },
    orderBy: { PartnerFunction: 'asc' },
  });

  // Enriquecer con CustomerName desde Sap_cliente (match BPCustomerNumber = Customer).
  // Usado hoy solo por el Select "Destinatario Mercancía" (fuente='SH'); no afecta
  // a "Quien Retira", que no lee este campo.
  const bpNumbers = [...new Set(interlocutores.map((i) => i.BPCustomerNumber).filter(Boolean))];
  const clientesRelacionados = bpNumbers.length
    ? await prisma.sapCliente.findMany({ where: { Customer: { in: bpNumbers } } })
    : [];
  const nombrePorCustomer = new Map(clientesRelacionados.map((c) => [c.Customer, c.CustomerName]));

  const resultado = interlocutores.map((i) => ({
    ...i,
    CustomerName: nombrePorCustomer.get(i.BPCustomerNumber) ?? '',
  }));

  res.json({ d: { results: resultado } });
}));

export default router;