import { API_BASE_URL } from './config'

// Facturación del pedido POS (pasos 2 y 3) — ver server/src/routes/sapFacturas.ts.

export type EstadoPasoFactura = 'ok' | 'existente' | 'propuesta' | 'error' | 'omitido'

/** Una llamada a SAP con su JSON de ida (body) y de vuelta (respuesta). */
export interface ILlamadaSap {
  descripcion: string
  metodo: 'GET' | 'POST'
  url: string
  body?: unknown
  status?: number
  respuesta?: unknown
}

export interface IPasoFactura {
  paso: 1 | 2 | 3
  nombre: string
  estado: EstadoPasoFactura
  mensaje: string
  llamadas: ILlamadaSap[]
  datos?: Record<string, unknown>
}

export interface IEmitirFacturaParams {
  salesOrder: string
  centro: string
  tipoDocumento: string
  canalDistribucion: string
}

export interface IEmitirFacturaResult {
  success: boolean
  message?: string
  salesOrder?: string
  pedidoLocal?: string | null
  modo?: { factura: 'S' | 'N'; folio: 'S' | 'N'; claseFactura: string }
  pasos?: IPasoFactura[]
}

/**
 * Factura un pedido ya creado en SAP y pide su folio. Nunca lanza por un
 * rechazo de SAP (success:false con el detalle de cada paso); solo por red.
 */
export async function emitirFacturaSap(params: IEmitirFacturaParams): Promise<IEmitirFacturaResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-facturas/emitir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}

// Qué clases se facturan: src/config/comprobante.ts (correspondeFacturar). El backend la vuelve a validar.
