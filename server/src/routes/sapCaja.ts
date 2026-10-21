import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Cliente axios apuntando a un servicio OData de SAP — mismo patrón que
 * crearClienteOData() en sapPedidos.ts (no se comparte código entre archivos,
 * cada ruta arma el suyo, igual que el resto del proyecto).
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
 * Arma la URL completa (con sap-client/sap-language) tal como queda la
 * llamada real dentro de llamarSapOData() — solo para mostrarla en el
 * frontend junto al request/response (mismo patrón que sapPedidos.ts).
 */
async function construirUrlSap(servicio: string, entidad: string): Promise<string> {
  const { SAP_BASE_URL } = process.env;
  const sapHost = (SAP_BASE_URL ?? '').replace('/API_MATERIAL_STOCK_SRV', '');
  const mandante = await getMandante();
  return `${sapHost}/${servicio}/${entidad}?sap-client=${mandante}&sap-language=ES`;
}

/**
 * Obtiene token CSRF y hace el POST contra la entidad indicada — mismo patrón
 * que llamarSapOData() en sapPedidos.ts.
 */
async function llamarSapOData(servicio: string, entidad: string, body: Record<string, unknown>): Promise<any> {
  const cliente = await crearClienteOData(servicio);
  const tokenRes = await cliente.get('/$metadata', {
    headers: { 'X-CSRF-Token': 'Fetch', Accept: '*/*' },
  });
  const token = tokenRes.headers['x-csrf-token'] as string;
  const cookies = (tokenRes.headers['set-cookie'] ?? []).join('; ');
  const response = await cliente.post(`/${entidad}`, body, {
    headers: { 'X-CSRF-Token': token, Cookie: cookies },
  });
  return response.data?.d;
}

/**
 * Arma el body de ZCOOP_JOURNALENTRY_SRV / JournalEntryHeaderSet para la
 * Apertura de Caja según la VARIANTE 1 de la guía "ZCOOP_JOURNALENTRY_SRV –
 * Guía de Contabilización" v1.0 (oct-2026): solo cuentas de mayor, sin
 * deudores.
 *   - to_Items: Caja (DEBE +monto) y Fondo (HABER −monto). Ambas cuentas salen
 *     de pos_parametro_general: CUENTA_CAJA_APERTURA (por defecto 1010504000)
 *     y CUENTA_FONDO_APERTURA (por defecto 1010101050). La guía indica fondo
 *     1010401000, pero SAP DEV la rechazó ("La cta. 1010401000 COOP no es
 *     contabilizable directamente", 14-10-2026); con 1010101050 SAP aceptó
 *     (docs 1400000074 y 1400000075). El 15-10-2026 Arquitectura pidió probar
 *     la cuenta 10128704 al DEBE para capturar el resultado: se cambia el
 *     parámetro, sin desplegar código.
 *     Sin centro de beneficio: ProfitCtr (PRP1000100 fijo) se quitó el
 *     14-10-2026 a pedido del usuario para probar en la GUI; pendiente
 *     confirmar con SAP si va y de dónde sale (depende del cajero).
 *   - to_Receivable vacío; to_control.OperationMode "01"; to_clearing_items vacío.
 *
 * Reemplaza la versión anterior (cliente/cajero CME código 4 + cuenta
 * 1010101050 provisoria). Cuentas FIJAS a pedido del usuario (2026-10-05) —
 * pendiente: caja del cajero logueado.
 */
const CUENTA_CAJA_DEFECTO = '1010504000';
const CUENTA_FONDO_DEFECTO = '1010101050';

// Cuentas del parámetro tal cual (SAP admite hasta 10 dígitos; ej. 10128704
// se envía sin ceros). Si falta o no es numérica se usa la que SAP ya aceptó.
async function cuentaApertura(clave: string, defecto: string): Promise<string> {
  const valor = await leerParametroCaja(clave);
  return /^\d{1,10}$/.test(valor) ? valor : defecto;
}

