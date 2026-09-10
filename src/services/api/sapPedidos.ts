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
  // Advertencias de datos incompletos (ej. SH/ZA no incluidos en to_Partner) —
  // no bloquean la llamada a SAP, solo informan.
  advertencias?: string[]
  // Solo en error de creación (fase 2): la simulación (fase 1) sí fue exitosa,
  // se conserva para diagnóstico aunque el pedido no se haya creado.
  simulacion?: any
  // Body crudo del error devuelto por SAP (error.response.data), cuando aplica.
  detalle?: any
}

/**
 * Nunca lanza por un error de negocio de SAP (success:false) — el caller
 * decide qué hacer con el JSON completo (incluye `message`/`detalle`/
 * `simulacion` en el caso de error), para poder mostrarlo tal cual en
 * pantalla. Solo se propaga una excepción real si la llamada de red o el
 * parseo del JSON fallan.
 */
export async function validarPedidoSap(params: IValidarPedidoParams): Promise<IValidarPedidoResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-pedidos/validar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  return res.json()
}