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

// ─── Pago residual (menor valor) ────────────────────────────────────────────
// Documentación de Javier Díaz (correo de José, 19-10-2026, caso "Pago
// Residual"): el cliente paga MENOS que el saldo de UNA factura. SAP contabiliza
// lo cobrado, compensa la factura y deja una partida residual por la diferencia.
// Respuestas de José (19-10-2026):
//   - La cuenta de la clave 09 es el cliente CME del cajero logueado
//     (Usuarios_pos.Kunnr), no un valor fijo.
//   - Assignment "EF-0000" fijo por ahora.
//   - La partida pendiente conserva el vencimiento original de la factura.
//   - Solo 1 factura por pago residual.
// Formato igual al ejemplo probado: listas como arreglo directo, Count/ItemNo
// "001" y SglInd/DueDate/Assignment en todas las posiciones (sin ellos el
// batch-input de SAP falla con screen_not_found).
const CLAVE_RESIDUAL_CAJA = '09';     // cliente CME del cajero, operación especial (SglInd)
const CLAVE_RESIDUAL_CLIENTE = '04';  // cliente de la factura, por el saldo de la factura
const SGLIND_RESIDUAL = '2';
const ASIGNACION_RESIDUAL = 'EF-0000';

export interface IOpcionesPagoResidual {
  factura: IFacturaCompensar & { vencimiento: string };  // vencimiento YYYY-MM-DD (NetDueDate de SAP)
  cliente: string;          // cliente de la factura (clave 04)
  clienteCmeCajero: string; // Usuarios_pos.Kunnr del cajero logueado (clave 09)
  montoCobrado: number;     // CLP entero, menor al saldo de la factura
  refDocNo: string;
  fecha: { anio: string; mes: string; dia: string }; // hoy en Chile
}

/** "2026-10-12" → "20261012" */
function fechaSapPago(fecha: string): string {
  const limpia = String(fecha ?? '').replace(/-/g, '');
  if (!/^\d{8}$/.test(limpia)) throw new Error(`Fecha inválida para SAP: "${fecha}"`);
  return limpia;
}

/** Valida los datos del pago residual antes de armar el body. null = OK. */
export function validarPagoResidual(op: Pick<IOpcionesPagoResidual, 'factura' | 'montoCobrado' | 'clienteCmeCajero'>): string | null {
  if (!op.clienteCmeCajero.trim()) return 'El cajero no tiene cliente CME (Usuarios_pos.Kunnr): no se puede registrar un pago parcial';
  if (!Number.isInteger(op.montoCobrado) || op.montoCobrado <= 0) return 'El monto cobrado debe ser un entero mayor a 0';
  if (op.montoCobrado >= op.factura.monto) {
    return `Un pago parcial debe ser menor al saldo de la factura (${op.factura.monto}); con ${op.montoCobrado} corresponde un pago total`;
  }
  return null;
}

/**
 * Body del POST (caso "Pago Residual"): clave 09 al cliente CME del cajero por
 * el monto cobrado (SglInd 2, fecha de hoy, Assignment EF-0000) y clave 04 al
 * cliente por el saldo PENDIENTE (saldo de la factura − cobrado) con el
 * vencimiento original. SAP NO calcula la diferencia: al compensar cancela la
 * factura completa y las claves 09 + 04 deben sumar exactamente su saldo; si
 * no, rechaza con F5/263 "La diferencia es demasiado grande para una
 * compensación" (ejemplo de Javier, 20-10-2026: 3.000 + 3.490 = 6.490).
 */
export function construirBodyPagoResidual(op: IOpcionesPagoResidual) {
  const error = validarPagoResidual(op);
  if (error) throw new Error(error);
  const { anio, mes, dia } = op.fecha;
  const hoy = `${anio}${mes}${dia}`;
  const saldoPendiente = op.factura.monto - op.montoCobrado;
  const body = {
    CompCode: SOCIEDAD,
    DocDate: hoy,
    PstngDate: hoy,
    DocType: CLASE_DOC,
    RefDocNo: op.refDocNo.slice(0, LARGO_REFDOCNO),
    Currency: MONEDA,
    FiscYear: anio,
    FisPeriod: mes,
    to_Positions: [
      {
        Count: '001', PostingKey: CLAVE_RESIDUAL_CAJA, Account: clienteSinCeros(op.clienteCmeCajero),
        Amount: montoSap(op.montoCobrado), Text: `PAGO PARCIAL ${op.factura.documento}`.slice(0, LARGO_TEXTO),
        SglInd: SGLIND_RESIDUAL, DueDate: hoy, Assignment: ASIGNACION_RESIDUAL,
      },
      {
        Count: '002', PostingKey: CLAVE_RESIDUAL_CLIENTE, Account: clienteSinCeros(op.cliente),
        Amount: montoSap(saldoPendiente), Text: `SALDO ${op.factura.documento}`.slice(0, LARGO_TEXTO),
        SglInd: '', DueDate: fechaSapPago(op.factura.vencimiento), Assignment: '',
      },
    ],
    to_Clearing: [
      { ItemNo: '001', AccountingDocument: op.factura.documento, FiscalYear: op.factura.ejercicio },
    ],
  };
  const descuadre = validarCuadreResidual(body, op.factura.monto);
  if (descuadre) throw new Error(descuadre);
  return body;
}

/**
 * Antes del POST: clave 09 (cobrado) + clave 04 (pendiente) = saldo de la
 * factura. null = cuadra. Evita gastar folio NCOBRO en un pago que SAP rechazará.
 */
export function validarCuadreResidual(
  body: { to_Positions: Array<{ PostingKey: string; Amount: string }> }, saldoFactura: number,
): string | null {
  const suma = body.to_Positions
    .filter((p) => p.PostingKey === CLAVE_RESIDUAL_CAJA || p.PostingKey === CLAVE_RESIDUAL_CLIENTE)
    .reduce((acc, p) => acc + Math.round(Number(p.Amount)), 0);
  if (suma !== saldoFactura) {
    return `El pago parcial no cuadra: cobrado + pendiente = ${suma}, saldo de la factura = ${saldoFactura}`;
  }
  return null;
}

export type IBodyPagoResidual = ReturnType<typeof construirBodyPagoResidual>;

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
