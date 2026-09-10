import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

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

type ResultadoBody =
  | { ok: true; body: Record<string, unknown>; advertencias: string[] }
  | { ok: false; status: number; message: string };

/**
 * Arma el body que se envía a A_SalesOrderSimulation, sin tocar SAP. Compartido
 * entre /validar (llama a SAP de verdad) y /preview (solo muestra el JSON —
 * usado hoy para pruebas manuales, ver PROGRESS.md).
 */
async function construirBodySimulacion(payload: any): Promise<ResultadoBody> {
  const { cliente, items, centro, tipoDocumento, canalDistribucion, destinatarioMercancia, idVendedor } = payload ?? {};

  if (!cliente || !items || !Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, message: 'Faltan datos del pedido (cliente, items)' };
  }

  // Tipo Documento y Canal Distribución llegan como la descripción elegida en el
  // select del formulario (ver PedidoHeader.tsx) — se resuelve el código SAP real
  // (clase_documento/codigo) contra las tablas maestro, en vez de hardcodearlo.
  const documentoVenta = tipoDocumento
    ? await prisma.posDocumentoVenta.findFirst({ where: { descripcion: tipoDocumento } })
    : null;
  if (!documentoVenta) {
    return { ok: false, status: 400, message: `Tipo de documento "${tipoDocumento}" no encontrado en pos_documento_venta` };
  }

  const canal = canalDistribucion
    ? await prisma.posCanalDistribucion.findFirst({ where: { descripcion: canalDistribucion } })
    : null;
  if (!canal) {
    return { ok: false, status: 400, message: `Canal de distribución "${canalDistribucion}" no encontrado en pos_canal_distribucion` };
  }

  // to_Partner: SH = destinatario mercancía elegido en el form (interlocutor real
  // del cliente, filtrado por PartnerFunction=SH — ver PedidoHeader.tsx). ZA =
  // vendedor que graba el pedido, código fijo, Customer = IdVendedor del usuario
  // logueado. Ambos opcionales — no todos los pedidos tienen destinatario, y no
  // todos los usuarios tienen IdVendedor configurado (ver Admin > Usuarios).
  const advertencias: string[] = [];
  const to_Partner: { PartnerFunction: string; Customer: string }[] = [];
  if (destinatarioMercancia) {
    to_Partner.push({ PartnerFunction: 'SH', Customer: destinatarioMercancia });
  } else {
    advertencias.push('SH no incluido — no hay destinatario mercancía seleccionado en el pedido.');
  }
  if (idVendedor) {
    to_Partner.push({ PartnerFunction: 'ZA', Customer: idVendedor });
  } else {
    advertencias.push('ZA no incluido — el usuario logueado no tiene Id Vendedor configurado (Admin > Usuarios).');
  }

  const body = {
    SalesOrderType: documentoVenta.clase_documento,
    SalesOrganization: 'COOP',
    DistributionChannel: canal.codigo,
    OrganizationDivision: '00',
    SoldToParty: String(parseInt(cliente, 10)).padStart(10, '0'),
    PurchaseOrderByCustomer: `POS-${Date.now()}`,
    RequestedDeliveryDate: `/Date(${Date.now()})/`,
    TransactionCurrency: 'CLP',
    CustomerPaymentTerms: 'D001',
    to_Partner,
    // Array plano según el manual ABAP (sección 11/12) — no envuelto en {results:[...]}.
    to_Item: items.map((item: any) => ({
      Material: item.codigoMaterial,
      RequestedQuantity: String(item.cantidad),
      RequestedQuantityUnit: item.unidadMedida ?? 'UN',
      SalesOrderItemCategory: 'Z001',
      Plant: centro ?? 'D190',
    })),
  };

  return { ok: true, body, advertencias };
}

router.post('/validar', asyncHandler(async (req: Request, res: Response) => {
  const resultado = await construirBodySimulacion(req.body);
  if (!resultado.ok) {
    res.status(resultado.status).json({ success: false, message: resultado.message });
    return;
  }

  const sapCliente = await crearClienteSap();

  // Obtener token CSRF
  const tokenRes = await sapCliente.get('/$metadata', {
    headers: { 'X-CSRF-Token': 'Fetch', 'Accept': '*/*' },
  });
  const token = tokenRes.headers['x-csrf-token'] as string;
  const cookies = (tokenRes.headers['set-cookie'] ?? []).join('; ');

  try {
    // SAP rechaza $expand en este POST ("SystemQueryOptions no permitidos para
    // este tipo de solicitud", confirmado en la primera prueba en vivo) — a
    // diferencia de un GET, la simulación ya devuelve to_Item por defecto.
    const response = await sapCliente.post('/A_SalesOrderSimulation', resultado.body, {
      headers: { 'X-CSRF-Token': token, Cookie: cookies },
    });
    // Plan A: se muestra la respuesta real de SAP tal cual (precio/ATP/crédito por
    // línea vienen en to_Item/to_PricingElement y to_ScheduleLine) — no se arma un
    // resumen Neto/IVA/Total todavía, porque eso requiere saber qué ConditionType
    // usa Cooprinsem para precio/impuesto, y no está confirmado con ABAP.
    res.json({
      success: true,
      data: response.data?.d,
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

/**
 * POST /api/sap-pedidos/preview
 *
 * TEMPORAL — usado por el botón "Grabar" mientras se hacen pruebas manuales de
 * datos (ver PROGRESS.md). Arma el mismo body que /validar, pero NUNCA toca SAP
 * — ni siquiera arma la conexión/CSRF. Solo devuelve el JSON para inspección.
 */
router.post('/preview', asyncHandler(async (req: Request, res: Response) => {
  const resultado = await construirBodySimulacion(req.body);
  if (!resultado.ok) {
    res.status(resultado.status).json({ success: false, message: resultado.message });
    return;
  }

  res.json({
    success: true,
    body: resultado.body,
    advertencias: resultado.advertencias,
  });
}));

export default router;
