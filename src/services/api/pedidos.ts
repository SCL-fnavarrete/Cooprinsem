import type { IPedido } from '@/types/pedido'
import type { ICrearPedidoResponse } from '@/types/pedido'
import { API_BASE_URL } from './config'

export async function crearPedido(pedido: IPedido): Promise<ICrearPedidoResponse> {
  // Transformar IPedido (camelCase) a ICrearPedidoRequest (snake_case)
  const body = {
    kunnr: pedido.header.codigoCliente,
    tipo_doc: pedido.header.tipoDocumento,
    canal: pedido.header.canalDistribucion,
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
