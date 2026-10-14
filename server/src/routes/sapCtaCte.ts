import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import {
  SERVICIO_PAGO, ENTIDAD_PAGO, construirBodyPagoCompensacion, validarCuadre, mensajeErrorPago,
  type IBodyPagoCompensacion,
} from './sapPagoCompensacion';

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
  'DocumentReferenceID', 'BillingDocument', 'DebitCreditCode',
  'AmountInTransactionCurrency', 'TransactionCurrency', 'AmountInCompanyCodeCurrency',
  'CompanyCodeCurrency', 'NetDueDate', 'NetDueArrearsDays', 'PaymentBlockingReason', 'DocumentItemText',
].join(',');

// Partida abierta tal como la consume el frontend (Caja > Pago Cta. Cte.).
export interface IPartidaCtaCte {
  documento: string;            // AccountingDocument (N° documento contable)
  posicion: string;             // AccountingDocumentItem
  ejercicio: string;            // FiscalYear
  tipoDocumento: string;        // AccountingDocumentType (D1, D6, DW…)
  tipoDocumentoNombre: string;  // Descripción de tipo_documento (ej. "Boleta Electronica"); '' si el código no está
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
  enCuotas?: boolean;           // El documento tiene más de una partida abierta: no se puede pagar (pendiente)
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
    tipoDocumentoNombre: '',  // Se completa con tipo_documento en GET /partidas
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

// Texto de posición que el POS ponía en cada línea de cliente de los pagos de
// la variante 3 (ZCOOP_JOURNALENTRY_SRV, sin compensación, hasta 13-10-2026).
// Permite reconocer en SAP las facturas ya cobradas que siguen sin compensar.
// Los pagos nuevos (ZCOOP_PAYMENT_SRV) compensan la factura y no lo necesitan.
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

  // Documentos con más de una partida abierta (cuotas): ZCOOP_PAYMENT_SRV
  // compensa por documento, no por posición, así que no se pueden pagar por
  // separado. Pendiente con José (13-10-2026): por ahora quedan bloqueados.
  const partidasPorDocumento = new Map<string, number>();
  for (const it of resultados) {
    const clave = `${it.AccountingDocument}-${it.FiscalYear}`;
    partidasPorDocumento.set(clave, (partidasPorDocumento.get(clave) ?? 0) + 1);
  }

  const partidas = resultados.slice(0, TOP_PARTIDAS).map((it) => {
    const partida: IPartidaCtaCte = mapearPartida(it);
    const pago = partida.debeHaber === 'S' ? pagosPorFactura.get(partida.documento) : undefined;
    if (pago) partida.pagoPendiente = pago;
    if ((partidasPorDocumento.get(`${partida.documento}-${partida.ejercicio}`) ?? 0) > 1) partida.enCuotas = true;
    return partida;
  });
  return { partidas, truncado: resultados.length > TOP_PARTIDAS };
}

/**
 * Descripción de cada clase de documento (tabla tipo_documento, editable en
 * Administración > Maestros POS). Reemplaza el nombre genérico que trae SAP
 * (ReferenceDocumentTypeName: D1 y D6 llegan ambos como "Factura"). Ante un
 * error de BD se devuelve vacío: la grilla muestra el código.
 */
async function descripcionesTipoDocumento(): Promise<Map<string, string>> {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  try {
    const r = await pool.query('SELECT blart, ltext FROM tipo_documento');
    return new Map(r.rows.map((f: { blart: string; ltext: string }) => [f.blart.trim(), f.ltext.trim()]));
  } catch (error: any) {
    console.error('[sapCtaCte] No se pudo leer tipo_documento:', error.message);
    return new Map();
  } finally {
    await pool.end();
  }
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
    const [{ partidas, truncado }, pagoMultiple, descripciones] = await Promise.all([
      consultarPartidasSap(cliente, venceHasta || undefined),
      permitePagoMultiple(),
      descripcionesTipoDocumento(),
    ]);
    for (const p of partidas) p.tipoDocumentoNombre = descripciones.get(p.tipoDocumento) ?? '';
    res.json({ success: true, total: partidas.length, truncado, pagoMultiple, data: partidas });
  } catch (error: any) {
    const detalleSap = error.response?.data?.error?.message?.value ?? error.message;
    console.error('[GET /api/sap-cta-cte/partidas] Error:', error.message);
    res.status(500).json({ success: false, message: 'Error al consultar las partidas abiertas en SAP', detail: detalleSap });
  }
});

// ─── Pago Cta. Cte. — ZCOOP_PAYMENT_SRV (pago + compensación) ────────────────
// Reemplaza a ZCOOP_JOURNALENTRY_SRV variante 3 (13-10-2026). Escenarios A (1
// factura) y C (varias), solo efectivo: por defecto el excedente es vuelto y no
// se contabiliza (la caja, PK 40, es la suma de las facturas). Escenario B
// (saldo a favor, PK 15): solo si el cajero marca "dejar el excedente como
// saldo a favor" (habilitado para pruebas el 14-10-2026; según José aplica a
// cheques): la caja va por el monto recibido y la diferencia queda a favor.

