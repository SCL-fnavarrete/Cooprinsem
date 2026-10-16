import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import {
  salesOrder10, sinCeros, itemsFacturables, construirBodyFactura, construirBodyFolio, interpretarFolio,
  mensajeErrorSap, hoyChile,
} from './sapFacturasBody';

// ─── Facturación del pedido POS (pasos 2 y 3) ───────────────────────────────
// Documento de José Castillo "Creación de factura POS — ejemplo de los 3 pasos
// SAP" (16-10-2026) y sus respuestas del mismo día:
//   - Por ahora solo se factura un pedido nuevo con Tipo Documento "Venta
//     normal" (ZV01) y Boleta/Factura = "Factura", apenas SAP devuelve el SalesOrder.
//   - Fkart (paso 3) = clase del pedido: ZV01 factura, ZV02 boleta.
//   - IndExencion fijo "0".
// Pasos: 2) API_BILLINGDOCUMENT (OData V4, action CreateFromSDDocument)
//        3) ZPOS_PRINT_SRV/PrintInvoiceSet (V2, folio DTE; espera hasta 60 s).
// Ninguno evita duplicados: cada resultado se graba en pedidos_venta apenas
// llega y un reintento continúa desde el primer paso que falte. Antes de crear
// la factura se busca si ya existe (BillingDocumentItem.ReferenceSDDocument).
//
// Parámetros (pos_parametro_general, auto-init en pgSetup.ts):
//   FACTURA_SAP_HABILITADO 'S' crea la factura; 'N' solo devuelve el JSON propuesto.
//   FACTURA_CLASE_SAP      BillingDocumentType: la clase del pedido (ZV01). ZF2 de la
//                          guía da VF/007 "no prevista" (probado en DEV, 16-10-2026).
//   FOLIO_SAP_HABILITADO   'S' pide el folio; 'N' se detiene después de la factura.

const router = Router();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const SOCIEDAD = 'COOP';
const CLASE_PEDIDO_FACTURA = 'ZV01';
const COMPROBANTE_FACTURA = 'Factura';
const RUTA_V4 = '/sap/opu/odata4/sap/api_billingdocument/srvd_a2x/sap/billingdocument/0001';
const ACCION_CREAR = 'BillingDocument/com.sap.gateway.srvd_a2x.api_billingdocument.v0001.CreateFromSDDocument';
// El POST del folio espera hasta 60 s a que un job de SAP obtenga el folio del SII.
const TIMEOUT_FOLIO_MS = 90_000;

type EstadoPaso = 'ok' | 'existente' | 'propuesta' | 'error' | 'omitido';

// Cada llamada a SAP con su JSON de ida y de vuelta (para depurar desde la pantalla).
export interface ILlamadaSap {
  descripcion: string;
  metodo: 'GET' | 'POST';
  url: string;
  body?: unknown;
  status?: number;
  respuesta?: unknown;
}

export interface IPasoFactura {
  paso: 1 | 2 | 3;
  nombre: string;
  estado: EstadoPaso;
  mensaje: string;
  llamadas: ILlamadaSap[];
  datos?: Record<string, unknown>;
}

function configSap() {
  const { SAP_BASE_URL, SAP_USER, SAP_PASSWORD } = process.env;
  if (!SAP_BASE_URL || !SAP_USER || !SAP_PASSWORD) {
    throw new Error('Faltan variables de entorno SAP (SAP_BASE_URL, SAP_USER, SAP_PASSWORD)');
  }
  const v2 = SAP_BASE_URL.replace('/API_MATERIAL_STOCK_SRV', '');            // …/sap/opu/odata/sap
  const raiz = v2.replace(/\/sap\/opu\/odata\/sap$/, '');
  return {
    v2,
    v4: `${raiz}${RUTA_V4}`,
    authorization: `Basic ${Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64')}`,
  };
}

async function leerParametro(clave: string): Promise<string> {
  try {
    const filas = await prisma.$queryRaw<{ valor: string }[]>`SELECT valor FROM pos_parametro_general WHERE clave = ${clave}`;
    return filas[0]?.valor?.trim() ?? '';
  } catch {
    return '';
  }
}

