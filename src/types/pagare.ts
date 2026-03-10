// Pagaré — compromiso de pago de un cliente (solo lectura)
export interface IPagare {
  id: string
  kunnr: string            // Código cliente SAP
  nombre: string           // Nombre del cliente
  rut: string              // Formato 12.345.678-9
  referencia: string       // Referencia del documento
  cuota: number            // Número de cuota (ej: 1, 2, 3...)
  valorPagare: number      // Monto en CLP (entero, sin decimales)
  fechaVencimiento: string // Formato DD/MM/YYYY
}
