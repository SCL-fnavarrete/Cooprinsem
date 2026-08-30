import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

async function crearClienteSap() {
  const { SAP_BASE_URL, SAP_USER, SAP_PASSWORD } = process.env;
  if (!SAP_BASE_URL || !SAP_USER || !SAP_PASSWORD) {
    throw new Error('Faltan variables de entorno SAP');
  }
  const sapHost = SAP_BASE_URL.replace('/API_MATERIAL_STOCK_SRV', '');
  const credenciales = Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64');
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  return axios.create({
    baseURL: `${sapHost}/API_SALES_ORDER_SIMULATION_SRV`,
    httpsAgent,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'sap-client': await getMandante(),
      'Accept-Language': 'es',
      'sap-language': 'ES',
      Authorization: `Basic ${credenciales}`,
    },
  });
}

router.post('/validar', asyncHandler(async (req: Request, res: Response) => {
  const { cliente, items, centro } = req.body;

  if (!cliente || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: 'Faltan datos del pedido (cliente, items)' });
    return;
  }

  const sapCliente = await crearClienteSap();

  // Obtener token CSRF
  const tokenRes = await sapCliente.get('/$metadata', {
    headers: { 'X-CSRF-Token': 'Fetch', 'Accept': '*/*' },
  });
  const token = tokenRes.headers['x-csrf-token'] as string;
  const cookies = (tokenRes.headers['set-cookie'] ?? []).join('; ');

  const body = {
    SalesOrderType: 'ZV01',
    SalesOrganization: 'COOP',
    DistributionChannel: 'VM',
    OrganizationDivision: '00',
    SoldToParty: String(parseInt(cliente, 10)).padStart(10, '0'),
    PurchaseOrderByCustomer: `POS-${Date.now()}`,
    RequestedDeliveryDate: `/Date(${Date.now()})/`,
    TransactionCurrency: 'CLP',
    to_Item: {
      results: items.map((item: any) => ({
        Material: item.codigoMaterial,
        RequestedQuantity: String(item.cantidad),
        SalesOrderItemCategory: 'Z001',
        Plant: centro ?? 'D190',
      })),
    },
  };

  try {
    const response = await sapCliente.post('/A_SalesOrderSimulation', body, {
      headers: { 'X-CSRF-Token': token, Cookie: cookies },
    });
    res.json({
      success: true,
      data: response.data?.d,
      message: 'Pedido validado correctamente en SAP',
    });
  } catch (sapError: any) {
    const errorSap = sapError?.response?.data?.error?.message?.value ?? sapError.message;
    const status = sapError?.response?.status ?? 500;
    res.status(status).json({
      success: false,
      message: errorSap,
      detalle: sapError?.response?.data,
    });
  }
}));

export default router;