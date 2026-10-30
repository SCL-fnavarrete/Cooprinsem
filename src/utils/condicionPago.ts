import type { ICondicionPagoSap } from '@/services/api/sapPedidos'

/**
 * Texto de "Condición Pago" en la cabecera de Nuevo Pedido: la que devolvió la
 * simulación de SAP ("D001 - Credito Vcto. dia 12"; solo el código si no está en
 * condicion_pago). Antes de simular, lo que traiga el cliente (hoy viene vacío).
 */
export function textoCondicionPago(condicionSap: ICondicionPagoSap | null, condicionCliente?: string): string {
  if (condicionSap?.codigo) {
    return condicionSap.descripcion ? `${condicionSap.codigo} - ${condicionSap.descripcion}` : condicionSap.codigo
  }
  return condicionCliente ?? ''
}
