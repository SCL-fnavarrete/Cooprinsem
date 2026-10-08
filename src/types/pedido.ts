import type { ISerieAsignada } from './serie'
import type { KUNNR, MATNR, VBELN, BLART } from './sap'

export interface ILineaPedido {
  posicion: string        // '10', '20', '30'... (múltiplos de 10)
  codigoMaterial: MATNR
  descripcion: string
  cantidad: number        // > 0
  unidadMedida: string
  precioUnitario: number  // en CLP, entero
  subtotal: number        // cantidad × precioUnitario, en CLP
  centroSuministrador: string  // Centro desde donde se despacha
  almacen: string              // Almacén dentro del centro
  recargo: number              // Recargo manual (condición ZR02)
  descuentoLinea: number       // Descuento manual % por línea (condición ZD02)
  fechaEntrega: string         // Fecha entrega (RequestedDeliveryDate)
  ivaSap?: number              // IVA de la línea según la simulación SAP — se limpia al cambiar la cantidad
  estadoPrecio?: 'consultando' | 'ok' | 'error'  // Consulta automática de precios a SAP
  errorPrecio?: string         // Motivo cuando SAP no calculó el precio de la línea
  series?: ISerieAsignada[]    // Series asignadas (PE-23) — opcional; se limpian al cambiar la cantidad
}

export interface IPedidoHeader {
  codigoCliente: KUNNR
  // string (no union fijo): viene vivo de pos_canal_distribucion/pos_documento_venta
  // (ver PedidoHeader.tsx) — sus valores reales no coinciden con las constantes
  // de config/sap.ts (ej. "Venta normal" real vs "Venta Normal" del config).
  canalDistribucion: string
  tipoDocumento: string
  referencia: string        // O.C. Cliente, texto libre
  observaciones: string     // Obs. Nota de Venta (texto SAP Z001)
  ubicacionPredio: string   // Ubicación del predio, texto libre (max 1000) — texto SAP Z010
  retira: string            // Cliente que retira mercadería (PartnerFunction ZB)
  descuentoPorcentaje: number  // Descuento manual cabecera % (condición ZD02)
  patente: string           // Transporte: patente del vehículo, en mayúsculas — texto SAP Z082
  nombreConductor: string   // Transporte: nombre del conductor — texto SAP Z087
  rutConductor: string      // Transporte: RUT del conductor (12.345.678-9) — texto SAP Z088
  despacho: string          // Condición de expedición (VBAK-VSBED)
  recargoFlete: number      // Monto recargo flete (condición ZFEM)
  destinatarioMercancia: string  // Interlocutor - Destinatario de mercancía
  quienRetira: string            // Interlocutor - Quien retira
}

export interface IPedido {
  header: IPedidoHeader
  lineas: ILineaPedido[]
}

// Request body para POST /api/pedidos
export interface ICrearPedidoRequest {
  kunnr: KUNNR
  tipo_doc: string
  canal: string
  lineas: Array<{
    matnr: MATNR
    cantidad: number
    precio_unitario: number
  }>
}

// Respuesta de POST /api/pedidos → { d: { VBELN, BLART, total } }
export interface ICrearPedidoResponse {
  VBELN: VBELN
  BLART: BLART
  total: number
}

// Filtros para listado de pedidos
export interface IFiltroPedidos {
  desde?: string   // ISO date YYYY-MM-DD
  hasta?: string   // ISO date YYYY-MM-DD
  estado?: 'Creado' | 'Procesado' | 'Anulado' | ''
  vbeln?: string   // búsqueda parcial por Nº Pedido
  cliente?: string // búsqueda por nombre de cliente
}

// Ítem del listado de pedidos
export interface IPedidoListItem {
  vbeln: VBELN
  fecha: string
  kunnr: KUNNR
  nombreCliente: string
  tipoDoc: string
  canal: string
  total: number
  estado: string
  nroDocumento?: string  // BELNR del cobro (clase W), vacío si no pagado
  fechaVigencia?: string // YYYY-MM-DD — solo cotizaciones
}

// Detalle completo de un pedido (solo lectura)
export interface IPedidoDetalle {
  vbeln: VBELN
  fecha: string
  kunnr: KUNNR
  nombreCliente: string
  rut: string
  tipoDoc: string
  canal: string
  condicionPago: string
  vendedor: string
  estado: string
  nroDocumento: string
  fechaVigencia?: string // YYYY-MM-DD — solo cotizaciones
  observaciones: string
  ubicacionPredio: string
  lineas: ILineaPedido[]
  subtotal: number
  totalIVA: number
  total: number
}
