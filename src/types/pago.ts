// Tipos para la pantalla Detalle de Pago (PagoDetallePage)

export type MedioPagoCodigo = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'CHEQUE_DIA' | 'VALE_VISTA'

export interface IMedioPago {
  codigo: MedioPagoCodigo
  label: string
  habilitado: boolean
}

// Entrada en la tabla "Medios de Pago Seleccionados"
export interface IPagoEntry {
  id: string
  tipoPago: string       // "EFECTIVO", "VUELTO EFECTIVO"
  numero: string
  fecha: string
  cuota: string
  monto: number
}
