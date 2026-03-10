// Anticipo de cliente — pago anticipado no asociado a factura (clase DZ en SAP)
// El Jefe Administrativo crea la solicitud en SAP (F-37) y el cajero la cobra en el POS.

export interface IAnticipo {
  nroComprobante: string    // Nº documento SAP (clase DZ)
  kunnr: string             // Código cliente SAP
  nombre: string            // Nombre del cliente
  rut: string               // Formato 12.345.678-9
  importe: number           // Monto en CLP (entero, sin decimales)
  fechaDoc: string          // Fecha del documento DD/MM/YYYY
  glosa: string             // Texto libre del anticipo
  estado: 'PENDIENTE' | 'PROCESADO'
}

export interface IBuscarAnticipoRequest {
  kunnr: string
  nroComprobante: string
}
