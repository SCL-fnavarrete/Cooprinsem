// Nuevo Pedido con el cliente (y, si se eligió, el destinatario) ya cargados.
// Va en la URL para que no se pierda al recargar la página.
export const PARAM_CLIENTE = 'cliente'
export const PARAM_DESTINATARIO = 'destinatario'

export function rutaNuevoPedido(cliente: string, destinatario?: string | null): string {
  const params = new URLSearchParams({ [PARAM_CLIENTE]: cliente })
  if (destinatario) params.set(PARAM_DESTINATARIO, destinatario)
  return `/pedidos/nuevo?${params}`
}
