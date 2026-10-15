const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface IAperturaCajaParams {
  usuario: string   // Login del cajero (usuarios.username, ej. DVIANA)
  sucursal: string
  monto: number
  fecha?: string    // Informativo: el backend usa siempre la fecha de hoy (Chile)
}

// Fila de apertura_caja (registro de la apertura en el POS).
export interface IAperturaRegistrada {
  id: string
  usuario: string
  sociedad: string
  sucursal: string
  fecha: string         // YYYY-MM-DD
  monto: number
  moneda: string
  nroDocumento: string  // AcDocNo de SAP ('' en aperturas anteriores al 15-10-2026)
  ejercicio: string     // FiscYear de SAP
  creadoEn: string      // ISO, fecha y hora del registro
}

export interface IEstadoAperturaCaja {
  success: boolean
  abierta?: boolean
  fecha?: string
  apertura?: IAperturaRegistrada | null
  message?: string
}

export interface IAperturaCajaResult {
  success: boolean
  data?: { apertura: any }
  message?: string
  // Detalle de errores de negocio de la BAPI (error.innererror.errordetails
  // de la respuesta SAP) — puede traer más de un motivo de rechazo a la vez.
  errordetails?: Array<{ message: string; severity: string }>
  detalle?: any
  // Body enviado a ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet — se muestra
  // en el modal de resultado junto a la respuesta, mismo patrón que
  // sap-pedidos/cotizar.
  body?: Record<string, unknown>
  url?: string
  yaAbierta?: boolean               // La caja del cajero ya estaba abierta hoy: no se contabilizó
  apertura?: IAperturaRegistrada    // Apertura existente (si yaAbierta)
  registro?: IAperturaRegistrada | null  // Fila grabada en apertura_caja tras el OK de SAP
  advertencia?: string              // SAP OK pero no se pudo registrar en el POS
}

/**
 * ¿Está abierta hoy la caja del cajero? (tabla apertura_caja, ver
 * server/src/routes/sapCaja.ts). Lanza solo por error de red.
 */
export async function getEstadoAperturaCaja(usuario: string, sucursal: string): Promise<IEstadoAperturaCaja> {
  const query = new URLSearchParams({ usuario, sucursal })
  const res = await fetch(`${API_BASE_URL}/api/sap-caja/apertura/estado?${query}`)
  return res.json()
}

/**
 * Crea el asiento real de Apertura de Caja en SAP vía el Z-service
 * ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet y, si SAP lo acepta, lo
 * registra en apertura_caja. Cuentas fijas (ver server/src/routes/sapCaja.ts).
 */
export async function crearAperturaCajaSap(params: IAperturaCajaParams): Promise<IAperturaCajaResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-caja/apertura`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}

// ─── Egreso de Caja (tabla egreso_caja + ZCOOP_JOURNALENTRY_SRV) ─────────────

export interface IEgresoRegistrado {
  id: string
  usuario: string
  sociedad: string
  sucursal: string
  fecha: string         // YYYY-MM-DD
  monto: number
  moneda: string
  nroDocumento: string  // AcDocNo de SAP ('' si no hay)
  ejercicio: string     // FiscYear de SAP
  motivo: string        // Por ahora siempre "EGRESO"
  creadoEn: string      // ISO, fecha y hora del registro
  descripcion: string   // Texto libre del cajero (solo POS, no va a SAP)
}

export interface IEgresosCajaResult {
  success: boolean
  desde?: string
  hasta?: string
  data?: IEgresoRegistrado[]
  message?: string
}

export interface IEgresoCajaParams {
  usuario: string
  sucursal: string
  monto: number
  descripcion?: string  // Hasta 500 caracteres; se graba en egreso_caja.descripcion
}

export interface IEgresoCajaResult {
  success: boolean
  pendiente?: boolean               // Asiento por confirmar: no se contabilizó ni registró (JSON propuesto en body)
  asiento?: 'CLIENTES' | 'CUENTAS'  // Variante de asiento usada (parámetro EGRESO_ASIENTO)
  message?: string
  data?: { egreso: { AcDocNo?: string; FiscYear?: string; Message?: string } & Record<string, unknown> }
  registro?: IEgresoRegistrado | null
  advertencia?: string
  errordetails?: Array<{ message: string; severity: string }>
  detalle?: unknown
  body?: Record<string, unknown>
  url?: string
}

/** Egresos de la sucursal entre dos fechas (YYYY-MM-DD). Sin fechas: los de hoy. */
export async function getEgresosCaja(params: { sucursal: string; desde?: string; hasta?: string }): Promise<IEgresosCajaResult> {
  const query = new URLSearchParams({ sucursal: params.sucursal })
  if (params.desde) query.set('desde', params.desde)
  if (params.hasta) query.set('hasta', params.hasta)
  const res = await fetch(`${API_BASE_URL}/api/sap-caja/egresos?${query}`)
  return res.json()
}

/** Registra un egreso. Nunca lanza por rechazo de SAP; solo por error de red. */
export async function registrarEgresoCaja(params: IEgresoCajaParams): Promise<IEgresoCajaResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-caja/egreso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}