// Parámetros en pos_parametro_general (auto-init en pgSetup.ts):
// - CUENTA_CAJA_PAGO: cuenta de caja (PK 40). Depende del cajero según José
//   (13-10-2026); mientras SAP no informe de dónde sale, va este valor único.
// - PAGO_MULTIPLE: 'S' permite pagar varias facturas en un cobro (escenario C).
//   Arranca en 'N' hasta validar en DEV el pago de una factura.
const CUENTA_CAJA_DEFECTO = '1010504000';

interface IPartidaPago { documento: string; posicion: string; ejercicio: string }

async function leerParametro(clave: string): Promise<string | null> {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  try {
    const r = await pool.query('SELECT valor FROM pos_parametro_general WHERE clave=$1', [clave]);
    return r.rows[0]?.valor?.trim() || null;
  } finally {
    await pool.end();
  }
}

async function permitePagoMultiple(): Promise<boolean> {
  try {
    return (await leerParametro('PAGO_MULTIPLE'))?.toUpperCase() === 'S';
  } catch {
    return false; // ante error de BD, el criterio conservador: una factura por cobro
  }
}

async function cuentaCajaPago(): Promise<string> {
  return (await leerParametro('CUENTA_CAJA_PAGO')) ?? CUENTA_CAJA_DEFECTO;
}

// Hoy en Chile (no en UTC: de noche UTC ya es mañana).
function hoyChile(): { anio: string; mes: string; dia: string } {
  const [anio, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()).split('-');
  return { anio, mes, dia };
}

/**
 * Valida el pedido de pago contra SAP: las partidas deben existir abiertas para
 * el cliente, ser facturas (S), no estar bloqueadas, ni ya pagadas por el POS
 * (variante 3), ni en cuotas. Los montos se toman de SAP, no del navegador.
 */
async function validarPartidasPago(cliente: string, pedidas: IPartidaPago[]): Promise<{ ok: true; partidas: IPartidaCtaCte[] } | { ok: false; message: string }> {
  if (!cliente) return { ok: false, message: 'Falta el cliente' };
  if (!Array.isArray(pedidas) || pedidas.length === 0) return { ok: false, message: 'Debe seleccionar al menos una factura' };
  if (pedidas.length > 1 && !(await permitePagoMultiple())) {
    return { ok: false, message: 'Por ahora se paga una factura por cobro (el pago de varias facturas está en validación)' };
  }

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
    if (p.enCuotas) return { ok: false, message: `El documento ${p.documento} está en cuotas: su pago está pendiente de definir` };
    if (elegidas.some((e) => e === p)) return { ok: false, message: `La partida ${p.documento} está repetida` };
    elegidas.push(p);
  }
  return { ok: true, partidas: elegidas };
}

/**
 * Escenario B: saldo a favor = monto recibido − total de facturas. Solo si el
 * cajero lo pidió; el monto recibido debe ser un entero mayor al total.
 */
function calcularSaldoFavor(total: number, montoRecibido: unknown, pedirSaldoFavor: unknown): { ok: true; saldo: number } | { ok: false; message: string } {
  if (pedirSaldoFavor !== true) return { ok: true, saldo: 0 };
  const recibido = Number(montoRecibido);
  if (!Number.isInteger(recibido) || recibido <= total) {
    return { ok: false, message: 'Para dejar saldo a favor, el monto recibido debe ser mayor al total de las facturas' };
  }
  return { ok: true, saldo: recibido - total };
}

async function armarPago(partidas: IPartidaCtaCte[], refDocNo: string, cliente: string, saldoFavor = 0): Promise<IBodyPagoCompensacion> {
  const facturas = partidas.map((p) => ({ documento: p.documento, ejercicio: p.ejercicio, monto: p.monto }));
  const body = construirBodyPagoCompensacion({
    facturas, refDocNo, cuentaCaja: await cuentaCajaPago(), fecha: hoyChile(),
    saldoFavor: saldoFavor > 0 ? { cliente, monto: saldoFavor } : undefined,
  });
  const descuadre = validarCuadre(body, facturas);
  if (descuadre) throw new Error(descuadre);
  return body;
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

// POST a ZCOOP_PAYMENT_SRV con token CSRF. El servicio NO es idempotente: nunca
// se reintenta automáticamente.
async function contabilizarEnSap(body: IBodyPagoCompensacion): Promise<Record<string, unknown>> {
  const { host, authorization } = configSap();
  const mandante = await getMandante();
  const cliente = axios.create({
    baseURL: `${host}/${SERVICIO_PAGO}`,
    httpsAgent,
    timeout: 60000,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'sap-client': mandante, 'sap-language': 'ES', Authorization: authorization },
  });
  const tokenRes = await cliente.get('/$metadata', { headers: { 'X-CSRF-Token': 'Fetch', Accept: '*/*' } });
  const response = await cliente.post(`/${ENTIDAD_PAGO}`, body, {
    headers: { 'X-CSRF-Token': tokenRes.headers['x-csrf-token'] as string, Cookie: (tokenRes.headers['set-cookie'] ?? []).join('; ') },
  });
  return response.data?.d ?? {};
}

