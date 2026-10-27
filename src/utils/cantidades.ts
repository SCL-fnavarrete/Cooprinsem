// Cantidad de la línea del pedido y precio unitario (27-10-2026).
// La cantidad admite hasta 2 decimales con coma ("1,5"); se envía a SAP con punto.
// SAP decide la unidad según el artículo y rechaza los decimales si la unidad no
// los admite. Los montos (subtotal, totales) siguen siendo CLP enteros de SAP.

export const MAX_DECIMALES_CANTIDAD = 2

/**
 * Limpia lo que se escribe en Cantidad: solo dígitos y una coma, con hasta 2
 * decimales. El punto también es separador decimal ("0.5" → "0,5"). Conserva una
 * coma final ("1,") para poder seguir escribiendo.
 */
export function limpiarTextoCantidad(texto: string): string {
  const [entero = '', ...resto] = texto.replace(/\./g, ',').replace(/[^\d,]/g, '').split(',')
  if (resto.length === 0) return entero
  return `${entero},${resto.join('').slice(0, MAX_DECIMALES_CANTIDAD)}`
}

/** Número de la cantidad escrita ("1,5" → 1.5). Vacío o inválido → 0. */
export function cantidadDesdeTexto(texto: string): number {
  const limpio = limpiarTextoCantidad(texto)
  if (!limpio || limpio === ',') return 0
  const n = Number(limpio.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Cantidad para mostrar, con coma decimal y sin separador de miles: 1.5 → "1,5". */
export function formatCantidad(cantidad: number): string {
  return cantidad.toLocaleString('es-CL', { maximumFractionDigits: MAX_DECIMALES_CANTIDAD, useGrouping: false })
}

export function esCantidadEntera(cantidad: number): boolean {
  return Number.isInteger(cantidad)
}

/**
 * Precio unitario exacto (neto ÷ cantidad), hasta 2 decimales: "$12.333,33".
 * Excepción a "CLP sin decimales": el precio unitario es un valor derivado; los
 * montos que se cobran (subtotal, IVA, total) son enteros y los calcula SAP.
 */
export function formatPrecioUnitario(precio: number): string {
  const valor = Math.round(precio * 100) / 100
  const texto = Math.abs(valor).toLocaleString('es-CL', { maximumFractionDigits: 2 })
  return valor < 0 ? `-$${texto}` : `$${texto}`
}
