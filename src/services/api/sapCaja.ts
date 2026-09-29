const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface IAperturaCajaParams {
  sucursal: string
  monto: number
  fecha: string
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
}

/**
 * Crea el asiento real de Apertura de Caja en SAP vía el Z-service
 * ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet — BORRADOR con GLAccount/SpGlInd
 * aún hardcodeados pendientes de regularizar (ver
 * server/src/routes/sapCaja.ts, construirBodyAperturaCaja).
 */
export async function crearAperturaCajaSap(params: IAperturaCajaParams): Promise<IAperturaCajaResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-caja/apertura`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}
