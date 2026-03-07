// Funciones de formateo — CLP, RUT, fechas

/**
 * Formatea un monto entero como pesos chilenos: $1.234.567
 * CLP no tiene decimales — nunca usar toFixed() para moneda.
 */
export function formatCLP(monto: number): string {
  const rounded = Math.round(monto)
  if (rounded < 0) {
    return `-$${Math.abs(rounded).toLocaleString('es-CL')}`
  }
  return `$${rounded.toLocaleString('es-CL')}`
}

/**
 * Formatea un RUT chileno: 12.345.678-9
 * Acepta entrada con o sin puntos/guión.
 */
export function formatRUT(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return `${parseInt(body, 10).toLocaleString('es-CL')}-${dv}`
}

/**
 * Convierte fecha ISO (YYYY-MM-DD...) o SAP (YYYYMMDD) a DD/MM/YYYY
 */
export function formatFecha(fecha: string): string {
  // Normalizar: quitar guiones si existen, tomar primeros 8 chars
  const clean = fecha.replace(/-/g, '').slice(0, 8)
  if (clean.length !== 8) return fecha
  const yyyy = clean.slice(0, 4)
  const mm = clean.slice(4, 6)
  const dd = clean.slice(6, 8)
  return `${dd}/${mm}/${yyyy}`
}

/**
 * Convierte un Date a formato YYYYMMDD para enviar a SAP
 */
export function formatFechaSAP(fecha: Date): string {
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}
