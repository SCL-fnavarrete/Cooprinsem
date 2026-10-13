// Pago Cta. Cte. con compensación — ZCOOP_PAYMENT_SRV/PaymentHeaderSet
// (guía "ZCOOP_PAYMENT_SRV – Guía de consumo" v1.0, 12-10-2026, solicitud de
// José Castillo). Contabiliza el cobro y compensa las facturas en un solo POST
// (FB05 / EINGZAHL). Funciones puras: sin SAP ni BD, para poder testearlas.

export const SERVICIO_PAGO = 'ZCOOP_PAYMENT_SRV';
export const ENTIDAD_PAGO = 'PaymentHeaderSet';

const SOCIEDAD = 'COOP';
const CLASE_DOC = 'DW';
const MONEDA = 'CLP';
// Claves de contabilización: 40 = caja/banco al debe, 15 = cliente al haber (saldo a favor).
const CLAVE_CAJA = '40';
const CLAVE_SALDO_FAVOR = '15';
const LARGO_REFDOCNO = 16;
const LARGO_TEXTO = 50;

// Factura a compensar: documento contable SAP (BELNR, no el folio SII) + ejercicio.
export interface IFacturaCompensar {
  documento: string;
  ejercicio: string;
  monto: number; // CLP entero, tomado de SAP
}

export interface IOpcionesPagoCompensacion {
  facturas: IFacturaCompensar[];
  refDocNo: string;
  cuentaCaja: string;
  fecha: { anio: string; mes: string; dia: string }; // hoy en Chile
  // Escenario B (saldo a favor): solo para cheques, aún no se usa en pantalla.
  saldoFavor?: { cliente: string; monto: number };
}

// CLP entero → "446.00" (el servicio divide internamente por 100).
export function montoSap(monto: number): string {
  if (!Number.isInteger(monto) || monto < 0) throw new Error(`Monto CLP inválido: ${monto}`);
  return `${monto}.00`;
}

// Cliente en 8 dígitos, sin ceros a la izquierda (igual que el pago y la apertura previos).
export function clienteSinCeros(cliente: string): string {
  return cliente.trim().replace(/^0+(?=\d)/, '');
}

/**
 * Body del POST. PK 40 (Count "1") = suma de facturas (+ saldo a favor si
 * hay); PK 15 (Count "2") solo en el escenario B. Una línea de to_Clearing
 * por factura (escenario A = 1, escenario C = varias).
 */
export function construirBodyPagoCompensacion(op: IOpcionesPagoCompensacion) {
  if (op.facturas.length === 0) throw new Error('Debe haber al menos una factura a compensar');
  const totalFacturas = op.facturas.reduce((s, f) => s + f.monto, 0);
  const saldoFavor = op.saldoFavor && op.saldoFavor.monto > 0 ? op.saldoFavor : undefined;
  const totalCaja = totalFacturas + (saldoFavor?.monto ?? 0);

  const textoCaja = op.facturas.length === 1
    ? `COBRO FACTURA ${op.facturas[0].documento}`
    : `COBRO CTA CTE ${op.facturas.length} FACTURAS`;

  const posiciones = [
    { Count: '1', PostingKey: CLAVE_CAJA, Account: op.cuentaCaja, Amount: montoSap(totalCaja), Text: textoCaja.slice(0, LARGO_TEXTO) },
  ];
  if (saldoFavor) {
    posiciones.push({
      Count: '2', PostingKey: CLAVE_SALDO_FAVOR, Account: clienteSinCeros(saldoFavor.cliente),
      Amount: montoSap(saldoFavor.monto), Text: 'SALDO A FAVOR CLIENTE',
    });
  }

  const { anio, mes, dia } = op.fecha;
  return {
    CompCode: SOCIEDAD,
    DocDate: `${anio}${mes}${dia}`,
    PstngDate: `${anio}${mes}${dia}`,
    DocType: CLASE_DOC,
    RefDocNo: op.refDocNo.slice(0, LARGO_REFDOCNO),
    Currency: MONEDA,
    FiscYear: anio,
    FisPeriod: mes, // "01".."12" (confirmado por José, 13-10-2026)
    to_Positions: { results: posiciones },
    to_Clearing: {
      results: op.facturas.map((f, i) => ({ ItemNo: String(i + 1), AccountingDocument: f.documento, FiscalYear: f.ejercicio })),
    },
  };
}

export type IBodyPagoCompensacion = ReturnType<typeof construirBodyPagoCompensacion>;

/**
 * Regla R1 de la guía: Amount(PK 40) = Σ facturas + Amount(PK 15). Se valida
 * antes de enviar: el servicio no es idempotente y un descuadre crea un error
 * en SAP (F5/263) que conviene atajar acá.
 */
export function validarCuadre(body: IBodyPagoCompensacion, facturas: IFacturaCompensar[]): string | null {
  const monto = (clave: string) => body.to_Positions.results
    .filter((p) => p.PostingKey === clave)
    .reduce((s, p) => s + Number(p.Amount), 0);
  const counts = body.to_Positions.results.map((p) => p.Count);
  if (new Set(counts).size !== counts.length) return 'Posiciones con Count repetido';
  const totalFacturas = facturas.reduce((s, f) => s + f.monto, 0);
  if (monto(CLAVE_CAJA) !== totalFacturas + monto(CLAVE_SALDO_FAVOR)) {
    return `El pago no cuadra: caja ${monto(CLAVE_CAJA)} ≠ facturas ${totalFacturas} + saldo a favor ${monto(CLAVE_SALDO_FAVOR)}`;
  }
  if (body.to_Clearing.results.length !== facturas.length) return 'Cantidad de facturas a compensar distinta a la seleccionada';
  return null;
}

// Errores frecuentes de la guía (sección 7.1) → mensaje para el cajero. El
// mensaje original de SAP se sigue mostrando en el detalle.
const ERRORES_SAP: [RegExp, string][] = [
  [/F5\/093/, 'SAP no encontró la factura abierta para compensar (puede que ya esté pagada). Vuelva a consultar las partidas del cliente.'],
  [/F5\/263/, 'El monto del pago no cuadra con las facturas a compensar.'],
  [/00088/, 'SAP rechazó el formato de un importe.'],
  [/00349/, 'SAP rechazó un dato de la cabecera del pago.'],
];

export function mensajeErrorPago(mensajeSap: string): string {
  const conocido = ERRORES_SAP.find(([re]) => re.test(mensajeSap));
  return conocido ? `${conocido[1]} (SAP: ${mensajeSap})` : mensajeSap;
}
