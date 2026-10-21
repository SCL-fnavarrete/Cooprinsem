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
  pagoParcial?: boolean    // Pago residual: paga menos que el saldo de UNA factura (claves 09 + 04)
  usuario?: string         // Cajero logueado: su cliente CME (Usuarios_pos.Kunnr) va en la clave 09
}

// POST /api/sap-cta-cte/pagos/preview — body sin contabilizar.
export interface IPreviewPagoCtaCte {
  success: boolean
  message?: string
  total?: number
  saldoFavor?: number       // Monto que queda a favor del cliente (escenario B); 0 = sin saldo a favor
  pagoParcial?: boolean     // Pago residual
  montoCobrado?: number     // Pago residual: monto que se cobra
  saldoPendiente?: number   // Pago residual: lo que queda pendiente de la factura
  habilitado?: boolean      // Pago residual / anticipo: false = parámetro en N (no se enviará a SAP)
  anticipo?: boolean        // Pago de una solicitud de anticipo (Ant. Cliente)
  solicitud?: ISolicitudAnticipo
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
  pagoParcial?: boolean     // Pago residual
  saldoPendiente?: number   // Pago residual: lo que queda pendiente de la factura
  soloJson?: boolean        // Pago residual / anticipo con el parámetro en N: no se envió a SAP
  anticipo?: boolean        // Pago de una solicitud de anticipo (Ant. Cliente)
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
  sucursal?: string            // Sucursal consultada (BusinessPlace)
  top?: number                 // Máximo de documentos que pide el backend (500)
  truncado?: boolean           // SAP tenía más de `top` documentos en el rango
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

// Caja > Ant. Cliente: solicitud de anticipo creada en SAP con F-37 (clave 09,
// CME F). GET /api/sap-cta-cte/anticipos/solicitud(es).
export interface ISolicitudAnticipo {
  cliente: string               // Customer (10 dígitos)
  documento: string             // AccountingDocument
  posicion: string              // AccountingDocumentItem
  ejercicio: string             // FiscalYear
  monto: number                 // CLP entero
  moneda: string
  fechaDocumento: string        // YYYY-MM-DD
  fechaContabilizacion: string  // YYYY-MM-DD
  fechaVencimiento: string      // YYYY-MM-DD
  asignacion: string            // AssignmentReference
  texto: string                 // DocumentItemText
  referencia: string            // DocumentReferenceID
  sucursal: string              // BusinessPlace
  codigoCme: string             // 'F' = solicitud de anticipo
  compensada: boolean
}

export interface ISolicitudesAnticipoResult {
  success: boolean
  message?: string
  detail?: string
  total?: number
  data?: ISolicitudAnticipo[]
}

export interface ISolicitudAnticipoResult {
  success: boolean
  message?: string
  detail?: string
  data?: ISolicitudAnticipo
}

// POST /api/sap-cta-cte/anticipos/preview y /pagos: el monto lo toma el backend de SAP.
export interface IPagoAnticipoParams {
  cliente: string
  documento: string
  ejercicio: string
  sucursal: string
  usuario?: string   // Cajero logueado: su cliente CME va en la clave 09
}
