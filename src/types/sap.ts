// Aliases para campos SAP en notación ABAP
// Usados como tipos opacos para documentar el origen de cada campo

export type MATNR = string  // Número de material SAP (max 18 chars)
export type KUNNR = string  // Número de cliente/deudor SAP (max 10 chars)
export type VBELN = string  // Número de documento de venta SAP (max 10 chars)
export type BELNR = string  // Número de documento contable SAP (max 10 chars)
export type WERKS = string  // Centro SAP (ej: D190, D052)
export type LGORT = string  // Almacén SAP (B000, B001, B002, G000)
export type BLART = string  // Clase de documento (W, DZ, ZPOS, FV, NC...)
export type BUKRS = string  // Sociedad SAP (COOP)
export type WAERS = string  // Moneda (CLP)
