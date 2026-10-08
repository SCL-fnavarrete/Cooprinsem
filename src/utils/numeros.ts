// Inputs solo numéricos de descuentos y recargos del pedido. El POS solo
// captura el valor: el cálculo del precio lo hace SAP.

/** Deja solo los dígitos del texto ingresado (sin signos, decimales ni letras). */
export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

/** Porcentaje entero entre 0 y 100 (sobre 100 queda en 100). Vacío = 0. */
export function porcentajeDesdeTexto(texto: string): number {
  const digitos = soloDigitos(texto)
  return digitos ? Math.min(100, Number(digitos)) : 0
}

/** Monto CLP entero, sin decimales. Vacío = 0. */
export function montoDesdeTexto(texto: string): number {
  const digitos = soloDigitos(texto)
  return digitos ? Number(digitos) : 0
}
