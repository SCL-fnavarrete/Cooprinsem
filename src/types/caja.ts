import type { BELNR, BLART, KUNNR } from './sap'

export type EstadoPartida = 'ABIERTO' | 'VENCIDO' | 'PAGADO'
export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'pagada'

// Partida abierta del cliente (desde GET /api/partidas/:kunnr)
// Equivale a una línea FBL5N en SAP
// Documento del "Listado de Documentos" de Caja > Home (columnas del WebDynpro).
// Fuente pendiente de definir: por ahora el Home lo muestra vacío.
export interface IDocumentoCaja {
  id: string               // clave única del documento (selección / pago)
  kunnr: KUNNR
  estado: Semaforo
  tipoDocumento: string
  folio: string
  rut: string
  cliente: string          // nombre del cliente
  monedaDocumento: string
  montoDocumento: number   // CLP entero
  moneda: string
  monto: number            // CLP entero
  fecha: string            // YYYY-MM-DD
  bloqueoPago: string      // '' = autorizado
}

export interface IPartidaAbierta {
  belnr: BELNR            // número de documento contable
  kunnr: KUNNR
  nombreCliente?: string  // nombre del cliente (JOIN desde tabla clientes)
  vbeln?: string          // número de pedido vinculado (nullable)
  claseDoc: BLART         // clase_doc (FV=factura, NC=nota crédito)
  fechaDoc: string        // ISO date string (fecha_doc)
  fechaVenc: string       // ISO date string (fecha_venc)
  importe: number         // en CLP, entero
  estado: EstadoPartida
  diasMora: number        // días vencidos (0 si no vencida)
  semaforo: Semaforo      // 'verde'=vigente, 'amarillo'=vence ≤7d, 'rojo'=vencida
  etiqueta?: string       // Texto a mostrar en vez de belnr (partidas SAP: N° documento)
  motivoNoSeleccionable?: string  // Si viene, la partida no se puede seleccionar para pagar
}

// Request body para POST /api/cobros
export interface IPagoEfectivo {
  kunnr: KUNNR
  monto: number                 // monto total cobrado, en CLP
  montoRecibido: number         // monto que entregó el cliente (≥ monto)
  medio_pago: 'EFECTIVO'
  belnrs_cancelados: BELNR[]    // partidas que se cancelan
}

// Respuesta de POST /api/cobros → { d: { BELNR, BLART, BUKRS, monto, status } }
export interface IResultadoCobro {
  BELNR: BELNR
  BLART: 'W'
  BUKRS: 'COOP'
  monto: number
  status: 'OK'
}
