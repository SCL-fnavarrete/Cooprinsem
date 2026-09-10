const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface IValidarPedidoParams {
  cliente: string
  items: { codigoMaterial: string; cantidad: number; unidadMedida?: string }[]
  centro?: string
  tipoDocumento: string
  canalDistribucion: string
  destinatarioMercancia?: string // BPCustomerNumber del interlocutor SH elegido en el form
  idVendedor?: string            // Id Vendedor del usuario logueado — interlocutor ZA
}

export interface IValidarPedidoResult {
  success: boolean
  // Solo viene en respuestas de error — el éxito ya no fabrica un mensaje,
  // se muestra `data` (la respuesta real de SAP) tal cual.
  message?: string
  data?: any
}

export async function validarPedidoSap(params: IValidarPedidoParams): Promise<IValidarPedidoResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-pedidos/validar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.message ?? 'Error al validar pedido en SAP')
  }

  return json
}

export interface IPreviewPedidoResult {
  success: boolean
  body?: Record<string, unknown>
  advertencias?: string[]
  message?: string
}

/**
 * TEMPORAL — arma el mismo JSON que se enviaría a SAP, pero el backend nunca
 * llega a tocar SAP. Usado por el botón "Grabar" durante pruebas manuales de
 * datos (ver PROGRESS.md). Para volver al comportamiento real, usar
 * validarPedidoSap() en su lugar.
 */
export async function previsualizarPedidoSap(params: IValidarPedidoParams): Promise<IPreviewPedidoResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-pedidos/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.message ?? 'Error al armar la previsualización del pedido')
  }

  return json
}