import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function crearClienteSap() {
  const sapUrl = process.env.SAP_ZPOS_URL || process.env.SAP_BASE_URL?.replace(/\/sap\/opu\/odata\/sap\/.*/, '');
  const sapClient = await getMandante();
  const sapUser = process.env.SAP_USER;
  const sapPassword = process.env.SAP_PASSWORD;

  if (!sapUrl || !sapUser || !sapPassword) {
    throw new Error('Faltan variables de entorno SAP (SAP_ZPOS_URL, SAP_USER, SAP_PASSWORD)');
  }

  const credenciales = Buffer.from(`${sapUser}:${sapPassword}`).toString('base64');

  return {
    api: axios.create({
      baseURL: sapUrl,
      httpsAgent,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'sap-client': sapClient,
        'sap-language': 'ES',
        Authorization: `Basic ${credenciales}`,
      },
    }),
    credenciales,
    sapClient,
  };
}

// GET /api/sap-egreso/partidas-abiertas?customer=00000XXX
router.get('/partidas-abiertas', asyncHandler(async (req: Request, res: Response) => {
  const { customer } = req.query;

  if (!customer) {
    res.status(400).json({ error: 'Parámetro customer es requerido' });
    return;
  }

  const { api } = await crearClienteSap();
  const filter = `Customer eq '${customer}' and CompanyCode eq 'COOP' and IsCleared eq false`;

  const response = await api.get('/sap/opu/odata/sap/API_OPLACCTGDOCITEMCUBE_SRV/A_OperationalAcctgDocItemCube', {
    params: {
      $filter: filter,
      $orderby: 'NetDueDate asc',
      $top: '50',
    },
  });

  const results = response.data?.d?.results ?? [];
  res.json({ d: { results } });
}));

// POST /api/sap-egreso/contabilizar
router.post('/contabilizar', asyncHandler(async (req: Request, res: Response) => {
  const {
    companyCode,
    documentType,
    documentDate,
    postingDate,
    headerText,
    referenceDocument,
    lineaCme,
    lineaCompensacion,
  } = req.body;

  if (!companyCode || !lineaCme || !lineaCompensacion) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  const { api } = await crearClienteSap();

  // Paso 1: Obtener CSRF token
  const tokenRes = await api.get('/sap/opu/odata/sap/API_JOURNALENTRY_POST/$metadata', {
    headers: { 'x-csrf-token': 'Fetch', Accept: '*/*' },
  });
  const token = tokenRes.headers['x-csrf-token'] as string;
  const cookies = (tokenRes.headers['set-cookie'] ?? []).join('; ');

  // Paso 2: Construir payload
  const fechaMs = new Date(documentDate + 'T00:00:00Z').getTime();
  const fechaOdata = `/Date(${fechaMs})/`;
  const postingMs = new Date(postingDate + 'T00:00:00Z').getTime();
  const postingOdata = `/Date(${postingMs})/`;

  const body = {
    CompanyCode: companyCode,
    DocumentType: documentType || 'SA',
    DocumentDate: fechaOdata,
    PostingDate: postingOdata,
    DocumentHeaderText: headerText || '',
    ReferenceDocument: referenceDocument || '',
    to_JournalEntryItem: {
      results: [
        {
          Customer: lineaCme.customer,
          SpecialGLCode: lineaCme.specialGLCode || '',
          DebitCreditCode: 'S',
          AmountInTransactionCurrency: String(Number(lineaCme.amount).toFixed(2)),
          TransactionCurrency: lineaCme.currency || 'CLP',
          DocumentItemText: lineaCme.text || 'EGRESO X DEVOLUCIÓN',
        },
        {
          Customer: lineaCompensacion.customer,
          DebitCreditCode: 'H',
          AmountInTransactionCurrency: String(Number(lineaCompensacion.amount).toFixed(2)),
          TransactionCurrency: lineaCompensacion.currency || 'CLP',
          DocumentItemText: lineaCompensacion.text || 'DEVOLUCION A CLIENTE',
          ReferenceDocument: lineaCompensacion.referenceDocument,
          ReferenceDocumentFiscalYear: lineaCompensacion.fiscalYear,
          ReferenceDocumentCompanyCode: lineaCompensacion.companyCode || 'COOP',
          ReferenceDocumentLineItem: lineaCompensacion.lineItem || '1',
        },
      ],
    },
  };

  try {
    const response = await api.post('/sap/opu/odata/sap/API_JOURNALENTRY_POST/A_JournalEntryPost', body, {
      headers: { 'x-csrf-token': token, Cookie: cookies },
    });

    res.status(201).json({ success: true, data: response.data?.d });
  } catch (sapError: any) {
    const errorMsg = sapError?.response?.data?.error?.message?.value ?? sapError.message;
    const status = sapError?.response?.status ?? 500;
    res.status(status).json({ success: false, message: errorMsg });
  }
}));

// GET /api/sap-egreso/comprobante?companyCode=COOP&fiscalYear=2026&document=1400000021
router.get('/comprobante', asyncHandler(async (req: Request, res: Response) => {
  const { companyCode, fiscalYear, document } = req.query;

  if (!companyCode || !fiscalYear || !document) {
    res.status(400).json({ error: 'Parámetros companyCode, fiscalYear y document son requeridos' });
    return;
  }

  const { api } = await crearClienteSap();

  const response = await api.get(
    `/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_JournalEntryItemBasic`, {
    params: {
      $filter: `CompanyCode eq '${companyCode}' and FiscalYear eq '${fiscalYear}' and AccountingDocument eq '${document}'`,
      $orderby: 'AccountingDocumentItem asc',
    },
  });

  res.json({ d: response.data?.d });
}));

export default router;