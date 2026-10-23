import type { ISerieValidada } from '@/types/serie'

import { API_BASE_URL } from './config'

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
  // true con SERIES_SAP_HABILITADO = 'N' (el backend responde con disponibilidad simulada)
  datosDePrueba?: boolean
  fuente?: 'sap' | 'simulado'
  // Aviso de lo que SAP todavía no valida (ej. la sucursal de la serie)
  advertencia?: string
  // URL consultadas a SAP (se muestran en modo técnico)
  consultas?: string[]
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
