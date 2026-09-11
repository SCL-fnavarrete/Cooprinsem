import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Cliente axios apuntando a un servicio OData de SAP (API_SALES_ORDER_SIMULATION_SRV
 * o API_SALES_ORDER_SRV — mismo host, distinto segmento de servicio, ver
 * docs/reference/SAP_EF_Creacion_Pedidos_Venta_v3.md secciones 7/8).
 */
async function crearClienteOData(servicio: string) {
  const { SAP_BASE_URL, SAP_USER, SAP_PASSWORD } = process.env;
  if (!SAP_BASE_URL || !SAP_USER || !SAP_PASSWORD) {
    throw new Error('Faltan variables de entorno SAP');
  }
  const sapHost = SAP_BASE_URL.replace('/API_MATERIAL_STOCK_SRV', '');
  const credenciales = Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64');
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  return axios.create({
    baseURL: `${sapHost}/${servicio}`,
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

/**
 * Obtiene token CSRF y hace el POST contra la entidad indicada. Usado tanto
 * para la simulación (A_SalesOrderSimulation) como para la creación real del
 * pedido (A_SalesOrder) — mismo patrón, distinto servicio/entidad.
 */
async function llamarSapOData(servicio: string, entidad: string, body: Record<string, unknown>): Promise<any> {
  const cliente = await crearClienteOData(servicio);
  const tokenRes = await cliente.get('/$metadata', {
    headers: { 'X-CSRF-Token': 'Fetch', 'Accept': '*/*' },
  });
  const token = tokenRes.headers['x-csrf-token'] as string;
  const cookies = (tokenRes.headers['set-cookie'] ?? []).join('; ');
  const response = await cliente.post(`/${entidad}`, body, {
    headers: { 'X-CSRF-Token': token, Cookie: cookies },
  });
  return response.data?.d;
}

type ResultadoBody =
  | { ok: true; bodySimulacion: Record<string, unknown>; bodyCreacion: Record<string, unknown>; advertencias: string[] }
  | { ok: false; status: number; message: string };

/**
 * Arma los bodies que se envían a SAP, sin tocar SAP todavía. Casi todo es
 * compartido entre simulación (A_SalesOrderSimulation) y creación real
 * (A_SalesOrder) — salvo el campo de centro en la posición, que SAP expone con
 * NOMBRE DISTINTO en cada entidad (confirmado en vivo probando ambas):
 * A_SalesOrderItemSimulation usa "Plant", A_SalesOrderItem usa "ProductionPlant".
 * Antes se armaba un solo body reusado para las 2 llamadas, lo que hacía que
 * una de las 2 fallara siempre con "Eigenschaft '...' ist ungültig" según cuál
 * nombre se eligiera.
 */
async function construirBodySimulacion(payload: any): Promise<ResultadoBody> {
  const { cliente, items, centro, tipoDocumento, canalDistribucion, destinatarioMercancia, idVendedor, purchaseOrderByCustomer } = payload ?? {};

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
  // TEMPORAL — prueba del día: PartnerFunction hardcodeado a 'WE' en vez de
  // 'SH', pero el Customer sigue siendo el destinatario mercancía real elegido
  // en el form. Revertir a:
  // if (destinatarioMercancia) { to_Partner.push({ PartnerFunction: 'SH', Customer: destinatarioMercancia }) }
  // else { advertencias.push('SH no incluido — ...') }
  if (destinatarioMercancia) {
    to_Partner.push({ PartnerFunction: 'WE', Customer: destinatarioMercancia });
  } else {
    advertencias.push('WE no incluido — no hay destinatario mercancía seleccionado en el pedido.');
  }
  // TEMPORAL — segundo interlocutor de prueba, hardcodeado a pedido del
  // usuario (antes iba 3ro, con PartnerFunction 'WE'). Revertir a: quitar este push.
  to_Partner.push({ PartnerFunction: 'ZB', Customer: '90001424' });
  if (idVendedor) {
    to_Partner.push({ PartnerFunction: 'ZA', Customer: idVendedor });
  } else {
    advertencias.push('ZA no incluido — el usuario logueado no tiene Id Vendedor configurado (Admin > Usuarios).');
  }

  const cabecera = {
    SalesOrderType: documentoVenta.clase_documento,
    SalesOrganization: 'COOP',
    DistributionChannel: canal.codigo,
    OrganizationDivision: '00',
    // TEMPORAL — hardcode de prueba a pedido del usuario. Revertir a:
    // SoldToParty: String(parseInt(cliente, 10)).padStart(10, '0'),
    SoldToParty: '10000003',
    // Mismo valor para simulación y creación (generado una vez por el frontend
    // al hacer click en "Grabar" — ver usePedido.ts) para poder correlacionar
    // ambas llamadas en logs de SAP. Fallback por si llega vacío.
    PurchaseOrderByCustomer: purchaseOrderByCustomer || `POS-${Date.now()}`,
    // TEMPORAL — no enviar RequestedDeliveryDate a pedido del usuario, hasta que
    // pida explícitamente agregarlo de nuevo. Revertir a:
    // RequestedDeliveryDate: `/Date(${Date.now()})/`,
    TransactionCurrency: 'CLP',
    // TEMPORAL — no enviar CustomerPaymentTerms a pedido del usuario, hasta que
    // pida explícitamente agregarlo de nuevo. Revertir a:
    // CustomerPaymentTerms: 'D001',
    to_Partner,
  };

  // Campos de posición comunes a ambas entidades — el centro (Plant/ProductionPlant)
  // se agrega aparte en cada body porque el nombre difiere entre simulación y creación.
  const itemsBase = items.map((item: any) => ({
    // TEMPORAL — hardcode de prueba a pedido del usuario. Revertir a:
    // Material: item.codigoMaterial,
    Material: '14700006',
    RequestedQuantity: String(item.cantidad),
    RequestedQuantityUnit: 'UN',
    SalesOrderItemCategory: 'Z001',
  }));
  const plant = centro ?? 'D190';

  const bodySimulacion = {
    ...cabecera,
    // Array plano según el manual ABAP (sección 11/12) — no envuelto en {results:[...]}.
    to_Item: itemsBase.map((item) => ({ ...item, Plant: plant })),
  };
  const bodyCreacion = {
    ...cabecera,
    to_Item: itemsBase.map((item) => ({ ...item, ProductionPlant: plant })),
  };

  return { ok: true, bodySimulacion, bodyCreacion, advertencias };
}

/**
 * POST /api/sap-pedidos/simular
 *
 * Fase 1 — Simulación (A_SalesOrderSimulation): Pricing/Tax/ATP/Credit Check,
 * no crea documento (ver docs/reference/SAP_EF_Creacion_Pedidos_Venta_v3.md §3.1).
 * El botón "Grabar" llama solo a esta ruta primero; la creación real (fase 2,
 * /crear) requiere confirmación explícita del usuario en un modal aparte.
 */
router.post('/simular', asyncHandler(async (req: Request, res: Response) => {
  const resultado = await construirBodySimulacion(req.body);
  if (!resultado.ok) {
    res.status(resultado.status).json({ success: false, message: resultado.message });
    return;
  }

  console.log('[sap-pedidos/simular] body enviado a A_SalesOrderSimulation:', JSON.stringify(resultado.bodySimulacion, null, 2));
  try {
    // SAP rechaza $expand en este POST ("SystemQueryOptions no permitidos para
    // este tipo de solicitud", confirmado en la primera prueba en vivo) — a
    // diferencia de un GET, la simulación ya devuelve to_Item por defecto.
    const simulacion = await llamarSapOData('API_SALES_ORDER_SIMULATION_SRV', 'A_SalesOrderSimulation', resultado.bodySimulacion);
    res.json({
      success: true,
      data: { simulacion },
      advertencias: resultado.advertencias,
      bodySimulacion: resultado.bodySimulacion,
      bodyCreacion: resultado.bodyCreacion,
    });
  } catch (sapError: any) {
    const errorSap = sapError?.response?.data?.error?.message?.value ?? sapError.message;
    const status = sapError?.response?.status ?? 500;
    res.status(status).json({
      success: false,
      message: errorSap,
      detalle: sapError?.response?.data,
      bodySimulacion: resultado.bodySimulacion,
      bodyCreacion: resultado.bodyCreacion,
    });
  }
}));

/**
 * POST /api/sap-pedidos/crear
 *
 * Fase 2 — Creación real del pedido (A_SalesOrder), llamada solo después de que
 * el usuario confirmó explícitamente el resumen mostrado tras una simulación
 * exitosa (ver manual §3.2/§8/§12). Sin estado de sesión entre /simular y /crear
 * — el frontend reenvía los mismos datos del pedido (usePedido.ts guarda el
 * `purchaseOrderByCustomer` usado en /simular para reenviarlo aquí igual).
 */
router.post('/crear', asyncHandler(async (req: Request, res: Response) => {
  const resultado = await construirBodySimulacion(req.body);
  if (!resultado.ok) {
    res.status(resultado.status).json({ success: false, message: resultado.message });
    return;
  }

  console.log('[sap-pedidos/crear] body enviado a A_SalesOrder:', JSON.stringify(resultado.bodyCreacion, null, 2));
  try {
    const creacion = await llamarSapOData('API_SALES_ORDER_SRV', 'A_SalesOrder', resultado.bodyCreacion);
    res.json({
      success: true,
      data: { creacion },
      bodyCreacion: resultado.bodyCreacion,
    });
  } catch (creacionError: any) {
    const errorCreacion = creacionError?.response?.data?.error?.message?.value ?? creacionError.message;
    const status = creacionError?.response?.status ?? 500;
    res.status(status).json({
      success: false,
      message: errorCreacion,
      detalle: creacionError?.response?.data,
      bodyCreacion: resultado.bodyCreacion,
    });
  }
}));

export default router;
