// Condición de pago del cliente según la simulación del pedido (correo de José,
// 30-10-2026): SAP la devuelve en la cabecera (CustomerPaymentTerms, ej. "D001")
// y la repite en cada posición. La descripción sale de la tabla condicion_pago.
// Funciones puras: sin SAP ni BD, para poder testearlas.

export interface ICondicionPagoPedido {
  codigo: string
  descripcion: string  // vacía si el código no está en condicion_pago
}

/** Código de la cabecera; si falta, el de la primera posición que lo traiga. null = sin dato. */
export function codigoCondicionPago(simulacion: any): string | null {
  const cabecera = String(simulacion?.CustomerPaymentTerms ?? '').trim()
  if (cabecera) return cabecera
  const items: any[] = simulacion?.to_Item?.results ?? (Array.isArray(simulacion?.to_Item) ? simulacion.to_Item : [])
  const deItem = items.map((i) => String(i?.CustomerPaymentTerms ?? '').trim()).find(Boolean)
  return deItem || null
}

export function armarCondicionPago(codigo: string | null, descripcion: string | null | undefined): ICondicionPagoPedido | null {
  if (!codigo) return null
  return { codigo, descripcion: (descripcion ?? '').trim() }
}
