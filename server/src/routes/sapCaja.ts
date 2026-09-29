import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

async function getPool() {
  const { Pool } = await import('pg');
  return new Pool({ connectionString: process.env['DATABASE_URL'] });
}

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
 * Resuelve el BusinessPartner del cliente/cajero responsable de la sucursal
 * (línea to_Receivable) desde `Sap_cliente` (poblada por el equipo de
 * arquitectura/interfaces SAP en cooprinsem_poc).
 *
 * Heurística (25-09-2026): tomamos el cliente con grupo `ZD01` y código más
 * bajo entre los que tienen `CliSucursal` igual a la sucursal pedida. Para
 * D190 esto da `10000001` (Mariela Oyorzun), que coincide exactamente con el
 * valor usado en el ejemplo real del manual ACTUALIZADO_092026 — fuerte
 * indicio de que es correcto, pero la regla ("código más bajo = cajero") NO
 * está confirmada funcionalmente para el resto de las sucursales. Si en el
 * futuro aparece una tabla o columna que identifique explícitamente al
 * cajero/responsable de caja, reemplazar esta heurística por esa fuente.
 */
async function resolverCustomerPorSucursal(sucursal: string): Promise<string> {
  const pool = await getPool();
  try {
    const r = await pool.query(
      `SELECT "Customer" FROM "Sap_cliente"
       WHERE "CliSucursal" = $1 AND "CustomerAccountGroup" = 'ZD01'
       ORDER BY "Customer" ASC LIMIT 1`,
      [sucursal]
    );
    if (r.rowCount === 0) {
      throw new Error(
        `No se encontró un cliente (grupo ZD01) con CliSucursal='${sucursal}' en Sap_cliente. ` +
        `Apertura de Caja requiere este dato para armar la línea to_Receivable.`
      );
    }
    return r.rows[0].Customer as string;
  } finally {
    await pool.end();
  }
}

/**
 * Resuelve el Centro de Beneficio (ProfitCenter, línea to_Items) desde
 * `Sap_centrobeneficio`. Se dedujo un patrón de nomenclatura verificado
 * contra las 30 plantas de `Sap_centro`: `CCV` + parte numérica de 3 dígitos
 * del Plant + `0100` (ej. D190 → CCV1900100). Coincide en 21 de 30 plantas
 * (25-09-2026) — las que no calzan probablemente no tienen centro de
 * beneficio comercial propio (ej. D080, D280). Si la sucursal no calza con
 * el patrón, lanzamos error explícito en vez de adivinar.
 */
async function resolverProfitCenterPorSucursal(sucursal: string): Promise<string> {
  const numero = sucursal.replace(/\D/g, '').padStart(3, '0');
  const candidato = `CCV${numero}0100`;
  const pool = await getPool();
  try {
    const r = await pool.query(
      `SELECT "ProfitCenter" FROM "Sap_centrobeneficio" WHERE "ProfitCenter" = $1`,
      [candidato]
    );
    if (r.rowCount === 0) {
      throw new Error(
        `No se encontró el centro de beneficio candidato '${candidato}' (derivado de la sucursal ` +
        `'${sucursal}') en Sap_centrobeneficio. Apertura de Caja requiere este dato para la línea to_Items.`
      );
    }
    return candidato;
  } finally {
    await pool.end();
  }
}

/**
 * Arma el body de ZCOOP_JOURNALENTRY_SRV / JournalEntryHeaderSet para la
 * Apertura de Caja — deep insert con 3 colecciones (ver
 * ACTUALIZADO_092026_APERTURA_CAJA_ZCOOP_JOURNALENTRY_SRV_Guia_Consumo.pdf):
 *   - to_Items: línea de la cuenta contable Caja-Disponible (monto positivo)
 *   - to_Receivable: línea del cliente/cajero responsable (monto negativo)
 *   - to_Currency: montos de cada línea, enlazados por ItemnoAcc (deben ir
 *     como STRING, ej. "300000.0000" — no como número)
 *
 * Reemplaza el intento anterior contra API_JOURNALENTRY_POST / A_JournalEntryPost
 * (servicio genérico no activado en el Gateway, error /IWFND/MED/170) — este es
 * el Z-service construido específicamente para Cooprinsem.
 *
 * ⚠️ CAMPOS AÚN HARDCODEADOS (TEMPORAL, 28-09-2026) — pendientes de regularizar:
 *   - `GlAccount`: cuenta contable "Caja-Disponible". No hay catálogo de
 *     cuentas sincronizado. Usamos el valor del ejemplo real del manual
 *     ('1010101050'), igual al que ya veníamos probando contra el servicio
 *     anterior.
 *   - `SpGlInd`: indicador de mayor especial. Tomado tal cual del ejemplo del
 *     manual ('4') — es un valor técnico fijo de configuración SAP, no
 *     depende de la sucursal, pero no está confirmado con el funcional.
 * `Customer` y `ProfitCtr` YA NO son hardcode — se resuelven dinámicamente
 * por sucursal (ver resolverCustomerPorSucursal / resolverProfitCenterPorSucursal).
 */
async function construirBodyAperturaCaja(sucursal: string, monto: number, fecha: string) {
  const fechaOdata = `/Date(${new Date(`${fecha}T00:00:00Z`).getTime()})/`;
  const montoFormateado = monto.toFixed(4);
  const [anio, mes] = fecha.split('-');

  const [customer, profitCenter] = await Promise.all([
    resolverCustomerPorSucursal(sucursal),
    resolverProfitCenterPorSucursal(sucursal),
  ]);

  // TEMPORAL — ver comentario de la función.
  const GLACCOUNT_TEMPORAL = '1010101050';
  const SPGLIND_TEMPORAL = '4';

  return {
    CompCode: 'COOP', // confirmado real vía monto_apertura.sociedad
    DocDate: fechaOdata,
    PstngDate: fechaOdata,
    DocType: 'DW',
    RefDocNo: `A.CAJA ${sucursal}`,
    HeaderTxt: `Apertura Caja ${sucursal}`,
    FiscYear: anio,
    FisPeriod: mes,
    to_Items: {
      results: [
        {
          ItemnoAcc: '0000000002',
          GlAccount: GLACCOUNT_TEMPORAL, // TEMPORAL — ver nota arriba
          CompCode: 'COOP',
          ItemText: 'APERTURA CAJA',
          ProfitCtr: profitCenter, // resuelto por sucursal
        },
      ],
    },
    to_Receivable: {
      results: [
        {
          ItemnoAcc: '0000000001',
          Customer: customer, // resuelto por sucursal
          CompCode: 'COOP',
          ItemText: 'APERTURA CAJA',
          SpGlInd: SPGLIND_TEMPORAL, // TEMPORAL — ver nota arriba
        },
      ],
    },
    to_Currency: {
      results: [
        { ItemnoAcc: '0000000002', CurrType: '00', Currency: 'CLP', AmtDoccur: montoFormateado },
        { ItemnoAcc: '0000000001', CurrType: '00', Currency: 'CLP', AmtDoccur: `-${montoFormateado}` },
      ],
    },
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
    body = await construirBodyAperturaCaja(sucursal, Number(monto), fecha);
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
