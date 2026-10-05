import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';

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
 *   - to_Items: Caja principal 1010504000 (DEBE +monto) y Fondo 1010401000
 *     (HABER −monto), centro de beneficio PRP1000100.
 *   - to_Receivable vacío; to_control.OperationMode "01"; to_clearing_items vacío.
 *
 * Reemplaza la versión anterior (cliente/cajero CME código 4 + cuenta
 * 1010101050 provisoria). Cuentas y centro de beneficio FIJOS a pedido del
 * usuario (2026-10-05) — pendiente: caja del cajero logueado.
 */
const CUENTA_CAJA_PRINCIPAL = '1010504000';
const CUENTA_FONDO = '1010401000';
const CENTRO_BENEFICIO = 'PRP1000100';

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
        { ItemnoAcc: '0000000001', GlAccount: CUENTA_CAJA_PRINCIPAL, CompCode: 'COOP', ProfitCtr: CENTRO_BENEFICIO, ItemText: 'APERTURA CAJA' },
        { ItemnoAcc: '0000000002', GlAccount: CUENTA_FONDO, CompCode: 'COOP', ProfitCtr: CENTRO_BENEFICIO, ItemText: 'FONDO INICIAL' },
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

/**
 * POST /api/sap-caja/apertura
 *
 * Contabiliza el asiento de Apertura de Caja (clase DW) vía el Z-service
 * ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet — ver
 * ACTUALIZADO_092026_APERTURA_CAJA_ZCOOP_JOURNALENTRY_SRV_Guia_Consumo.pdf.
 */
router.post('/apertura', asyncHandler(async (req: Request, res: Response) => {
  const { sucursal, monto, fecha } = req.body as { sucursal?: string; monto?: number; fecha?: string };

  if (!sucursal || !monto || !fecha) {
    res.status(400).json({ success: false, message: 'sucursal, monto y fecha son requeridos' });
    return;
  }

  const url = await construirUrlSap(SERVICIO_APERTURA, ENTIDAD_APERTURA);

  let body;
  try {
    body = construirBodyAperturaCaja(sucursal, Number(monto), fecha);
  } catch (dataError: any) {
    res.status(400).json({ success: false, message: dataError.message, url });
    return;
  }

  try {
    const apertura = await llamarSapOData(SERVICIO_APERTURA, ENTIDAD_APERTURA, body);
    res.json({ success: true, data: { apertura }, body, url });
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
  }
}));

export default router;
