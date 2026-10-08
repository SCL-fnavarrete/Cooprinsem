// PE-26 (Creación pedido — Caso 2): textos de cabecera del pedido de venta
// (entidad A_SalesOrderText, navegación to_Text de A_SalesOrder, deep insert).
// IDs confirmados por Arquitectura SAP (correo J.F. Ortega, 06-10-2026) y ya
// configurados en el esquema de textos (VOTXN) — no requieren ABAP.
// Disponibles en SAP pero NO enviados aún: Z002 Obs. Factura de Venta,
// Z003 Obs. Crédito y Riesgo, Z009 Obs. Desbloq Margen/Descu y el texto de
// posición 0001 (Texto ventas materia).

// "ES" según el ejemplo de Arquitectura; SAP también podría esperar "S"
// (pendiente confirmar en la primera prueba en QAS).
export const IDIOMA_TEXTOS_SAP = 'ES';

export const TEXTOS_CABECERA_PEDIDO = [
  { id: 'Z001', campo: 'observaciones' },     // Obs. Nota de Venta
  { id: 'Z010', campo: 'ubicacionPredio' },   // Ubicación Predio
  { id: 'Z082', campo: 'patente' },           // Patente (transporte)
  { id: 'Z087', campo: 'nombreConductor' },   // Nombre Conductor (transporte)
  { id: 'Z088', campo: 'rutConductor' },      // Rut Conductor (transporte)
] as const;

export interface ITextoSap {
  Language: string;
  LongTextID: string;
  LongText: string;
}

/**
 * Arma el arreglo to_Text de cabecera con los textos que traen valor. Un texto
 * vacío no se envía (SAP podría devolver la advertencia "texto vacío").
 */
export function construirTextosCabecera(payload: Record<string, unknown> | null | undefined): ITextoSap[] {
  return TEXTOS_CABECERA_PEDIDO
    .map(({ id, campo }) => ({
      Language: IDIOMA_TEXTOS_SAP,
      LongTextID: id,
      LongText: String(payload?.[campo] ?? '').trim(),
    }))
    .filter((texto) => texto.LongText.length > 0);
}

/**
 * Advertencias de un pedido creado con éxito (HTTP 201): SAP las informa en la
 * cabecera HTTP `sap-message`, un JSON con `message` y opcionalmente `details`.
 * Si no es JSON se devuelve el texto tal cual.
 */
export function leerAdvertenciasSap(cabecera: unknown): string[] {
  if (cabecera === undefined || cabecera === null || cabecera === '') return [];
  const texto = String(cabecera);
  try {
    const mensaje = JSON.parse(texto) as { message?: unknown; details?: { message?: unknown }[] };
    const detalles = Array.isArray(mensaje.details) ? mensaje.details : [];
    return [mensaje, ...detalles]
      .map((m) => m?.message)
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
  } catch {
    return [texto];
  }
}