// GET a SAP registrando la llamada (ida y vuelta). Lanza el error de axios.
async function getSap(llamadas: ILlamadaSap[], descripcion: string, url: string, authorization: string) {
  const llamada: ILlamadaSap = { descripcion, metodo: 'GET', url };
  llamadas.push(llamada);
  try {
    const r = await axios.get(url, { httpsAgent, timeout: 60_000, headers: { Accept: 'application/json', Authorization: authorization } });
    llamada.status = r.status;
    llamada.respuesta = r.data;
    return r.data;
  } catch (error: any) {
    llamada.status = error?.response?.status;
    llamada.respuesta = error?.response?.data ?? error?.message;
    throw error;
  }
}

// POST con token CSRF del mismo servicio (cada servicio pide el suyo, la V4
// desde su propio $metadata). Si SAP rechaza el token (403) se pide uno nuevo
// y se reintenta UNA vez. Registra la llamada (ida y vuelta).
async function postSap(
  llamadas: ILlamadaSap[], descripcion: string, urlMetadata: string, url: string, body: unknown, authorization: string, timeout: number,
) {
  const llamada: ILlamadaSap = { descripcion, metodo: 'POST', url, body };
  llamadas.push(llamada);
  const postear = async () => {
    const t = await axios.get(urlMetadata, { httpsAgent, timeout: 60_000, headers: { Authorization: authorization, 'x-csrf-token': 'Fetch', Accept: '*/*' } });
    const token = t.headers['x-csrf-token'] as string;
    const cookies = (t.headers['set-cookie'] ?? []).join('; ');
    return axios.post(url, body, {
      httpsAgent, timeout,
      headers: { Authorization: authorization, 'x-csrf-token': token, Cookie: cookies, 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  };
  try {
    let r;
    try {
      r = await postear();
    } catch (error: any) {
      if (error?.response?.status !== 403) throw error;
      r = await postear();
    }
    llamada.status = r.status;
    llamada.respuesta = r.data;
    return r.data;
  } catch (error: any) {
    llamada.status = error?.response?.status;
    llamada.respuesta = error?.response?.data ?? (error?.code === 'ECONNABORTED' ? `Sin respuesta en ${timeout / 1000} s` : error?.message);
    throw error;
  }
}

type IFacturaSap = { billingDocument: string; tipo?: string; docContable?: string; ejercicio?: string; contabilizada?: string };

// Factura vigente (no anulada) del pedido: BillingDocumentItem.ReferenceSDDocument.
async function buscarFacturaDelPedido(
  llamadas: ILlamadaSap[], descripcion: string, v4: string, pedido10: string, qs: string, authorization: string,
): Promise<IFacturaSap | null> {
  const busqueda = await getSap(llamadas, descripcion,
    `${v4}/BillingDocumentItem?$filter=${encodeURIComponent(`ReferenceSDDocument eq '${pedido10}'`)}&$select=BillingDocument,BillingDocumentItem,ReferenceSDDocument,ReferenceSDDocumentItem&${qs}`,
    authorization);
  const documentos = [...new Set(((busqueda?.value ?? []) as { BillingDocument: string }[]).map((v) => v.BillingDocument))];
  for (const bd of documentos) {
    const cab = await getSap(llamadas, `Revisar la factura ${sinCeros(bd)}`,
      `${v4}/BillingDocument('${bd}')?$select=BillingDocument,BillingDocumentType,BillingDocumentIsCancelled,AccountingPostingStatus,AccountingDocument,FiscalYear&${qs}`,
      authorization);
    if (!cab?.BillingDocumentIsCancelled) {
      return { billingDocument: bd, tipo: cab?.BillingDocumentType, docContable: cab?.AccountingDocument, ejercicio: cab?.FiscalYear, contabilizada: cab?.AccountingPostingStatus };
    }
  }
  return null;
}

// Emisiones en curso en este proceso: evita dos facturas por doble clic.
const emisionesEnCurso = new Set<string>();

async function buscarPedidoLocal(salesOrder: string) {
  return prisma.pedidoVenta.findFirst({
    where: { sap_sales_order: { in: [salesOrder, sinCeros(salesOrder), salesOrder10(salesOrder)] } },
    orderBy: { id: 'desc' },
  });
}

async function actualizarPedidoLocal(id: number | undefined, data: Record<string, unknown>) {
  if (!id) return;
  try {
    await prisma.pedidoVenta.update({ where: { id }, data });
  } catch (error: any) {
    console.error('[sap-facturas] No se pudo actualizar pedidos_venta:', error.message);
  }
}

/**
 * POST /api/sap-facturas/emitir
 * Body: { salesOrder, centro, tipoDocumento, tipoComprobante, canalDistribucion }
 *
 * Factura un pedido ya creado en SAP (paso 2) y pide su folio (paso 3).
 * Responde siempre con los 3 pasos y, en cada uno, las llamadas a SAP con su
 * JSON de ida y de vuelta.
 */
router.post('/emitir', asyncHandler(async (req: Request, res: Response) => {
  const { salesOrder, centro, tipoDocumento, tipoComprobante, canalDistribucion } = req.body ?? {};
  const so = String(salesOrder ?? '').trim();
  const werks = String(centro ?? '').trim().toUpperCase();
  if (!/^\d{1,10}$/.test(so) || !/^[A-Z0-9]{1,10}$/.test(werks)) {
    res.status(400).json({ success: false, message: 'Faltan el N° de pedido SAP o el centro (o no son válidos)' });
    return;
  }

  // Regla de prueba (José, 16-10-2026): solo Venta normal (ZV01) + Factura
  const documentoVenta = tipoDocumento
    ? await prisma.posDocumentoVenta.findFirst({ where: { descripcion: String(tipoDocumento) } })
    : null;
  const canal = canalDistribucion
    ? await prisma.posCanalDistribucion.findFirst({ where: { descripcion: String(canalDistribucion) } })
    : null;
  if (documentoVenta?.clase_documento !== CLASE_PEDIDO_FACTURA || tipoComprobante !== COMPROBANTE_FACTURA) {
    res.status(400).json({
      success: false,
      message: `Por ahora solo se factura Tipo Documento "Venta normal" (${CLASE_PEDIDO_FACTURA}) con Boleta/Factura = "Factura". Recibido: "${tipoDocumento ?? '—'}" / "${tipoComprobante || '—'}".`,
    });
    return;
  }
  if (!canal) {
    res.status(400).json({ success: false, message: `Canal de distribución "${canalDistribucion ?? '—'}" no encontrado en pos_canal_distribucion` });
    return;
  }

  const clave = salesOrder10(so);
  if (emisionesEnCurso.has(clave)) {
    res.status(409).json({ success: false, message: 'Ya hay una facturación en proceso para este pedido. Espere el resultado.' });
    return;
  }
  emisionesEnCurso.add(clave);

  const { v2, v4, authorization } = configSap();
  const mandante = await getMandante();
  const qs = `sap-client=${mandante}&sap-language=ES`;
  const [facturaHabilitada, claseFactura, folioHabilitado] = await Promise.all([
    leerParametro('FACTURA_SAP_HABILITADO'), leerParametro('FACTURA_CLASE_SAP'), leerParametro('FOLIO_SAP_HABILITADO'),
  ]);
  const modo = {
    factura: facturaHabilitada.toUpperCase() === 'S' ? 'S' : 'N',
    folio: folioHabilitado.toUpperCase() === 'S' ? 'S' : 'N',
    claseFactura: claseFactura || CLASE_PEDIDO_FACTURA,
  };

  const pedidoLocal = await buscarPedidoLocal(so);
  const paso1: IPasoFactura = { paso: 1, nombre: 'Pedido', estado: 'ok', mensaje: `Pedido SAP N° ${sinCeros(so)}`, llamadas: [] };
  const paso2: IPasoFactura = { paso: 2, nombre: 'Factura', estado: 'omitido', mensaje: '', llamadas: [] };
  const paso3: IPasoFactura = { paso: 3, nombre: 'Folio', estado: 'omitido', mensaje: '', llamadas: [] };
  const responder = () => res.json({
    success: paso2.estado !== 'error' && paso3.estado !== 'error',
    salesOrder: sinCeros(so),
    pedidoLocal: pedidoLocal?.vbeln ?? null,
    modo,
    pasos: [paso1, paso2, paso3],
  });

  try {
    // ── Paso 1: leer el pedido en SAP (posiciones a facturar) ──
    let items;
    try {
      const pedido = await getSap(paso1.llamadas, 'Leer el pedido y sus posiciones',
        `${v2}/API_SALES_ORDER_SRV/A_SalesOrder('${clave}')?$expand=to_Item&$format=json&${qs}`, authorization);
      items = itemsFacturables(pedido?.d);
      paso1.datos = { posiciones: items.length, clasePedido: pedido?.d?.SalesOrderType };
      if (items.length === 0) throw new Error('El pedido no tiene posiciones facturables en SAP');
    } catch (error) {
      paso1.estado = 'error';
      paso1.mensaje = `No se pudo leer el pedido ${sinCeros(so)} en SAP: ${mensajeErrorSap(error)}`;
      paso2.mensaje = 'No se intentó: falta el pedido.';
      paso3.mensaje = 'No se intentó: falta la factura.';
      responder();
      return;
    }

    // ── Paso 2: factura ──
    let factura: IFacturaSap | null = null;

    if (pedidoLocal?.factura_sap && pedidoLocal.factura_estado === 'FACTURADA') {
      factura = { billingDocument: pedidoLocal.factura_sap, tipo: pedidoLocal.factura_clase ?? undefined, docContable: pedidoLocal.factura_doc_contable ?? undefined };
      paso2.estado = 'existente';
      paso2.mensaje = `Factura ${sinCeros(factura.billingDocument)} ya registrada en el POS: no se vuelve a crear.`;
    } else {
      // ¿Ya existe en SAP? (reintento tras un corte o un 500)
      try {
        factura = await buscarFacturaDelPedido(paso2.llamadas, 'Buscar si el pedido ya tiene factura', v4, clave, qs, authorization);
      } catch (error) {
        paso2.estado = 'error';
        paso2.mensaje = `No se pudo verificar en SAP si el pedido ya tiene factura (no se creó nada): ${mensajeErrorSap(error)}`;
        paso3.mensaje = 'No se intentó: falta la factura.';
        await actualizarPedidoLocal(pedidoLocal?.id, { factura_estado: 'ERROR', factura_mensaje: paso2.mensaje.slice(0, 500) });
        responder();
        return;
      }

      if (factura) {
        paso2.estado = 'existente';
        paso2.mensaje = `El pedido ya tenía la factura ${sinCeros(factura.billingDocument)} en SAP: no se crea otra.`;
      } else {
        const body = construirBodyFactura({ salesOrder: clave, claseFactura: modo.claseFactura, fecha: hoyChile() });
        const url = `${v4}/${ACCION_CREAR}?${qs}`;
        if (modo.factura !== 'S') {
          paso2.estado = 'propuesta';
          paso2.mensaje = 'FACTURA_SAP_HABILITADO = N: no se envió a SAP. Este es el JSON que se enviaría.';
          paso2.llamadas.push({ descripcion: 'Crear la factura (NO enviado)', metodo: 'POST', url, body });
          paso3.mensaje = 'No se intentó: la factura no se creó (modo solo JSON).';
          responder();
          return;
        }
        await actualizarPedidoLocal(pedidoLocal?.id, { factura_estado: 'PENDIENTE', factura_mensaje: null });
        try {
          const r = await postSap(paso2.llamadas, 'Crear la factura (CreateFromSDDocument)', `${v4}/$metadata?${qs}`, url, body, authorization, 120_000);
          const f = (r?.value ?? [])[0] ?? r;
          // SAP crea la factura pero responde con los campos vacíos (probado en DEV,
          // 16-10-2026): el número se obtiene buscando la factura del pedido.
          factura = f?.BillingDocument
            ? { billingDocument: f.BillingDocument, tipo: f.BillingDocumentType, docContable: f.AccountingDocument, ejercicio: f.FiscalYear, contabilizada: f.AccountingPostingStatus }
            : await buscarFacturaDelPedido(paso2.llamadas, 'Obtener el N° de la factura creada', v4, clave, qs, authorization);
          if (!factura) throw new Error('SAP respondió OK pero no se encontró la factura del pedido');
          paso2.estado = 'ok';
          paso2.mensaje = `Factura ${sinCeros(factura.billingDocument)} creada${factura.contabilizada === 'C' ? ' y contabilizada' : ` (estado contable ${factura.contabilizada || '—'})`}.`;
        } catch (error) {
          paso2.estado = 'error';
          paso2.mensaje = `SAP no creó la factura: ${mensajeErrorSap(error)}. Si fue un corte o error 500, el reintento revisa primero si la factura alcanzó a crearse.`;
          paso3.mensaje = 'No se intentó: falta la factura.';
          await actualizarPedidoLocal(pedidoLocal?.id, { factura_estado: 'ERROR', factura_mensaje: paso2.mensaje.slice(0, 500) });
          responder();
          return;
        }
      }

      await actualizarPedidoLocal(pedidoLocal?.id, {
        factura_sap: factura.billingDocument, factura_clase: factura.tipo ?? null, factura_doc_contable: factura.docContable ?? null,
        factura_ejercicio: factura.ejercicio ?? null, factura_estado: 'FACTURADA', factura_mensaje: null, facturado_en: new Date(),
      });
    }
    paso2.datos = { ...factura };

    // ── Paso 3: folio ──
    if (pedidoLocal?.folio_codigo === 'DOK' && pedidoLocal.folio) {
      paso3.estado = 'existente';
      paso3.mensaje = `Folio ${pedidoLocal.folio} ya asignado: no se vuelve a pedir.`;
      paso3.datos = { folio: pedidoLocal.folio, codigo: 'DOK' };
      responder();
      return;
    }
    const bodyFolio = construirBodyFolio({
      billingDocument: factura.billingDocument, salesOrganization: SOCIEDAD, centro: werks, canal: canal.codigo,
      clasePedido: CLASE_PEDIDO_FACTURA, salesOrder: clave,
    });
    const urlFolio = `${v2}/ZPOS_PRINT_SRV/PrintInvoiceSet?sap-client=${mandante}`;
    if (modo.folio !== 'S') {
      paso3.estado = 'propuesta';
      paso3.mensaje = 'FOLIO_SAP_HABILITADO = N: no se pidió el folio. Este es el JSON que se enviaría.';
      paso3.llamadas.push({ descripcion: 'Solicitar el folio (NO enviado)', metodo: 'POST', url: urlFolio, body: bodyFolio });
      responder();
      return;
    }
    try {
      const r = await postSap(paso3.llamadas, 'Solicitar el folio (PrintInvoiceSet)', `${v2}/ZPOS_PRINT_SRV/$metadata?sap-client=${mandante}`,
        urlFolio, bodyFolio, authorization, TIMEOUT_FOLIO_MS);
      const folio = interpretarFolio(r?.d);
      paso3.estado = folio.ok ? 'ok' : 'error';
      paso3.mensaje = folio.ok ? `Folio ${folio.folio} asignado.` : `Sin folio (${folio.codigo}): ${folio.mensaje}. La factura ya existe; se puede repetir solo este paso.`;
      paso3.datos = { folio: folio.folio, codigo: folio.codigo };
      await actualizarPedidoLocal(pedidoLocal?.id, { folio: folio.folio || null, folio_codigo: folio.codigo, folio_mensaje: folio.mensaje.slice(0, 500) });
    } catch (error) {
      paso3.estado = 'error';
      paso3.mensaje = `No se obtuvo respuesta del folio: ${mensajeErrorSap(error)}. La factura ya existe; repetir solo este paso (si SAP ya asignó el folio, lo devuelve).`;
      await actualizarPedidoLocal(pedidoLocal?.id, { folio_codigo: '???', folio_mensaje: paso3.mensaje.slice(0, 500) });
    }
    responder();
  } finally {
    emisionesEnCurso.delete(clave);
  }
}));

/** GET /api/sap-facturas/estado/:salesOrder — avance de facturación guardado en pedidos_venta. */
router.get('/estado/:salesOrder', asyncHandler(async (req: Request, res: Response) => {
  const p = await buscarPedidoLocal(String(req.params.salesOrder ?? ''));
  if (!p) {
    res.status(404).json({ success: false, message: 'Pedido no encontrado en el POS' });
    return;
  }
  res.json({
    success: true,
    data: {
      vbeln: p.vbeln, salesOrder: p.sap_sales_order, factura: p.factura_sap, facturaClase: p.factura_clase,
      facturaDocContable: p.factura_doc_contable, facturaEstado: p.factura_estado, facturaMensaje: p.factura_mensaje,
      folio: p.folio, folioCodigo: p.folio_codigo, folioMensaje: p.folio_mensaje, facturadoEn: p.facturado_en?.toISOString() ?? null,
    },
  });
}));

export default router;
