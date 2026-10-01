import type { ISerieValidada } from '@/types/serie'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface IValidarSeriesParams {
  material: string
  centro: string
  desde: string
  hasta: string
}

export interface IValidarSeriesResult {
  success: boolean
  message?: string
  series?: ISerieValidada[]
  // true mientras la API de validación de SAP no esté disponible (el backend
  // responde con disponibilidad simulada).
  datosDePrueba?: boolean
}

/**
 * Valida un rango de series (Desde/Hasta) para un material. Nunca lanza por un
 * rechazo de negocio (success:false con `message`); solo por error de red.
 */
export async function validarSeriesSap(params: IValidarSeriesParams): Promise<IValidarSeriesResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-series/validar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}