function construirBodyAperturaCaja(sucursal: string, monto: number, fecha: string, cuentaCaja: string, cuentaFondo: string) {
  const [anio, mes, dia] = fecha.split('-');
  const fechaOdata = `/Date(${Date.UTC(Number(anio), Number(mes) - 1, Number(dia))})/`;
  const montoTxt = String(Math.round(monto));
  return {
    CompCode: 'COOP',
    DocDate: fechaOdata,
    PstngDate: fechaOdata,
    DocType: 'DW',
    RefDocNo: `A.CAJA ${sucursal}`.slice(0, 16),
    HeaderTxt: `APERTURA CAJA ${sucursal}`.slice(0, 25),
    FiscYear: anio,
    FisPeriod: mes,
    to_control: { OperationMode: '01' },
    to_Items: {
      results: [
        { ItemnoAcc: '0000000001', GlAccount: cuentaCaja, CompCode: 'COOP', ItemText: 'APERTURA CAJA' },
        { ItemnoAcc: '0000000002', GlAccount: cuentaFondo, CompCode: 'COOP', ItemText: 'FONDO INICIAL' },
      ],
    },
    to_Receivable: { results: [] },
    to_Currency: {
      results: [
        { ItemnoAcc: '0000000001', CurrType: '00', Currency: 'CLP', AmtDoccur: montoTxt },
        { ItemnoAcc: '0000000002', CurrType: '00', Currency: 'CLP', AmtDoccur: `-${montoTxt}` },
      ],
    },
    to_clearing_items: { results: [] },
  };
}

const SERVICIO_APERTURA = 'ZCOOP_JOURNALENTRY_SRV';
const ENTIDAD_APERTURA = 'JournalEntryHeaderSet';
const SOCIEDAD = 'COOP';
const MONEDA = 'CLP';

// ─── Registro de la apertura en el POS (tabla apertura_caja, 15-10-2026) ─────
// Regla: la caja de un cajero está abierta si existe una fila con su usuario y
// sucursal y fecha = hoy (hora de Chile). Otro día → hay que abrirla de nuevo.
// La apertura es por cajero (decisión del usuario, 15-10-2026).

// Hoy en Chile como "YYYY-MM-DD" (no UTC: de noche UTC ya es mañana).
function hoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

