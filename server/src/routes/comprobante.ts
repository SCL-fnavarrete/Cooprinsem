// Comprobante del pedido según su clase SAP (definición del usuario, 22-10-2026;
// Venta normal pasa a factura el 28-10-2026).
// Reemplaza el select "Boleta / Factura" de Nuevo Pedido. Misma regla en el
// frontend: src/config/comprobante.ts (mantener alineadas).
//   Boleta:      ZV02 Venta Boleta
//   Factura:     ZV01 Venta normal, ZV04 Puesto Fundo, ZV06 Calzada, ZV07 Anticipada, ZV15 Combustible
//   Por definir: el resto (Cotización, Notas de crédito/débito)

export type Comprobante = 'Boleta' | 'Factura' | 'Por definir';

export const CLASES_BOLETA: readonly string[] = ['ZV02'];
export const CLASES_FACTURA: readonly string[] = ['ZV01', 'ZV04', 'ZV06', 'ZV07', 'ZV15'];

// Clases que se facturan automáticamente (pedido → factura → folio, ADR-033).
// Solo Venta normal (28-10-2026). Venta Boleta no se factura; las otras ventas factura
// esperan que SAP confirme el proceso (Combustible, otra API).
export const CLASES_FACTURACION_AUTOMATICA: readonly string[] = ['ZV01'];

export const CLIENTE_BOLETA = '999999';

const normalizar = (clase: unknown) => String(clase ?? '').trim().toUpperCase();

export function comprobanteDeClase(clase: unknown): Comprobante {
  const c = normalizar(clase);
  if (CLASES_BOLETA.includes(c)) return 'Boleta';
  if (CLASES_FACTURA.includes(c)) return 'Factura';
  return 'Por definir';
}

export const esClienteBoleta = (cliente: unknown) => String(cliente ?? '').trim().replace(/^0+/, '') === CLIENTE_BOLETA;

/** Mensaje si el Cliente Boleta (999999) no corresponde a la clase; null si está bien. */
export function motivoClienteBoleta(cliente: unknown, clase: unknown): string | null {
  if (!esClienteBoleta(cliente) || comprobanteDeClase(clase) === 'Boleta') return null;
  return `El Cliente Boleta (${CLIENTE_BOLETA}) solo se usa en ventas boleta (Venta Boleta). Tipo documento recibido: ${normalizar(clase) || '—'}.`;
}

/** Motivo por el que una clase no se factura automáticamente; null si corresponde facturar. */
export function motivoNoFacturar(clase: unknown): string | null {
  const c = normalizar(clase);
  if (CLASES_FACTURACION_AUTOMATICA.includes(c)) return null;
  const comprobante = comprobanteDeClase(c);
  if (comprobante === 'Boleta') return `${c} es una venta boleta: no se factura.`;
  if (comprobante === 'Factura') return `${c} es una venta factura: la facturación automática está pendiente de que SAP confirme el proceso.`;
  return `${c || 'El tipo de documento'} no es una venta: no se factura.`;
}
