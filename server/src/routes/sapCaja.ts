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
 *   - to_Items: Caja principal 1010504000 (DEBE +monto) y Fondo 1010101050
 *     (HABER −monto). La guía indica 1010401000, pero SAP DEV la rechaza ("La
 *     cta. 1010401000 COOP no es contabilizable directamente", 14-10-2026);
 *     con 1010101050 SAP aceptó (pruebas directas: docs 1400000074 sin
 *     ProfitCtr y 1400000075 con ProfitCtr). Pendiente confirmar con Arquitectura.
 *     Sin centro de beneficio: ProfitCtr (PRP1000100 fijo) se quitó el
 *     14-10-2026 a pedido del usuario para probar en la GUI; pendiente
 *     confirmar con SAP si va y de dónde sale (depende del cajero).
 *   - to_Receivable vacío; to_control.OperationMode "01"; to_clearing_items vacío.
 *
 * Reemplaza la versión anterior (cliente/cajero CME código 4 + cuenta
 * 1010101050 provisoria). Cuentas FIJAS a pedido del usuario (2026-10-05) —
 * pendiente: caja del cajero logueado.
 */
const CUENTA_CAJA_PRINCIPAL = '1010504000';
const CUENTA_FONDO = '1010101050';

function construirBodyAperturaCaja(sucursal: string, monto: number, fecha: string) {
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
        { ItemnoAcc: '0000000001', GlAccount: CUENTA_CAJA_PRINCIPAL, CompCode: 'COOP', ItemText: 'APERTURA CAJA' },
        { ItemnoAcc: '0000000002', GlAccount: CUENTA_FONDO, CompCode: 'COOP', ItemText: 'FONDO INICIAL' },
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

async function buscarAperturaDelDia(usuario: string, sucursal: string, fecha: string) {
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
    body = construirBodyAperturaCaja(sucursal, montoNum, fecha);
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
        data: { usuario, sociedad: SOCIEDAD, sucursal, fecha: fechaDb(fecha), monto: montoNum, moneda: MONEDA },
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

export default router;
