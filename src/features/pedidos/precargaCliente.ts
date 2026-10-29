// Carga por código el cliente que llega a Nuevo Pedido desde Clientes > "Crear Pedido".
// Misma fuente que el buscador (Sap_cliente); grupo TODOS porque el cliente ya fue elegido.
import { buscarClientesSapTabla } from '@/services/api/clientes'
import type { ICliente } from '@/types/cliente'

const sinCeros = (codigo: string) => codigo.trim().replace(/^0+(?=\d)/, '')

/** El cliente con ese código exacto, o null si no existe (la búsqueda es "contiene"). */
export async function cargarClientePorCodigo(codigo: string): Promise<ICliente | null> {
  const buscado = sinCeros(codigo)
  if (!buscado) return null
  const resultados = await buscarClientesSapTabla(buscado, undefined, 'TODOS')
  return resultados.find((c) => sinCeros(c.codigoCliente) === buscado) ?? null
}
