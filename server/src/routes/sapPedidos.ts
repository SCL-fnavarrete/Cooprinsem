import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

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
 * Reserva atómicamente el próximo vbeln local para el registro espejo en
 * pedidos_venta, incrementando pos_parametro_general (clave NPEDIDO). Mismo
 * patrón que reservarNumeroClienteSap() en sapClientes.ts (SELECT ... FOR
 * UPDATE dentro de una transacción). A diferencia de IDCLIENTE, esto se
 * reserva DESPUÉS de que SAP ya confirmó la creación real del pedido: a
 * diferencia del grupo ZNAC (numeración externa para BusinessPartner), no hay
 * evidencia de que A_SalesOrder/ZPOS requiera numeración externa — SAP asigna
 * su propio SalesOrder internamente (ver bodyCreacion, que no envía ningún
 * campo de número de documento).
 */
async function reservarNumeroPedidoLocal(): Promise<string> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query("SELECT valor FROM pos_parametro_general WHERE clave='NPEDIDO' FOR UPDATE");
    if (r.rowCount === 0) {
      throw new Error('Falta el parámetro NPEDIDO en pos_parametro_general');
    }
    const valorActual = Number(r.rows[0].valor);
    if (!Number.isFinite(valorActual)) {
      throw new Error(`Valor de NPEDIDO no es numérico: "${r.rows[0].valor}"`);
    }
    const nuevoVbeln = String(valorActual + 1);
    await client.query('UPDATE pos_parametro_general SET valor=$1 WHERE clave=$2', [nuevoVbeln, 'NPEDIDO']);
    await client.query('COMMIT');
    return nuevoVbeln;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Crea el registro espejo local (pedidos_venta + pedidos_posicion) para que
 * "Pedidos" y "Búsqueda de Documentos" puedan encontrar el pedido, una vez que
 * SAP ya confirmó la creación real (A_SalesOrder). `vbeln` es el correlativo
 * local (NPEDIDO); el número real de SAP queda aparte en `sap_sales_order`
 * para no pisar `belnr_cobro` (reservado al documento de cobro clase W que
 * genera Caja — ver ADR-021).
 *
 * Nunca debe hacer fallar la respuesta al usuario: si esto falla, SAP ya creó
 * el documento real — solo se loguea el error, no se propaga. Un pedido real
 * en SAP sin espejo local es recuperable; decirle al usuario que falló cuando
 * en SAP sí se creó, no lo es.
 *
 * `precio_unitario`/`subtotal` por línea se calculan localmente a partir del
 * precio que el usuario vio en pantalla (el buscador real de artículos, sobre
 * ZSB_STOCK, no trae precio — ver buscarMaterialesSap() en sapStock.ts), así
 * que suelen venir en 0. `total` sí usa el monto real de SAP (`TotalNetAmount`
 * en la respuesta de A_SalesOrder, confirmado en pruebas — ver commit) cuando
 * viene informado; si no, cae al cálculo local como aproximación.
 */
async function registrarPedidoLocal(payload: {
  kunnr?: string;
  tipoDocumento?: string;
  canalDistribucion?: string;
  observaciones?: string;
  ubicacionPredio?: string;
  items: { codigoMaterial: string; cantidad: number; precioUnitario?: number }[];
  salesOrderSap?: string;
  totalNetoSap?: string | number;
  clienteNombre?: string;
  clienteRut?: string;
  condicionPago?: string;
  vendedorNombre?: string;
}): Promise<void> {
  if (!payload.kunnr) {
    console.error('[sap-pedidos/crear] No se pudo crear el registro local: falta kunnr en la solicitud.');
    return;
  }

  const posiciones = payload.items.map((item) => {
    const precioUnitario = item.precioUnitario ?? 0;
    return {
      matnr: item.codigoMaterial,
      cantidad: item.cantidad,
      precio_unitario: precioUnitario,
      subtotal: item.cantidad * precioUnitario,
    };
  });
  const totalLocal = posiciones.reduce((sum, p) => sum + p.subtotal, 0);
  const totalNetoSap = Number(payload.totalNetoSap);
  const total = Number.isFinite(totalNetoSap) ? totalNetoSap : totalLocal;

  // Reintenta si el vbeln reservado ya existe (P2002) — puede pasar si NPEDIDO
  // quedó desalineado respecto al vbeln máximo real en pedidos_venta (ya
  // ocurrió una vez: NPEDIDO traía un valor previo a los pedidos del seed).
  // Cada intento reserva un número nuevo, así que nunca reintenta con el mismo
  // vbeln que acaba de fallar.
  const MAX_INTENTOS = 3;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    let vbeln: string;
    try {
      vbeln = await reservarNumeroPedidoLocal();
    } catch (error) {
      console.error('[sap-pedidos/crear] No se pudo reservar el vbeln local (SAP ya creó el pedido real):', error);
      return;
    }

    try {
      await prisma.pedidoVenta.create({
        data: {
          vbeln,
          kunnr: payload.kunnr,
          tipo_doc: payload.tipoDocumento ?? 'ZPOS',
          canal: payload.canalDistribucion ?? 'Venta Mesón',
          estado: 'Creado',
          total,
          sap_sales_order: payload.salesOrderSap ?? null,
          cliente_nombre: payload.clienteNombre ?? null,
          cliente_rut: payload.clienteRut ?? null,
          condicion_pago: payload.condicionPago ?? null,
          vendedor_nombre: payload.vendedorNombre ?? null,
          observaciones: payload.observaciones ?? null,
          ubicacion_predio: payload.ubicacionPredio ?? null,
          posiciones: { create: posiciones },
        },
      });
      console.log(`[sap-pedidos/crear] Registro local creado: vbeln=${vbeln} (SAP SalesOrder=${payload.salesOrderSap ?? '—'})`);
      return;
    } catch (error) {
      const esColisionVbeln = error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
        && ((error.meta?.['target'] as string[] | undefined) ?? []).includes('vbeln');
      if (esColisionVbeln && intento < MAX_INTENTOS) {
        console.warn(`[sap-pedidos/crear] vbeln=${vbeln} ya existía (NPEDIDO desalineado) — reintentando (${intento}/${MAX_INTENTOS}).`);
        continue;
      }
      console.error('[sap-pedidos/crear] No se pudo crear el registro local espejo (SAP ya creó el pedido real):', error);
      return;
    }
  }
}

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

    await registrarPedidoLocal({
      kunnr: req.body?.cliente,
      tipoDocumento: req.body?.tipoDocumento,
      canalDistribucion: req.body?.canalDistribucion,
      observaciones: req.body?.observaciones,
      ubicacionPredio: req.body?.ubicacionPredio,
      items: Array.isArray(req.body?.items) ? req.body.items : [],
      salesOrderSap: creacion?.SalesOrder,
      totalNetoSap: creacion?.TotalNetAmount,
      clienteNombre: req.body?.clienteNombre,
      clienteRut: req.body?.clienteRut,
      condicionPago: req.body?.condicionPago,
      vendedorNombre: req.body?.vendedorNombre,
    });

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
