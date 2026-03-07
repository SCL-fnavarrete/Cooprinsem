// Validaciones de entrada — RUT chileno (módulo 11)

/**
 * Limpia un RUT eliminando puntos, guiones y espacios.
 * Retorna solo dígitos + K en mayúscula.
 */
export function limpiarRUT(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

/**
 * Valida un RUT chileno usando el algoritmo módulo 11.
 * Acepta formatos: "12.345.678-9", "123456789", "12345678-K"
 */
export function validarRUT(rut: string): boolean {
  const clean = limpiarRUT(rut)
  if (clean.length < 2) return false

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)

  // El cuerpo debe ser solo dígitos
  if (!/^\d+$/.test(body)) return false

  let suma = 0
  let multiplo = 2
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body[i], 10) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }

  const dvEsperado = 11 - (suma % 11)
  if (dvEsperado === 11) return dv === '0'
  if (dvEsperado === 10) return dv === 'K'
  return dv === String(dvEsperado)
}
