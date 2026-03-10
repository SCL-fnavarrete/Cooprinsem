// Tipos del módulo Arqueo de Caja — PRD_CAJA_ARQUEO.md

export type EstadoArqueo = 'EN_CURSO' | 'GRABADO'
export type EstadoCierre = 'BORRADOR' | 'DEFINITIVO'
export type TipoPagoCodigo = 'EF' | 'TC' | 'TD' | 'CH' | 'SF'

export interface ITipoPago {
  codigo: TipoPagoCodigo
  denominacion: string
}

export interface IArqueoDetalle {
  tipoPagoCodigo: TipoPagoCodigo
  tipoPagoDenominacion: string
  monto: number       // CLP entero, sin decimales
  moneda: string      // 'CLP'
}

export interface IArqueoCaja {
  id: string
  fechaCaja: string   // DD/MM/YYYY
  sucursalId: string
  cajeroId: string
  estado: EstadoArqueo
  montoTotal: number
  detalles: IArqueoDetalle[]
  fechaGrabado?: string
}

export interface ICierreDetalle {
  tipoPagoCodigo: TipoPagoCodigo
  denominacion: string
  montoArqueo: number       // declarado por cajero
  montoRecaudado: number    // registrado por sistema POS
  diferencia: number        // montoArqueo - montoRecaudado (RN-09)
  moneda: string
}

export interface ICierreCaja {
  id: string
  arqueoId: string
  fechaCaja: string
  sucursalId: string
  cajeroId: string
  jefeAdminId?: string
  estado: EstadoCierre
  detalles: ICierreDetalle[]
  fechaCierre?: string
}

// Catálogo de tipos de pago — maestro configurable en SAP (S-01)
export const TIPOS_PAGO: ITipoPago[] = [
  { codigo: 'EF', denominacion: 'EFECTIVO' },
  { codigo: 'TC', denominacion: 'TARJETA DE CRÉDITO' },
  { codigo: 'TD', denominacion: 'TARJETA DE DÉBITO' },
  { codigo: 'CH', denominacion: 'CHEQUE AL DÍA' },
  { codigo: 'SF', denominacion: 'SALDO A FAVOR' },
]
