// Pago Cta. Cte. (Caja) — documentos de cuenta corriente del cliente.
// PROVISORIO: estructura tomada de la grilla "Listado de Documentos" del
// WebDynpro (2026-10-05). Ajustar los nombres a la respuesta real cuando SAP
// entregue la API.

export interface IDocumentoCtaCte {
  sucursal: string          // Centro, ej. D170
  tipoDocumento: string     // ej. FACTURA NORMAL, FACTURA ANTICIPADA
  folio: string             // ej. 033-4759617
  moneda: string            // ej. CLP
  monto: number             // CLP entero
  monedaDocumento: string
  montoDocumento: number
  cuota: string             // ej. "1 de 1", "2 de 5"
  fechaVencimiento: string  // YYYY-MM-DD
  bloqueoPago: string       // ej. "Autorizado el pago"
}

// Filtros del formulario "Cuenta Corriente".
export interface IFiltroCtaCte {
  rut: string
  codigoCliente: string
  sucursal: string          // '' = todas
  fechaVencimiento: string  // '' = sin filtro
}
