import type { KUNNR, MATNR, VBELN, BLART } from './sap'
import type { CanalDistribucion, TipoDocumentoVenta } from '@/config/sap'

export interface ILineaPedido {
  posicion: string        // '10', '20', '30'... (múltiplos de 10)
  codigoMaterial: MATNR
  descripcion: string
  cantidad: number        // > 0
  unidadMedida: string
  precioUnitario: number  // en CLP, entero
  subtotal: number        // cantidad × precioUnitario, en CLP
}

export interface IPedidoHeader {
  codigoCliente: KUNNR
  canalDistribucion: CanalDistribucion
  tipoDocumento: TipoDocumentoVenta
  referencia: string        // O.C. Cliente, texto libre
  observaciones: string     // Observaciones de factura
  ubicacionPredio: string   // Ubicación del predio, texto libre (max 1000)
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
  observaciones: string
  ubicacionPredio: string
  lineas: ILineaPedido[]
  subtotal: number
  totalIVA: number
  total: number
}
