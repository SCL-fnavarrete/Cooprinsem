// Tipos para la pantalla Detalle de Pago (PagoDetallePage)

export type MedioPagoCodigo = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'CHEQUE_DIA' | 'CHEQUE_FECHA' | 'VALE_VISTA'

export interface IMedioPago {
  codigo: MedioPagoCodigo
  label: string
  habilitado: boolean
}

// Datos de tarjeta (pantallas del WebDynpro, correo de José 22-10-2026)
export interface IDatosTarjeta {
  rutEmisor: string
  numeroTarjeta: string      // últimos 4 dígitos
  cuotas: string             // solo crédito
  numeroOperacion: string
  codigoAutorizacion: string
}

// Datos de cheque (al día y a fecha). Fechas en YYYY-MM-DD.
export interface IDatosCheque {
  fechaGiro: string
  fechaCheque: string
  fechaMaxima: string        // solo cheque a fecha (se muestra, no se edita)
  rutGirador: string
  codigoBanco: string        // BankKey de Sap_banco
  plaza: string
  cuentaBancaria: string
  numeroCheque: string
  telefono: string
}

// Medio de pago capturado en su popup (uno por vía)
export interface IMedioCapturado {
  codigo: MedioPagoCodigo
  monto: number
  tarjeta?: IDatosTarjeta
  cheque?: IDatosCheque
}

// Entrada en la tabla "Medios de Pago Seleccionados"
export interface IPagoEntry {
  id: string
  tipoPago: string       // "EFECTIVO", "VUELTO EFECTIVO", "TARJETA DE DEBITO", ...
  numero: string
  fecha: string
  cuota: string
  monto: number
}
