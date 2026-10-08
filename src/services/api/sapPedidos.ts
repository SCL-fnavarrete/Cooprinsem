const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface IPedidoSapParams {
  cliente: string
  // precioUnitario no se envía a SAP (SAP calcula su propio pricing) — viaja
  // solo para que /api/sap-pedidos/crear pueda armar el registro espejo local
  // en pedidos_venta/pedidos_posicion tras una creación exitosa.
  // descuentoLinea (ZD02) y recargo (ZFX3): condiciones de precio de la posición
  items: { codigoMaterial: string; cantidad: number; unidadMedida?: string; precioUnitario?: number; descuentoLinea?: number; recargo?: number }[]
  centro?: string
  // Condiciones de precio de cabecera: ZD02 (descuento %) y ZFEM (recargo flete, CLP)
  descuentoPorcentaje?: number
  recargoFlete?: number
  tipoDocumento: string
  canalDistribucion: string
  destinatarioMercancia?: string // BPCustomerNumber del interlocutor SH elegido en el form
  idVendedor?: string            // Id Vendedor del usuario logueado — interlocutor ZA
  // Generado una vez al simular (ver usePedido.ts) y reenviado tal cual al
  // confirmar la creación, para que ambas llamadas a SAP queden
  // correlacionadas por la misma referencia.
  purchaseOrderByCustomer?: string
  // Textos de cabecera (to_Text, PE-26) — solo en la creación, no en la
  // simulación: Z001 observaciones, Z010 ubicación predio, Z082 patente,
  // Z087 nombre conductor, Z088 RUT conductor. observaciones y ubicacionPredio
  // además van al registro espejo local.
  observaciones?: string
  ubicacionPredio?: string
  patente?: string
  nombreConductor?: string
  rutConductor?: string
  // No se envían a SAP — solo para el registro espejo local (igual que precioUnitario).
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

// Descuento % y Recargo Flete de cabecera desglosados por el backend para
// mostrarlos en los totales (no dentro del precio de las líneas). Montos de SAP.
export interface IAjustesCabeceraSap {
  descuento: number      // CLP, negativo
  recargoFlete: number   // CLP
  neto: number           // Neto total del pedido con todo aplicado
  iva: number            // IVA total del pedido con todo aplicado
}

export interface ISimularPedidoResult extends IResultadoSapBase {
  // simulacion = completa (la que se confirma); simulacionLineas = precios de las
  // líneas sin las condiciones de cabecera (viene igual a simulacion si no hay).
  data?: { simulacion: any; simulacionLineas?: any }
  cabecera?: IAjustesCabeceraSap | null
  // Advertencias de datos incompletos (ej. SH/ZA no incluidos en to_Partner) —
  // no bloquean la llamada a SAP, solo informan.
  advertencias?: string[]
}

export interface ICrearPedidoResult extends IResultadoSapBase {
  data?: { creacion: any }
  // Advertencias de SAP con el pedido creado (cabecera HTTP sap-message)
  advertenciasSap?: string[]
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

export interface IPreciosSapParams {
  cliente: string
  centro?: string
  tipoDocumento: string
  canalDistribucion: string
  // Descuentos y recargos: SAP devuelve el precio ya con ellos aplicados
  descuentoPorcentaje?: number
  recargoFlete?: number
  items: { posicion: string; codigoMaterial: string; cantidad: number; descuentoLinea?: number; recargo?: number }[]
}

// Precio de una posición según SAP, o el motivo por el que SAP no lo calculó.
export type IPrecioPosicionSap =
  | { posicion: string; precioUnitario: number; neto: number; iva: number; error?: undefined }
  | { posicion: string; error: string }

export interface IPreciosSapResult {
  success: boolean
  message?: string
  posiciones?: IPrecioPosicionSap[]
  // true cuando SAP rechazó el pedido completo y se consultó línea por línea
  // (alguna posición trae `error`).
  parcial?: boolean
  // Descuento/Recargo Flete de cabecera (null si no hay o si fue línea por línea)
  cabecera?: IAjustesCabeceraSap | null
}

/**
 * Consulta los precios de SAP para las líneas de la grilla (simulación con
 * to_Pricing, no crea documentos). Se llama en cada cambio de líneas, no solo
 * al Grabar. `signal` permite cancelar una consulta que quedó vieja.
 */
export async function consultarPreciosSap(params: IPreciosSapParams, signal?: AbortSignal): Promise<IPreciosSapResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-pedidos/precios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
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

// Mismos campos que IPedidoSapParams — se separa el tipo porque una cotización
// no tiene fase de "simulación" ni reenvía un purchaseOrderByCustomer previo.
export type ICotizacionSapParams = Omit<IPedidoSapParams, 'observaciones' | 'ubicacionPredio' | 'patente' | 'nombreConductor' | 'rutConductor' | 'descuentoPorcentaje' | 'recargoFlete'>

export interface ICrearCotizacionResult extends IResultadoSapBase {
  data?: { cotizacion: any }
  advertencias?: string[]
  // Body enviado a A_SalesQuotation — nombre propio (no bodySimulacion/
  // bodyCreacion de IResultadoSapBase) porque la cotización es de una sola fase.
  body?: Record<string, unknown>
  // URL completa (con sap-client/sap-language) usada para la llamada real —
  // solo para mostrarla en el modal y facilitar las pruebas manuales.
  url?: string
}

/**
 * Crea una cotización real en SAP (A_SalesQuotation) — BORRADOR pendiente de
 * confirmación de JFOG (ver server/src/routes/sapPedidos.ts,
 * construirBodyCotizacion). Llamada de una sola fase, sin simulación previa.
 */
export async function crearCotizacionSap(params: ICotizacionSapParams): Promise<ICrearCotizacionResult> {
  const res = await fetch(`${API_BASE_URL}/api/sap-pedidos/cotizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  return res.json()
}
