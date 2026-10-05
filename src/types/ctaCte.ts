// Caja > Pago Cta. Cte. — partidas abiertas del cliente.
// Fuente: SAP FAR_CUSTOMER_LINE_ITEMS/Items vía GET /api/sap-cta-cte/partidas
// (ver server/src/routes/sapCtaCte.ts).

export interface IPartidaCtaCte {
  documento: string            // AccountingDocument (N° documento contable)
  posicion: string             // AccountingDocumentItem
  ejercicio: string            // FiscalYear
  tipoDocumento: string        // AccountingDocumentType (D1, D6, DW…) — descripción pendiente
  tipoDocumentoNombre: string  // ReferenceDocumentTypeName (ej. "Factura")
  folio: string                // DocumentReferenceID ('' en QAS: sin folio SII)
  documentoFacturacion: string // BillingDocument (N° factura SD)
  debeHaber: 'S' | 'H'         // S = cargo, H = abono
  moneda: string
  monto: number                // CLP entero
  monedaDocumento: string
  montoDocumento: number
  fechaDocumento: string       // YYYY-MM-DD
  fechaVencimiento: string     // YYYY-MM-DD
  diasMora: number             // > 0 vencida; entre -7 y 0 por vencer; < -7 vigente
  bloqueoPago: string          // '' = autorizado
  sucursal: string             // '' = no informada (la API no la trae)
}

// Clave única de una partida SAP: el N° de documento solo no es único entre
// ejercicios ni posiciones.
export function clavePartidaCtaCte(p: Pick<IPartidaCtaCte, 'documento' | 'posicion' | 'ejercicio'>): string {
  return `${p.documento}-${p.posicion}-${p.ejercicio}`
}

// Partidas que no se pueden seleccionar para pagar, con el motivo.
export function motivoNoPagable(p: IPartidaCtaCte): string | null {
  if (p.bloqueoPago) return `Bloqueo de pago (${p.bloqueoPago})`
  // Aplicar abonos al pago está pendiente de definir con Arquitectura.
  if (p.debeHaber === 'H' || p.monto < 0) return 'Abono: su aplicación al pago está pendiente de definir'
  return null
}

export interface IPartidasCtaCteResult {
  success: boolean
  message?: string
  total?: number
  truncado?: boolean
  data?: IPartidaCtaCte[]
}