/**
 * Si la llamada a SAP se cortó (sin respuesta), el pago pudo haberse creado
 * igual. Se busca en SAP un documento del cliente con esa referencia (RefDocNo
 * = DocumentReferenceID) antes de dejar que el cajero reintente. Sin filtro
 * IsCleared: con compensación, la línea del cliente del pago queda compensada.
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

async function urlPago(): Promise<string> {
  const { host } = configSap();
  return `${host}/${SERVICIO_PAGO}/${ENTIDAD_PAGO}?sap-client=${await getMandante()}&sap-language=ES`;
}

/**
 * POST /api/sap-cta-cte/pagos/preview
 *
 * Arma el body del pago SIN contabilizar ni reservar folio — para el modal de
 * confirmación. El RefDocNo definitivo se asigna al confirmar.
 */
router.post('/pagos/preview', async (req: Request, res: Response) => {
  const { cliente, sucursal, partidas, montoRecibido, saldoFavor: pedirSaldoFavor } = req.body ?? {};
  try {
    const clienteTxt = String(cliente ?? '').trim();
    const validacion = await validarPartidasPago(clienteTxt, partidas);
    if (!validacion.ok) {
      res.status(400).json({ success: false, message: validacion.message });
      return;
    }
    const total = validacion.partidas.reduce((s, p) => s + p.monto, 0);
    const saldo = calcularSaldoFavor(total, montoRecibido, pedirSaldoFavor);
    if (!saldo.ok) {
      res.status(400).json({ success: false, message: saldo.message });
      return;
    }
    const body = await armarPago(validacion.partidas, `CAJ-${String(sucursal ?? 'D190').slice(0, 4)}-??????`, clienteTxt, saldo.saldo);
    res.json({ success: true, total, saldoFavor: saldo.saldo, body, url: await urlPago() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.response?.data?.error?.message?.value ?? error.message });
  }
});

/**
 * POST /api/sap-cta-cte/pagos
 *
 * Contabiliza el pago y compensa las facturas en SAP. Siempre devuelve el body
 * enviado, la URL y la respuesta (o el error) de SAP para mostrarlos en pantalla.
 */
router.post('/pagos', async (req: Request, res: Response) => {
  const { cliente, sucursal, partidas, montoRecibido, saldoFavor: pedirSaldoFavor } = req.body ?? {};
  const clienteTxt = String(cliente ?? '').trim();
  let body: IBodyPagoCompensacion | undefined;
  let saldoFavor = 0;
  let refDocNo = '';
  let url = '';
  try {
    url = await urlPago();
    const validacion = await validarPartidasPago(clienteTxt, partidas);
    if (!validacion.ok) {
      res.status(400).json({ success: false, message: validacion.message, url });
      return;
    }
    const saldo = calcularSaldoFavor(validacion.partidas.reduce((s, p) => s + p.monto, 0), montoRecibido, pedirSaldoFavor);
    if (!saldo.ok) {
      res.status(400).json({ success: false, message: saldo.message, url });
      return;
    }
    saldoFavor = saldo.saldo;
    // El cuadre se valida antes de reservar el folio: un descuadre no consume NCOBRO.
    await armarPago(validacion.partidas, 'CAJ-VALIDACION', clienteTxt, saldoFavor);
    refDocNo = await reservarFolioCobro(String(sucursal ?? 'D190'));
    body = await armarPago(validacion.partidas, refDocNo, clienteTxt, saldoFavor);
    console.log('[sap-cta-cte/pagos] body enviado:', JSON.stringify(body));

    const respuesta = await contabilizarEnSap(body);
    console.log('[sap-cta-cte/pagos] respuesta SAP:', JSON.stringify(respuesta));
    res.status(201).json({ success: true, acDocNo: respuesta.AcDocNo ?? '', refDocNo, saldoFavor, data: respuesta, body, url });
  } catch (error: any) {
    // Sin respuesta de SAP (red/timeout): verificar si el pago se alcanzó a crear.
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
      message: mensajeErrorPago(sapError?.message?.value ?? error.message),
      errordetails: sapError?.innererror?.errordetails,
      detalle: error.response?.data,
      refDocNo,
      body,
      url,
    });
  }
});

export default router;

