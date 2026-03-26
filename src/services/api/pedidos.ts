import type { IPedido, IFiltroPedidos, IPedidoListItem, IPedidoDetalle } from '@/types/pedido'
import type { ICrearPedidoResponse } from '@/types/pedido'
import { API_BASE_URL } from './config'

export async function getPedidos(filtros: IFiltroPedidos): Promise<IPedidoListItem[]> {
  const params = new URLSearchParams()
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  if (filtros.estado) params.set('estado', filtros.estado)

  const res = await fetch(`${API_BASE_URL}/api/pedidos?${params}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error consultando pedidos: ${res.status}`)
  }

  const json = await res.json()
  return json.d.results as IPedidoListItem[]
}

export async function crearPedido(pedido: IPedido): Promise<ICrearPedidoResponse> {
  // Transformar IPedido (camelCase) a ICrearPedidoRequest (snake_case)
  const body = {
    kunnr: pedido.header.codigoCliente,
    tipo_doc: pedido.header.tipoDocumento,
    canal: pedido.header.canalDistribucion,
    observaciones: pedido.header.observaciones || undefined,
    ubicacion_predio: pedido.header.ubicacionPredio || undefined,
    lineas: pedido.lineas.map((l) => ({
      matnr: l.codigoMaterial,
      cantidad: l.cantidad,
      precio_unitario: l.precioUnitario,
    })),
  }

  const res = await fetch(`${API_BASE_URL}/api/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error creando pedido: ${res.status}`)
  }

  const json = await res.json()
  return json.d as ICrearPedidoResponse
}

export async function getPedidoById(vbeln: string): Promise<IPedidoDetalle | null> {
  const res = await fetch(`${API_BASE_URL}/api/pedidos/${vbeln}`)

  if (res.status === 404) return null

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error ?? `Error consultando pedido: ${res.status}`)
  }

  const json = await res.json()
  return json.d as IPedidoDetalle
}