// "YYYY-MM-DD" → Date para una columna DATE (Prisma la guarda sin hora).
function fechaDb(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

export async function buscarAperturaDelDia(usuario: string, sucursal: string, fecha: string) {
  return prisma.aperturaCaja.findFirst({
    where: { usuario: { equals: usuario, mode: 'insensitive' }, sucursal, fecha: fechaDb(fecha) },
    orderBy: { id: 'desc' },
  });
}

// id BigInt y monto Decimal no se serializan a JSON tal cual.
function mapearApertura(a: NonNullable<Awaited<ReturnType<typeof buscarAperturaDelDia>>>) {
  return {
    id: String(a.id),
    usuario: a.usuario,
    sociedad: a.sociedad,
    sucursal: a.sucursal,
    fecha: a.fecha.toISOString().slice(0, 10),
    monto: Number(a.monto),
    moneda: a.moneda.trim(),
    nroDocumento: a.nro_documento ?? '',
    ejercicio: a.ejercicio ?? '',
    creadoEn: a.creado_en.toISOString(),
  };
}

// Aperturas en curso en este proceso: evita dos asientos en SAP por doble clic.
const aperturasEnCurso = new Set<string>();

/**
 * GET /api/sap-caja/apertura/estado?usuario=DVIANA&sucursal=D190
 *
 * Indica si la caja del cajero está abierta hoy (fila en apertura_caja).
 */
router.get('/apertura/estado', asyncHandler(async (req: Request, res: Response) => {
  const usuario = String(req.query['usuario'] ?? '').trim();
  const sucursal = String(req.query['sucursal'] ?? '').trim();
  if (!usuario || !sucursal) {
    res.status(400).json({ success: false, message: 'usuario y sucursal son requeridos' });
    return;
  }
  const fecha = hoyChile();
  const apertura = await buscarAperturaDelDia(usuario, sucursal, fecha);
  res.json({ success: true, abierta: !!apertura, fecha, apertura: apertura ? mapearApertura(apertura) : null });
}));

/**
 * POST /api/sap-caja/apertura
 *
 * Contabiliza el asiento de Apertura de Caja (clase DW) vía el Z-service
 * ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet (guía v1.0, variante 1) y, si
 * SAP lo acepta, lo registra en apertura_caja. La fecha es siempre la de hoy
 * (Chile); si la caja del cajero ya está abierta hoy no se vuelve a contabilizar.
 */
router.post('/apertura', asyncHandler(async (req: Request, res: Response) => {
  const { usuario, sucursal, monto } = req.body as { usuario?: string; sucursal?: string; monto?: number };
  const montoNum = Number(monto);

  if (!usuario || !sucursal || !Number.isInteger(montoNum) || montoNum <= 0) {
    res.status(400).json({ success: false, message: 'usuario, sucursal y monto (CLP entero mayor a 0) son requeridos' });
    return;
  }

  const fecha = hoyChile();
  const url = await construirUrlSap(SERVICIO_APERTURA, ENTIDAD_APERTURA);
  const clave = `${usuario.toUpperCase()}|${sucursal}|${fecha}`;

  if (aperturasEnCurso.has(clave)) {
    res.status(409).json({ success: false, message: 'Ya hay una apertura de caja en proceso para este cajero. Espere el resultado.', url });
    return;
  }

  const existente = await buscarAperturaDelDia(usuario, sucursal, fecha);
  if (existente) {
    res.status(409).json({
      success: false,
      yaAbierta: true,
      apertura: mapearApertura(existente),
      message: `La caja de ${usuario} en ${sucursal} ya fue abierta hoy (${fecha}). No se vuelve a contabilizar.`,
      url,
    });
    return;
  }

  let body;
  try {
    body = construirBodyAperturaCaja(
      sucursal, montoNum, fecha,
      await cuentaApertura('CUENTA_CAJA_APERTURA', CUENTA_CAJA_DEFECTO),
      await cuentaApertura('CUENTA_FONDO_APERTURA', CUENTA_FONDO_DEFECTO),
    );
  } catch (dataError: any) {
    res.status(400).json({ success: false, message: dataError.message, url });
    return;
  }

  aperturasEnCurso.add(clave);
  try {
    const apertura = await llamarSapOData(SERVICIO_APERTURA, ENTIDAD_APERTURA, body);

    // SAP ya contabilizó: si falla el registro local, la caja igual queda
    // abierta en SAP. Se avisa con el N° de documento para no volver a abrirla.
    let registro = null;
    let advertencia: string | undefined;
    try {
      const fila = await prisma.aperturaCaja.create({
        data: {
          usuario, sociedad: SOCIEDAD, sucursal, fecha: fechaDb(fecha), monto: montoNum, moneda: MONEDA,
          nro_documento: apertura?.AcDocNo ? String(apertura.AcDocNo) : null,
          ejercicio: apertura?.FiscYear ? String(apertura.FiscYear) : null,
        },
      });
      registro = mapearApertura(fila);
    } catch (dbError: any) {
      console.error('[sap-caja/apertura] SAP OK pero no se pudo registrar en apertura_caja:', dbError.message);
      advertencia = `SAP contabilizó la apertura (documento ${apertura?.AcDocNo ?? '—'}), pero no se pudo registrar en el POS: `
        + `${dbError.message}. No vuelva a abrir la caja hoy; avise a soporte.`;
    }
    res.json({ success: true, data: { apertura }, registro, advertencia, body, url });
  } catch (sapError: any) {
    const errorSap = sapError?.response?.data?.error?.message?.value ?? sapError.message;
    const errordetails = sapError?.response?.data?.error?.innererror?.errordetails;
    res.status(sapError?.response?.status ?? 500).json({
      success: false,
      message: errorSap,
      errordetails,
      detalle: sapError?.response?.data,
      body,
      url,
    });
  } finally {
    aperturasEnCurso.delete(clave);
  }
}));

// ─── Egreso de Caja (ZCOOP_JOURNALENTRY_SRV + tabla egreso_caja, 15-10-2026) ──
// Solicitud de José Castillo (14-10-2026): sin documento ni cliente en el
// formulario, misma API que la apertura, registro en egreso_caja y listado.
// El ASIENTO está pendiente de confirmar con Arquitectura (qué son los
// clientes del ejemplo, signos, cuenta de caja): mientras el parámetro
// EGRESO_SAP_HABILITADO no sea 'S' NO se contabiliza ni se graba nada; solo se
// devuelve el JSON propuesto para revisarlo.

// Respuestas del usuario (15-10-2026): motivo único "EGRESO" por ahora; sin
// ProfitCtr; sin monto máximo; si se usa la variante de cuentas, la caja va con
// la cuenta que funciona en la apertura (1010101050). Clientes y signos del
// ejemplo de José: esperando validación de Arquitectura.
//
// Dos asientos posibles, elegidos con el parámetro EGRESO_ASIENTO:
//  - 'CLIENTES' (por defecto) = ejemplo del correo de José en formato de la
//    guía: to_Receivable cliente 10000001 (−monto) y cliente 10000002 (+monto).
//    Clientes FIJOS del ejemplo — POR CONFIRMAR qué representan.
//  - 'CUENTAS' = variante 2 de la guía con la caja 1010101050 (la guía dice
//    1010401000, que SAP rechaza): gasto 4110000001 al debe, caja al haber.
//
// Prueba directa en SAP DEV (15-10-2026, $1.000): CUENTAS RECHAZADA ("Cuenta de
// mayor 4110000001 no prevista en plan de cuentas CL01"); CLIENTES ACEPTADA
// (doc 1400000085). Queda CLIENTES y EGRESO_SAP_HABILITADO = 'S' hasta que
// Arquitectura confirme clientes y signos.
const EGRESO_MOTIVO = 'EGRESO';
const MAX_DESCRIPCION_EGRESO = 500; // egreso_caja.descripcion varchar(500); solo POS, no va a SAP
const EGRESO_CLIENTE_HABER = '10000001';  // ejemplo de José, −monto
const EGRESO_CLIENTE_DEBE = '10000002';   // ejemplo de José, +monto
const EGRESO_CUENTA_CAJA = '1010101050';  // cuenta que funciona en la apertura
const EGRESO_CUENTA_GASTO = '4110000001'; // guía, variante 2 (por confirmar)

type AsientoEgreso = 'CLIENTES' | 'CUENTAS';

function construirBodyEgresoCaja(sucursal: string, monto: number, fecha: string, asiento: AsientoEgreso) {
  const [anio, mes, dia] = fecha.split('-');
  const fechaOdata = `/Date(${Date.UTC(Number(anio), Number(mes) - 1, Number(dia))})/`;
  const montoTxt = String(Math.round(monto));
  const importes = {
    results: [
      { ItemnoAcc: '0000000001', CurrType: '00', Currency: MONEDA, AmtDoccur: `-${montoTxt}` },
      { ItemnoAcc: '0000000002', CurrType: '00', Currency: MONEDA, AmtDoccur: montoTxt },
    ],
  };
  const lineas = asiento === 'CUENTAS'
    ? {
      // Línea 1 = caja al haber (−), línea 2 = gasto al debe (+)
      to_Items: { results: [
        { ItemnoAcc: '0000000001', GlAccount: EGRESO_CUENTA_CAJA, CompCode: SOCIEDAD, ItemText: 'EGRESO CAJA' },
        { ItemnoAcc: '0000000002', GlAccount: EGRESO_CUENTA_GASTO, CompCode: SOCIEDAD, ItemText: EGRESO_MOTIVO },
      ] },
      to_Receivable: { results: [] },
    }
    : {
      to_Items: { results: [] },
      to_Receivable: { results: [
        { ItemnoAcc: '0000000001', Customer: EGRESO_CLIENTE_HABER, CompCode: SOCIEDAD, ItemText: EGRESO_MOTIVO },
        { ItemnoAcc: '0000000002', Customer: EGRESO_CLIENTE_DEBE, CompCode: SOCIEDAD, ItemText: 'EGRESO CAJA' },
      ] },
    };
  return {
    CompCode: SOCIEDAD,
    DocDate: fechaOdata,
    PstngDate: fechaOdata,
    DocType: 'DW',
    RefDocNo: `EGRESO CAJA ${sucursal}`.slice(0, 16),
    HeaderTxt: EGRESO_MOTIVO,
    FiscYear: anio,
    FisPeriod: mes,
    to_control: { OperationMode: '01' },
    ...lineas,
    to_Currency: importes,
    to_clearing_items: { results: [] },
  };
}

async function leerParametroCaja(clave: string): Promise<string> {
  try {
    const filas = await prisma.$queryRaw<{ valor: string }[]>`SELECT valor FROM pos_parametro_general WHERE clave = ${clave}`;
    return filas[0]?.valor?.trim().toUpperCase() ?? '';
  } catch {
    return '';
  }
}

async function asientoEgreso(): Promise<AsientoEgreso> {
  return (await leerParametroCaja('EGRESO_ASIENTO')) === 'CUENTAS' ? 'CUENTAS' : 'CLIENTES';
}

// 'S' habilita la contabilización real (pos_parametro_general, auto-init en
// pgSetup.ts). Ante error de BD, el criterio conservador: no contabilizar.
async function egresoSapHabilitado(): Promise<boolean> {
  return (await leerParametroCaja('EGRESO_SAP_HABILITADO')) === 'S';
}

function mapearEgreso(e: {
  id: bigint; usuario: string; sociedad: string; sucursal: string; fecha: Date; monto: unknown; moneda: string;
  nro_documento: string | null; ejercicio: string | null; motivo: string; creado_en: Date; descripcion: string | null;
}) {
  return {
    id: String(e.id),
    usuario: e.usuario,
    sociedad: e.sociedad,
    sucursal: e.sucursal,
    fecha: e.fecha.toISOString().slice(0, 10),
    monto: Number(e.monto),
    moneda: e.moneda.trim(),
    nroDocumento: e.nro_documento ?? '',
    ejercicio: e.ejercicio ?? '',
    motivo: e.motivo,
    creadoEn: e.creado_en.toISOString(),
    descripcion: e.descripcion ?? '',
  };
}

const egresosEnCurso = new Set<string>();

/**
 * GET /api/sap-caja/egresos?sucursal=D190&desde=2026-10-15&hasta=2026-10-15
 *
 * Listado de egreso_caja (más recientes primero, máximo 500). Sin fechas:
 * los de hoy (Chile).
 */
router.get('/egresos', asyncHandler(async (req: Request, res: Response) => {
  const sucursal = String(req.query['sucursal'] ?? '').trim();
  const hoy = hoyChile();
  const desde = String(req.query['desde'] ?? '').trim() || hoy;
  const hasta = String(req.query['hasta'] ?? '').trim() || hoy;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    res.status(400).json({ success: false, message: 'Fechas inválidas (formato YYYY-MM-DD)' });
    return;
  }
  const filas = await prisma.egresoCaja.findMany({
    where: { ...(sucursal && { sucursal }), fecha: { gte: fechaDb(desde), lte: fechaDb(hasta) } },
    orderBy: { id: 'desc' },
    take: 500,
  });
  res.json({ success: true, desde, hasta, data: filas.map(mapearEgreso) });
}));

