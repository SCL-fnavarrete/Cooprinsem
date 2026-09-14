const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface IPedidoSapParams {
  cliente: string
  // precioUnitario no se envía a SAP (SAP calcula su propio pricing) — viaja
  // solo para que /api/sap-pedidos/crear pueda armar el registro espejo local
  // en pedidos_venta/pedidos_posicion tras una creación exitosa.
  items: { codigoMaterial: string; cantidad: number; unidadMedida?: string; precioUnitario?: number }[]
  centro?: string
  tipoDocumento: string
  canalDistribucion: string
  destinatarioMercancia?: string // BPCustomerNumber del interlocutor SH elegido en el form
  idVendedor?: string            // Id Vendedor del usuario logueado — interlocutor ZA
  // Generado una vez al simular (ver usePedido.ts) y reenviado tal cual al
  // confirmar la creación, para que ambas llamadas a SAP queden
  // correlacionadas por la misma referencia.
  purchaseOrderByCustomer?: string
  // No se envían a SAP — solo para el registro espejo local (igual que precioUnitario).
  observaciones?: string
  ubicacionPredio?: string
  clienteNombre?: string
  clienteRut?: string
  condicionPago?: string
  vendedorNombre?: string
}

interface IResultadoSapBase {
  success: boolean
  // Solo viene en respuestas de error.
  message?: string
  // Body crudo del error devuelto por SAP (error.response.data), cuando aplica.
  detalle?: any
  // JSON exacto enviado a cada fase — distintos entre sí porque el campo de
  // centro por posición usa un nombre diferente en cada entidad de SAP
  // (Plant en la simulación, ProductionPlant en la creación). Vienen siempre,
  // tanto en éxito como en error, para mostrarlos junto a la respuesta.
  bodySimulacion?: Record<string, unknown>
  bodyCreacion?: Record<string, unknown>
}

export interface ISimularPedidoResult extends IResultadoSapBase {
  data?: { simulacion: any }
  // Advertencias de datos incompletos (ej. SH/ZA no incluidos en to_Partner) —
  // no bloquean la llamada a SAP, solo informan.
  advertencias?: string[]
}

export interface ICrearPedidoResult extends IResultadoSapBase {
  data?: { creacion: any }
}

/**
 * Fase 1 — solo simula (Pricing/Tax/ATP/Credit Check), no crea nada en SAP.
 * Nunca lanza por un error de negocio de SAP (success:false) — el caller
 * decide qué hacer con el JSON completo (incluye `message`/`detalle`), para
 * poder mostrarlo tal cual en pantalla. Solo se propaga una excepción real si
 * la llamada de red o el parseo del JSON fallan.
 */
export async function simularPedidoSap(params: IPedidoSapParams): Promise<ISimularPedidoResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-pedidos/simular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  return res.json()
}

/**
 * Fase 2 — crea el pedido real en SAP (A_SalesOrder). Llamar solo después de
 * que el usuario confirmó explícitamente el resumen de una simulación exitosa.
 */
export async function crearPedidoSap(params: IPedidoSapParams): Promise<ICrearPedidoResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-pedidos/crear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  return res.json()
}
