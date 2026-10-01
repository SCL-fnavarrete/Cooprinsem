import type { ILineaPedido } from '@/types/pedido'
import type { IPrecioPosicionSap } from '@/services/api/sapPedidos'

// Campos de A_SalesOrderItemSimulation que se usan para el precio. SAP los
// envía como string (ej. "10908"); se tipan laxos porque la respuesta cruda
// viaja como `any` desde el backend.
export interface IItemSimuladoSap {
  Material?: string
  RequestedQuantity?: string | number
  NetAmount?: string | number
  TaxAmount?: string | number
}

interface ISimulacionSap {
  to_Item?: { results?: IItemSimuladoSap[] } | IItemSimuladoSap[]
}

function itemsDeSimulacion(simulacion: unknown): IItemSimuladoSap[] {
  const toItem = (simulacion as ISimulacionSap | undefined)?.to_Item
  const items = Array.isArray(toItem) ? toItem : toItem?.results
  return Array.isArray(items) ? items : []
}

// Ubica el ítem simulado que corresponde a una línea local — matchea por
// Material (SAP puede devolverlo con ceros a la izquierda) y cae a la posición
// por índice si no encuentra coincidencia. SAP devuelve los ítems en el mismo
// orden en que se enviaron.
export function obtenerItemSimuladoSap(simulacion: unknown, index: number, codigoMaterial: string): IItemSimuladoSap | undefined {
  const items = itemsDeSimulacion(simulacion)
  if (items.length === 0) return undefined
  const porMaterial = items.find(
    (it) => String(it.Material ?? '').replace(/^0+/, '') === codigoMaterial.replace(/^0+/, '')
  )
  return porMaterial ?? items[index]
}

// Precio de una línea según SAP. A_SalesOrderItemSimulation no trae precio
// unitario como campo propio: se deriva de NetAmount / RequestedQuantity.
// Montos CLP enteros (se redondea, nunca toFixed). null si SAP no informó montos.
export function precioLineaSap(item: IItemSimuladoSap | undefined): { precioUnitario: number; neto: number; iva: number | undefined } | null {
  if (!item) return null
  const neto = Number(item.NetAmount)
  const cantidad = Number(item.RequestedQuantity)
  if (!Number.isFinite(neto) || !Number.isFinite(cantidad) || cantidad === 0) return null
  const iva = Number(item.TaxAmount)
  return {
    precioUnitario: Math.round(neto / cantidad),
    neto: Math.round(neto),
    iva: Number.isFinite(iva) ? Math.round(iva) : undefined,
  }
}

// Aplica el resultado de /api/sap-pedidos/precios a las líneas, por número de
// posición. Las líneas que no vinieron en la respuesta (ej. cantidad 0) quedan
// sin precio de SAP.
export function aplicarPreciosPorPosicion(lineas: ILineaPedido[], posiciones: IPrecioPosicionSap[]): ILineaPedido[] {
  const porPosicion = new Map(posiciones.map((p) => [String(Number(p.posicion)), p]))
  return lineas.map((linea) => {
    const precio = porPosicion.get(String(Number(linea.posicion)))
    if (!precio) {
      return linea.estadoPrecio === 'consultando' ? { ...linea, estadoPrecio: undefined } : linea
    }
    if (precio.error !== undefined) {
      return { ...linea, estadoPrecio: 'error', errorPrecio: precio.error }
    }
    return {
      ...linea,
      precioUnitario: precio.precioUnitario,
      subtotal: precio.neto,
      ivaSap: precio.iva,
      estadoPrecio: 'ok',
      errorPrecio: undefined,
    }
  })
}

// Copia a las líneas del pedido los precios que devolvió la simulación SAP.
// Las líneas sin dato de SAP quedan sin cambios.
export function aplicarPreciosSimulacion(lineas: ILineaPedido[], simulacion: unknown): ILineaPedido[] {
  return lineas.map((linea, idx) => {
    const precio = precioLineaSap(obtenerItemSimuladoSap(simulacion, idx, linea.codigoMaterial))
    if (!precio) return linea
    return { ...linea, precioUnitario: precio.precioUnitario, subtotal: precio.neto, ivaSap: precio.iva }
  })
}
