// Constantes SAP confirmadas con Cooprinsem — ver CLAUDE.md para parámetros pendientes

export const SAP_SOCIEDAD = 'COOP'
export const CLIENTE_BOLETA = '999999'
export const ALMACENES = ['B000', 'B001', 'B002', 'G000'] as const
export const CLASE_DOC_VENTA = 'ZPOS'
export const CLASE_DOC_COBRO = 'W'      // Recaudación de Caja
export const CLASE_DOC_ANTICIPO = 'DZ' // F-37 Anticipo
export const IVA = 0.19                 // 19% — nunca calcular en frontend, solo para display

export const CANALES_DISTRIBUCION = ['Venta Mesón', 'Venta Industrial'] as const
export const TIPOS_DOCUMENTO_VENTA = [
  'Venta Normal',
  'Venta Boleta',
  'V. Puesto Fundo',
  'V. Calzada',
  'Venta Anticipada',
] as const

// Roles SAP — Rol_Cod del maestro de usuarios
export const ROLES = {
  ADMINISTRADOR: 1, // Jefe de sucursal — acceso total
  VENTAS: 2,        // Vendedor — solo módulo Pedidos
  CAJA: 3,          // Cajero — solo módulo Caja
  CONSULTAS: 4,     // Solo lectura
  VISUALIZADOR: 5,  // Ve todo lo del Administrador, solo lectura (ADR-035)
} as const

// Sucursales conocidas — confirmar lista completa con Mariela
export const SUCURSALES = {
  D190: 'Osorno',
  D052: 'D052',
  D014: 'D014',
  D160: 'D160',
  D170: 'D170',
  D200: 'D200',
} as const

export type RolCod = (typeof ROLES)[keyof typeof ROLES]
export type Almacen = (typeof ALMACENES)[number]
export type CanalDistribucion = (typeof CANALES_DISTRIBUCION)[number]
export type TipoDocumentoVenta = (typeof TIPOS_DOCUMENTO_VENTA)[number]
export type CodigoSucursal = keyof typeof SUCURSALES

// Medios de pago de Caja (22-10-2026): cada uno captura sus datos en un popup.
// Solo EFECTIVO se envía a SAP; el resto se registra en pantalla hasta tener la
// API. Vale Vista queda deshabilitado (sin definición de campos).
import type { IMedioPago } from '@/types/pago'
export const MEDIOS_PAGO: IMedioPago[] = [
  { codigo: 'EFECTIVO', label: 'EFECTIVO', habilitado: true },
  { codigo: 'TARJETA_DEBITO', label: 'TARJETA DE DEBITO', habilitado: true },
  { codigo: 'TARJETA_CREDITO', label: 'TARJETA DE CREDITO', habilitado: true },
  { codigo: 'CHEQUE_DIA', label: 'CHEQUE AL DIA', habilitado: true },
  { codigo: 'CHEQUE_FECHA', label: 'CHEQUE A FECHA', habilitado: true },
  { codigo: 'VALE_VISTA', label: 'VALE VISTA', habilitado: false },
]

// Días para la "fecha máxima cheque" (cheque a fecha) si la condición de pago
// del cliente no trae días. PROVISORIO: el valor real es el parámetro
// DIAS_MAX_CHEQUE_FECHA de pos_parametro_general; este es el respaldo.
export const DIAS_MAX_CHEQUE_FECHA_DEFECTO = 30
