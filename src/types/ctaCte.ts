// Caja > Pago Cta. Cte. — partidas abiertas del cliente.
// Fuente: SAP FAR_CUSTOMER_LINE_ITEMS/Items vía GET /api/sap-cta-cte/partidas
// (ver server/src/routes/sapCtaCte.ts).

export interface IPartidaCtaCte {
  documento: string            // AccountingDocument (N° documento contable)
  posicion: string             // AccountingDocumentItem
  ejercicio: string            // FiscalYear
  tipoDocumento: string        // AccountingDocumentType (D1, D6, DW…)
  tipoDocumentoNombre: string  // Descripción de tipo_documento (ej. "Boleta Electronica"); '' si el código no está
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
  pagoPendiente?: string       // N° del pago POS ya contabilizado (variante 3) — pendiente de compensación por el equipo SAP
  enCuotas?: boolean           // El documento tiene más de una partida abierta (cuotas)
}

// Clave única de una partida SAP: el N° de documento solo no es único entre
// ejercicios ni posiciones.
export function clavePartidaCtaCte(p: Pick<IPartidaCtaCte, 'documento' | 'posicion' | 'ejercicio'>): string {
  return `${p.documento}-${p.posicion}-${p.ejercicio}`
}

// Partidas que no se pueden seleccionar para pagar, con el motivo.
export function motivoNoPagable(p: IPartidaCtaCte): string | null {
  // Ya pagada desde el POS con la variante 3 (antes del 13-10-2026): sigue
  // abierta en SAP hasta que la compense el equipo SAP, pero no se puede volver a cobrar.
  if (p.pagoPendiente) return `Pagada (documento ${p.pagoPendiente}), pendiente de compensación`
  if (p.bloqueoPago) return `Bloqueo de pago (${p.bloqueoPago})`
  // ZCOOP_PAYMENT_SRV compensa el documento completo: el pago por cuota está pendiente.
  if (p.enCuotas) return 'Documento en cuotas: su pago está pendiente de definir'
  // Aplicar abonos al pago está pendiente de definir con Arquitectura.
  if (p.debeHaber === 'H' || p.monto < 0) return 'Abono: su aplicación al pago está pendiente de definir'
  return null
}

// Partida a pagar (clave SAP); el monto lo toma el backend desde SAP.
export interface IPartidaAPagar {
  documento: string
  posicion: string
  ejercicio: string
}

export interface IPagoCtaCteParams {
  cliente: string
  sucursal: string
  partidas: IPartidaAPagar[]
  montoRecibido?: number   // Efectivo recibido (CLP entero)
  saldoFavor?: boolean     // Escenario B: el excedente queda como saldo a favor (PK 15) en vez de vuelto
}

// POST /api/sap-cta-cte/pagos/preview — body sin contabilizar.
export interface IPreviewPagoCtaCte {
  success: boolean
  message?: string
  total?: number
  saldoFavor?: number       // Monto que queda a favor del cliente (escenario B); 0 = sin saldo a favor
  body?: Record<string, unknown>
  url?: string
}

// POST /api/sap-cta-cte/pagos — resultado del asiento en SAP.
export interface IResultadoPagoCtaCte {
  success: boolean
  message?: string
  acDocNo?: string          // N° documento contable creado en SAP
  refDocNo?: string         // Folio de cobro POS (CAJ-<sucursal>-<n>)
  saldoFavor?: number       // Saldo a favor contabilizado (escenario B)
  recuperado?: boolean      // Se cortó la conexión pero el pago sí quedó en SAP
  incierto?: boolean        // Se cortó la conexión y no se pudo confirmar
  data?: unknown            // Respuesta de SAP (d)
  body?: Record<string, unknown>
  url?: string
  errordetails?: { message: string; severity?: string }[]
  detalle?: unknown
}

// Caja > Home: partida de FAR_CUSTOMER_LINE_ITEMS con datos del cliente
// (GET /api/sap-cta-cte/documentos-home). Incluye partidas ya compensadas y CME.
export interface IDocumentoHomeSap extends IPartidaCtaCte {
  cliente: string               // Customer
  nombreCliente: string         // CustomerName
  rut: string                   // TaxID1 (ej. "76014354-5")
  fechaContabilizacion: string  // PostingDate YYYY-MM-DD
  compensada: boolean           // IsCleared 'X': ya pagada/compensada en SAP
  codigoCme: string             // SpecialGeneralLedgerCode ('' = partida normal)
}

export interface IDocumentosHomeResult {
  success: boolean
  message?: string
  detail?: string
  desde?: string
  hasta?: string
  total?: number
  truncado?: boolean           // SAP tenía más de 100 documentos en el rango
  pagoMultiple?: boolean
  data?: IDocumentoHomeSap[]
}

export interface IPartidasCtaCteResult {
  success: boolean
  message?: string
  total?: number
  truncado?: boolean
  pagoMultiple?: boolean       // true = se pueden pagar varias facturas en un cobro (parámetro PAGO_MULTIPLE)
  data?: IPartidaCtaCte[]
}
