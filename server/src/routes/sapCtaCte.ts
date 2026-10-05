import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';

const router = Router();

// Certificados autofirmados del SAP on-premise (mismo criterio que sapStockService).
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Sociedad fija del POS (CLAUDE.md: Sociedad COOP).
const SOCIEDAD = 'COOP';
// Tope de partidas por cliente (SAP respeta $top en este servicio).
const TOP_PARTIDAS = 500;

// Campos de FAR_CUSTOMER_LINE_ITEMS que usa la grilla (la entidad Item tiene
// 226: pedirlos todos hace la respuesta lenta, hasta ~4 s).
const CAMPOS = [
  'AccountingDocument', 'AccountingDocumentItem', 'FiscalYear', 'AccountingDocumentType', 'DocumentDate',
  'ReferenceDocumentTypeName', 'DocumentReferenceID', 'BillingDocument', 'DebitCreditCode',
  'AmountInTransactionCurrency', 'TransactionCurrency', 'AmountInCompanyCodeCurrency',
  'CompanyCodeCurrency', 'NetDueDate', 'NetDueArrearsDays', 'PaymentBlockingReason', 'DocumentItemText',
].join(',');

// Partida abierta tal como la consume el frontend (Caja > Pago Cta. Cte.).
export interface IPartidaCtaCte {
  documento: string;            // AccountingDocument (N° documento contable)
  posicion: string;             // AccountingDocumentItem
  ejercicio: string;            // FiscalYear
  tipoDocumento: string;        // AccountingDocumentType (D1, D6, DW…) — descripción pendiente
  tipoDocumentoNombre: string;  // ReferenceDocumentTypeName (ej. "Factura")
  folio: string;                // DocumentReferenceID (vacío si viene en ceros: QAS sin folio SII)
  documentoFacturacion: string; // BillingDocument (N° factura SD)
  debeHaber: 'S' | 'H';         // S = cargo (debe), H = abono (haber)
  moneda: string;
  monto: number;
  monedaDocumento: string;
  montoDocumento: number;
  fechaDocumento: string;       // YYYY-MM-DD
  fechaVencimiento: string;     // YYYY-MM-DD
  diasMora: number;             // NetDueArrearsDays: > 0 vencida, <= 0 por vencer / vigente
  bloqueoPago: string;          // PaymentBlockingReason ('' = autorizado)
  sucursal: string;             // '' = no informada (la API no la trae)
  pagoPendiente?: string;       // N° del pago POS ya contabilizado (variante 3) — factura pendiente de compensación
}

// Cliente en formato SAP: numérico con ceros a la izquierda hasta 10 dígitos.
function clienteSap(cliente: string): string {
  const limpio = cliente.trim();
  return /^\d+$/.test(limpio) ? limpio.padStart(10, '0') : limpio;
}

