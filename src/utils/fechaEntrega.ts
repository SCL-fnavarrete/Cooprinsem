// Fecha de entrega por posición del pedido (27-10-2026): por defecto hoy (hora de
// Chile), sin fechas pasadas. En pantalla DD-MM-AAAA; a SAP va en la línea de
// reparto de cada posición (to_ScheduleLine.RequestedDeliveryDate).

/** Hoy en Chile como DD-MM-AAAA (de noche, en UTC ya es mañana). */
export function hoyChileFechaEntrega(ahora = new Date()): string {
  const [anio, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora).split('-')
  return `${dia}-${mes}-${anio}`
}

/** "27-10-2026" → "2026-10-27"; null si no es una fecha real. */
export function fechaEntregaISO(fecha: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(fecha.trim())
  if (!m) return null
  const [, dia, mes, anio] = m
  const d = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)))
  if (d.getUTCDate() !== Number(dia) || d.getUTCMonth() !== Number(mes) - 1) return null
  return `${anio}-${mes}-${dia}`
}

/** Motivo por el que la fecha no sirve, o null si es válida (hoy o posterior). */
export function errorFechaEntrega(fecha: string, ahora = new Date()): string | null {
  const iso = fechaEntregaISO(fecha)
  if (!iso) return 'Fecha inválida (use DD-MM-AAAA)'
  const hoy = fechaEntregaISO(hoyChileFechaEntrega(ahora))!
  return iso < hoy ? 'La fecha de entrega no puede ser anterior a hoy' : null
}