/**
 * POST /api/sap-caja/egreso { usuario, sucursal, monto }
 *
 * Exige la caja abierta hoy. Con EGRESO_SAP_HABILITADO != 'S' devuelve el
 * JSON propuesto sin contabilizar (pendiente: true). Habilitado: contabiliza
 * en SAP y, si SAP acepta, graba en egreso_caja.
 */
router.post('/egreso', asyncHandler(async (req: Request, res: Response) => {
  const { usuario, sucursal, monto, descripcion } = req.body as { usuario?: string; sucursal?: string; monto?: number; descripcion?: string };
  const montoNum = Number(monto);
  if (!usuario || !sucursal || !Number.isInteger(montoNum) || montoNum <= 0) {
    res.status(400).json({ success: false, message: 'usuario, sucursal y monto (CLP entero mayor a 0) son requeridos' });
    return;
  }
  const descripcionTxt = String(descripcion ?? '').trim();
  if (descripcionTxt.length > MAX_DESCRIPCION_EGRESO) {
    res.status(400).json({ success: false, message: `La descripción admite hasta ${MAX_DESCRIPCION_EGRESO} caracteres` });
    return;
  }

  const fecha = hoyChile();
  const url = await construirUrlSap(SERVICIO_APERTURA, ENTIDAD_APERTURA);
  const asiento = await asientoEgreso();
  const body = construirBodyEgresoCaja(sucursal, montoNum, fecha, asiento);

  if (!(await buscarAperturaDelDia(usuario, sucursal, fecha))) {
    res.status(409).json({ success: false, message: `La caja de ${usuario} en ${sucursal} no está abierta hoy: no se puede registrar un egreso.`, body, url });
    return;
  }

  if (!(await egresoSapHabilitado())) {
    res.json({
      success: false,
      pendiente: true,
      message: 'Egreso NO contabilizado ni registrado: el asiento está pendiente de confirmar con Arquitectura. Se muestra el JSON propuesto.',
      asiento,
      body,
      url,
    });
    return;
  }

  const clave = `${usuario.toUpperCase()}|${sucursal}`;
  if (egresosEnCurso.has(clave)) {
    res.status(409).json({ success: false, message: 'Ya hay un egreso en proceso para este cajero. Espere el resultado.', body, url });
    return;
  }

  egresosEnCurso.add(clave);
  try {
    const egreso = await llamarSapOData(SERVICIO_APERTURA, ENTIDAD_APERTURA, body);
    let registro = null;
    let advertencia: string | undefined;
    try {
      const fila = await prisma.egresoCaja.create({
        data: {
          usuario, sociedad: SOCIEDAD, sucursal, fecha: fechaDb(fecha), monto: montoNum, moneda: MONEDA,
          nro_documento: egreso?.AcDocNo ? String(egreso.AcDocNo) : null,
          ejercicio: egreso?.FiscYear ? String(egreso.FiscYear) : null,
          motivo: EGRESO_MOTIVO,
          descripcion: descripcionTxt || null,
        },
      });
      registro = mapearEgreso(fila);
    } catch (dbError: any) {
      console.error('[sap-caja/egreso] SAP OK pero no se pudo registrar en egreso_caja:', dbError.message);
      advertencia = `SAP contabilizó el egreso (documento ${egreso?.AcDocNo ?? '—'}), pero no se pudo registrar en el POS: ${dbError.message}.`;
    }
    res.json({ success: true, asiento, data: { egreso }, registro, advertencia, body, url });
  } catch (sapError: any) {
    res.status(sapError?.response?.status ?? 500).json({
      success: false,
      message: sapError?.response?.data?.error?.message?.value ?? sapError.message,
      errordetails: sapError?.response?.data?.error?.innererror?.errordetails,
      detalle: sapError?.response?.data,
      body,
      url,
    });
  } finally {
    egresosEnCurso.delete(clave);
  }
}));

export default router;
