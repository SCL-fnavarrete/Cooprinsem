import { Router, Request, Response } from 'express';
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
  'CompanyCodeCurrency', 'NetDueDate', 'NetDueArrearsDays', 'PaymentBlockingReason',
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
    const { SAP_BASE_URL, SAP_USER, SAP_PASSWORD } = process.env;
    if (!SAP_BASE_URL || !SAP_USER || !SAP_PASSWORD) {
      throw new Error('Faltan variables de entorno SAP (SAP_BASE_URL, SAP_USER, SAP_PASSWORD)');
    }
    const host = SAP_BASE_URL.replace('/API_MATERIAL_STOCK_SRV', '');
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
      headers: {
        Accept: 'application/json',
        'sap-client': mandante,
        Authorization: `Basic ${Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64')}`,
      },
    });

    const resultados: Record<string, unknown>[] = response.data?.d?.results ?? [];
    const partidas = resultados.slice(0, TOP_PARTIDAS).map(mapearPartida);
    res.json({ success: true, total: partidas.length, truncado: resultados.length > TOP_PARTIDAS, data: partidas });
  } catch (error: any) {
    const detalleSap = error.response?.data?.error?.message?.value ?? error.message;
    console.error('[GET /api/sap-cta-cte/partidas] Error:', error.message);
    res.status(500).json({ success: false, message: 'Error al consultar las partidas abiertas en SAP', detail: detalleSap });
  }
});

export default router;
