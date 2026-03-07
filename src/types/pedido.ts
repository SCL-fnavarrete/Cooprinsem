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
  referencia: string      // O.C. Cliente, texto libre
  observaciones: string   // Observaciones de factura
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