// "/Date(1791763200000)/" → "2026-10-12"
function fechaOData(valor: unknown): string {
  const ms = /\/Date\((-?\d+)/.exec(String(valor ?? ''))?.[1];
  return ms ? new Date(Number(ms)).toISOString().slice(0, 10) : '';
}

function mapearPartida(it: Record<string, unknown>): IPartidaCtaCte {
  const folio = String(it.DocumentReferenceID ?? '').trim();
  return {
    documento: String(it.AccountingDocument ?? ''),
    posicion: String(it.AccountingDocumentItem ?? ''),
    ejercicio: String(it.FiscalYear ?? ''),
    tipoDocumento: String(it.AccountingDocumentType ?? ''),
    tipoDocumentoNombre: String(it.ReferenceDocumentTypeName ?? ''),
    folio: /^0*$/.test(folio) ? '' : folio,
    documentoFacturacion: String(it.BillingDocument ?? ''),
    debeHaber: it.DebitCreditCode === 'H' ? 'H' : 'S',
    moneda: String(it.TransactionCurrency ?? ''),
    monto: Math.round(Number(it.AmountInTransactionCurrency) || 0),
    monedaDocumento: String(it.CompanyCodeCurrency ?? ''),
    montoDocumento: Math.round(Number(it.AmountInCompanyCodeCurrency) || 0),
    fechaDocumento: fechaOData(it.DocumentDate),
    fechaVencimiento: fechaOData(it.NetDueDate),
    diasMora: Math.round(Number(it.NetDueArrearsDays) || 0),
    bloqueoPago: String(it.PaymentBlockingReason ?? '').trim(),
    sucursal: '',
  };
}

// Texto de posición que el POS pone en cada línea de cliente del pago
// (to_Receivable.ItemText). Permite reconocer en SAP qué facturas ya se
// cobraron mientras el equipo SAP no las compensa.
const PREFIJO_TEXTO_PAGO = 'PAGO FACT';
const regexTextoPago = new RegExp(`^${PREFIJO_TEXTO_PAGO} (\\d+)`);

function configSap() {
  const { SAP_BASE_URL, SAP_USER, SAP_PASSWORD } = process.env;
  if (!SAP_BASE_URL || !SAP_USER || !SAP_PASSWORD) {
    throw new Error('Faltan variables de entorno SAP (SAP_BASE_URL, SAP_USER, SAP_PASSWORD)');
  }
  return {
    host: SAP_BASE_URL.replace('/API_MATERIAL_STOCK_SRV', ''),
    authorization: `Basic ${Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64')}`,
  };
}

/**
 * Partidas abiertas normales del cliente en SAP. Marca `pagoPendiente` en las
 * facturas que ya tienen un pago del POS (variante 3, sin compensar): la
 * factura sigue abierta hasta que el equipo SAP compense, pero el POS no debe
 * volver a cobrarla.
 */
async function consultarPartidasSap(cliente: string, venceHasta?: string): Promise<{ partidas: IPartidaCtaCte[]; truncado: boolean }> {
  const { host, authorization } = configSap();
  const mandante = await getMandante();

  const filtros = [
    `Customer eq '${clienteSap(cliente)}'`,
    `CompanyCode eq '${SOCIEDAD}'`,
    `IsCleared eq ' '`,
    `SpecialGeneralLedgerCode eq ' '`,
  ];
  if (venceHasta) filtros.push(`NetDueDate le datetime'${venceHasta}T00:00:00'`);

  // $ sin codificar: SAP ignora los parámetros OData si vienen como %24.
  const url = `${host}/FAR_CUSTOMER_LINE_ITEMS/Items?$format=json&sap-client=${mandante}&sap-language=ES`
    + `&$select=${CAMPOS}&$orderby=NetDueDate asc&$top=${TOP_PARTIDAS + 1}`
    + `&$filter=${encodeURIComponent(filtros.join(' and '))}`;

  const response = await axios.get(url, {
    httpsAgent,
    timeout: 60000,
    headers: { Accept: 'application/json', 'sap-client': mandante, Authorization: authorization },
  });

  const resultados: Record<string, unknown>[] = response.data?.d?.results ?? [];

  // Pagos del POS aún abiertos: línea H con texto "PAGO FACT <documento>…".
  const pagosPorFactura = new Map<string, string>();
  for (const it of resultados) {
    const factura = regexTextoPago.exec(String(it.DocumentItemText ?? ''))?.[1];
    if (it.DebitCreditCode === 'H' && factura) pagosPorFactura.set(factura, String(it.AccountingDocument ?? ''));
  }

  const partidas = resultados.slice(0, TOP_PARTIDAS).map((it) => {
    const partida = mapearPartida(it);
    const pago = partida.debeHaber === 'S' ? pagosPorFactura.get(partida.documento) : undefined;
    return pago ? { ...partida, pagoPendiente: pago } : partida;
  });
  return { partidas, truncado: resultados.length > TOP_PARTIDAS };
}

/**
 * GET /api/sap-cta-cte/partidas?cliente=10000003&venceHasta=2026-10-31
 *
 * Partidas Abiertas del cliente para Caja > Pago Cta. Cte. — servicio SAP
 * FAR_CUSTOMER_LINE_ITEMS/Items (guía "FAR_CUSTOMER_LINE_ITEMS For Dummies").
 *
 * Filtros fijos: CompanyCode 'COOP', IsCleared eq ' ' (abiertas) y
 * SpecialGeneralLedgerCode eq ' ' (solo partidas normales: las CME —ej. las
 * aperturas de caja del cajero, código '4'— quedan fuera hasta que se confirme
 * si se muestran aparte). Dinámicos: cliente y "vence hasta" (NetDueDate le).
 */
router.get('/partidas', async (req: Request, res: Response) => {
  const cliente = String(req.query.cliente ?? '').trim();
  const venceHasta = String(req.query.venceHasta ?? '').trim();

  if (!cliente) {
    res.status(400).json({ success: false, message: 'Falta el cliente' });
    return;
  }
  if (venceHasta && !/^\d{4}-\d{2}-\d{2}$/.test(venceHasta)) {
    res.status(400).json({ success: false, message: 'Fecha de vencimiento inválida (formato YYYY-MM-DD)' });
    return;
  }

  try {
    const { partidas, truncado } = await consultarPartidasSap(cliente, venceHasta || undefined);
    res.json({ success: true, total: partidas.length, truncado, data: partidas });
  } catch (error: any) {
    const detalleSap = error.response?.data?.error?.message?.value ?? error.message;
    console.error('[GET /api/sap-cta-cte/partidas] Error:', error.message);
    res.status(500).json({ success: false, message: 'Error al consultar las partidas abiertas en SAP', detail: detalleSap });
  }
});

// ─── Pago Cta. Cte. — ZCOOP_JOURNALENTRY_SRV, variante 3 ─────────────────────
// (guía "ZCOOP_JOURNALENTRY_SRV – Guía de Contabilización" v1.0 + ejemplo de
// José Castillo 05-10-2026). Pago de facturas SIN compensación: SAP crea el
// documento de cobro (clase DW); la compensación la hace el equipo SAP.

const SERVICIO_JE = 'ZCOOP_JOURNALENTRY_SRV';
const ENTIDAD_JE = 'JournalEntryHeaderSet';
// FIJOS a pedido del usuario (2026-10-05) — pendiente: caja del cajero logueado.
const CUENTA_CAJA = '1010504000';
const CENTRO_BENEFICIO = 'PRP1000100';
const LARGO_REFDOCNO = 16;
const LARGO_HEADERTXT = 25;
const LARGO_ITEMTEXT = 50;

interface IPartidaPago { documento: string; posicion: string; ejercicio: string }

function posicionAcc(n: number): string {
  return String(n).padStart(10, '0');
}

// Hoy en Chile (no en UTC: de noche UTC ya es mañana).
function hoyChile(): { anio: string; mes: string; odata: string } {
  const [anio, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()).split('-');
  return { anio, mes, odata: `/Date(${Date.UTC(Number(anio), Number(mes) - 1, Number(dia))})/` };
}

/**
 * Body de la variante 3. Caja al DEBE (+total) y una línea de cliente por
 * factura al HABER (−monto). La suma de to_Currency es 0. Customer en 8
 * dígitos (sin ceros a la izquierda), igual que la apertura que ya contabiliza.
 */
export function construirBodyPago(cliente: string, partidas: IPartidaCtaCte[], refDocNo: string) {
  const fecha = hoyChile();
  const customer = clienteSap(cliente).replace(/^0+(?=\d)/, '');
  const total = partidas.reduce((s, p) => s + p.monto, 0);
  const headerTxt = (partidas.length === 1
    ? `PAGO FACT ${partidas[0].folio || partidas[0].documento}`
    : `PAGO CTA CTE ${partidas.length} DOCS`).slice(0, LARGO_HEADERTXT);

  const receivables = partidas.map((p, i) => ({
    ItemnoAcc: posicionAcc(i + 2),
    Customer: customer,
    CompCode: SOCIEDAD,
    ItemText: `${PREFIJO_TEXTO_PAGO} ${p.documento}${p.folio ? ` FOLIO ${p.folio}` : ''}`.slice(0, LARGO_ITEMTEXT),
  }));

  return {
    CompCode: SOCIEDAD,
    DocDate: fecha.odata,
    PstngDate: fecha.odata,
    DocType: 'DW',
    RefDocNo: refDocNo.slice(0, LARGO_REFDOCNO),
    HeaderTxt: headerTxt,
    FiscYear: fecha.anio,
    FisPeriod: fecha.mes,
    to_control: { OperationMode: '01' },
    to_Items: { results: [
      { ItemnoAcc: posicionAcc(1), GlAccount: CUENTA_CAJA, CompCode: SOCIEDAD, ProfitCtr: CENTRO_BENEFICIO, ItemText: 'RECAUDACION CAJA' },
    ] },
    to_Receivable: { results: receivables },
    to_Currency: { results: [
      { ItemnoAcc: posicionAcc(1), CurrType: '00', Currency: 'CLP', AmtDoccur: String(total) },
      ...partidas.map((p, i) => ({ ItemnoAcc: posicionAcc(i + 2), CurrType: '00', Currency: 'CLP', AmtDoccur: String(-p.monto) })),
    ] },
    to_clearing_items: { results: [] },
  };
}

/**
 * Valida el pedido de pago contra SAP: las partidas deben existir abiertas para
 * el cliente, ser facturas (S), no estar bloqueadas ni ya pagadas por el POS.
 * Los montos se toman de SAP, no de lo que envía el navegador.
 */
async function validarPartidasPago(cliente: string, pedidas: IPartidaPago[]): Promise<{ ok: true; partidas: IPartidaCtaCte[] } | { ok: false; message: string }> {
  if (!cliente) return { ok: false, message: 'Falta el cliente' };
  if (!Array.isArray(pedidas) || pedidas.length === 0) return { ok: false, message: 'Debe seleccionar al menos una factura' };

  const { partidas } = await consultarPartidasSap(cliente);
  const porClave = new Map(partidas.map((p) => [`${p.documento}-${p.posicion}-${p.ejercicio}`, p]));
  const elegidas: IPartidaCtaCte[] = [];
  for (const pedida of pedidas) {
    const clave = `${pedida.documento}-${pedida.posicion}-${pedida.ejercicio}`;
    const p = porClave.get(clave);
    if (!p) return { ok: false, message: `La partida ${pedida.documento} ya no está abierta en SAP para este cliente` };
    if (p.debeHaber !== 'S' || p.monto <= 0) return { ok: false, message: `La partida ${p.documento} no es una factura a pagar` };
    if (p.bloqueoPago) return { ok: false, message: `La partida ${p.documento} tiene bloqueo de pago (${p.bloqueoPago})` };
    if (p.pagoPendiente) return { ok: false, message: `La factura ${p.documento} ya fue pagada (documento ${p.pagoPendiente}), pendiente de compensación` };
    if (elegidas.some((e) => e === p)) return { ok: false, message: `La partida ${p.documento} está repetida` };
    elegidas.push(p);
  }
  return { ok: true, partidas: elegidas };
}

// Reserva atómicamente el próximo correlativo de cobro (mismo patrón que NPEDIDO).
async function reservarFolioCobro(sucursal: string): Promise<string> {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query("SELECT valor FROM pos_parametro_general WHERE clave='NCOBRO' FOR UPDATE");
    if (r.rowCount === 0) throw new Error('Falta el parámetro NCOBRO en pos_parametro_general');
    const actual = Number(r.rows[0].valor);
    if (!Number.isFinite(actual)) throw new Error(`Valor de NCOBRO no es numérico: "${r.rows[0].valor}"`);
    const siguiente = actual + 1;
    await client.query("UPDATE pos_parametro_general SET valor=$1 WHERE clave='NCOBRO'", [String(siguiente)]);
    await client.query('COMMIT');
    return `CAJ-${sucursal.slice(0, 4)}-${String(siguiente).padStart(6, '0')}`;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// POST a ZCOOP_JOURNALENTRY_SRV con token CSRF (mismo patrón que la apertura de caja).
async function contabilizarEnSap(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { host, authorization } = configSap();
  const mandante = await getMandante();
  const cliente = axios.create({
    baseURL: `${host}/${SERVICIO_JE}`,
    httpsAgent,
    timeout: 60000,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'sap-client': mandante, 'sap-language': 'ES', Authorization: authorization },
  });
  const tokenRes = await cliente.get('/$metadata', { headers: { 'X-CSRF-Token': 'Fetch', Accept: '*/*' } });
  const response = await cliente.post(`/${ENTIDAD_JE}`, body, {
    headers: { 'X-CSRF-Token': tokenRes.headers['x-csrf-token'] as string, Cookie: (tokenRes.headers['set-cookie'] ?? []).join('; ') },
  });
  return response.data?.d ?? {};
}

/**
 * Si la llamada a SAP se cortó (sin respuesta), el asiento pudo haberse creado
 * igual. Se busca en SAP un documento del cliente con esa referencia (RefDocNo
 * = DocumentReferenceID) antes de dejar que el cajero reintente.
 */
async function buscarPagoPorReferencia(cliente: string, refDocNo: string): Promise<{ documento: string; ejercicio: string } | null> {
  const { host, authorization } = configSap();
  const mandante = await getMandante();
  const filtro = `Customer eq '${clienteSap(cliente)}' and CompanyCode eq '${SOCIEDAD}' and DocumentReferenceID eq '${refDocNo}'`;
  const url = `${host}/FAR_CUSTOMER_LINE_ITEMS/Items?$format=json&sap-client=${mandante}&$select=AccountingDocument,FiscalYear&$top=1`
    + `&$filter=${encodeURIComponent(filtro)}`;
  const response = await axios.get(url, { httpsAgent, timeout: 60000, headers: { Accept: 'application/json', 'sap-client': mandante, Authorization: authorization } });
  const it = response.data?.d?.results?.[0];
  return it ? { documento: String(it.AccountingDocument), ejercicio: String(it.FiscalYear) } : null;
}

async function urlJournalEntry(): Promise<string> {
  const { host } = configSap();
  return `${host}/${SERVICIO_JE}/${ENTIDAD_JE}?sap-client=${await getMandante()}&sap-language=ES`;
}

/**
 * POST /api/sap-cta-cte/pagos/preview
 *
 * Arma el body del pago SIN contabilizar ni reservar folio — para el modal de
 * confirmación. El RefDocNo definitivo se asigna al confirmar.
 */
router.post('/pagos/preview', async (req: Request, res: Response) => {
  const { cliente, sucursal, partidas } = req.body ?? {};
  try {
    const validacion = await validarPartidasPago(String(cliente ?? '').trim(), partidas);
    if (!validacion.ok) {
      res.status(400).json({ success: false, message: validacion.message });
      return;
    }
    const total = validacion.partidas.reduce((s, p) => s + p.monto, 0);
    const body = construirBodyPago(String(cliente), validacion.partidas, `CAJ-${String(sucursal ?? 'D190').slice(0, 4)}-??????`);
    res.json({ success: true, total, body, url: await urlJournalEntry() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.response?.data?.error?.message?.value ?? error.message });
  }
});

/**
 * POST /api/sap-cta-cte/pagos
 *
 * Contabiliza el pago en SAP (variante 3). Siempre devuelve el body enviado,
 * la URL y la respuesta (o el error) de SAP para mostrarlos en pantalla.
 */
router.post('/pagos', async (req: Request, res: Response) => {
  const { cliente, sucursal, partidas } = req.body ?? {};
  const clienteTxt = String(cliente ?? '').trim();
  let body: Record<string, unknown> | undefined;
  let refDocNo = '';
  let url = '';
  try {
    url = await urlJournalEntry();
    const validacion = await validarPartidasPago(clienteTxt, partidas);
    if (!validacion.ok) {
      res.status(400).json({ success: false, message: validacion.message, url });
      return;
    }
    refDocNo = await reservarFolioCobro(String(sucursal ?? 'D190'));
    body = construirBodyPago(clienteTxt, validacion.partidas, refDocNo);
    console.log('[sap-cta-cte/pagos] body enviado:', JSON.stringify(body));

    const respuesta = await contabilizarEnSap(body);
    console.log('[sap-cta-cte/pagos] respuesta SAP:', JSON.stringify(respuesta));
    res.status(201).json({ success: true, acDocNo: respuesta.AcDocNo ?? '', refDocNo, data: respuesta, body, url });
  } catch (error: any) {
    // Sin respuesta de SAP (red/timeout): verificar si el asiento se alcanzó a crear.
    if (body && refDocNo && !error.response) {
      try {
        const encontrado = await buscarPagoPorReferencia(clienteTxt, refDocNo);
        if (encontrado) {
          res.status(201).json({ success: true, recuperado: true, acDocNo: encontrado.documento, refDocNo, data: encontrado, body, url,
            message: 'La conexión con SAP se cortó, pero el pago sí quedó contabilizado.' });
          return;
        }
      } catch (verificacionError: any) {
        console.error('[sap-cta-cte/pagos] No se pudo verificar el pago tras el corte:', verificacionError.message);
      }
      res.status(504).json({ success: false, incierto: true, refDocNo, body, url,
        message: `No se pudo confirmar con SAP si el pago ${refDocNo} quedó contabilizado. Revise las partidas del cliente antes de reintentar.` });
      return;
    }
    const sapError = error.response?.data?.error;
    res.status(error.response?.status ?? 500).json({
      success: false,
      message: sapError?.message?.value ?? error.message,
      errordetails: sapError?.innererror?.errordetails,
      detalle: error.response?.data,
      refDocNo,
      body,
      url,
    });
  }
});

export default router;
