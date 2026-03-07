// Estado crediticio del cliente — fuente: backend GET /api/clientes/:kunnr
// En SAP real: maestro deudor FD32 + control de crédito

export type EstadoCreditoValor = 'BLOQUEADO' | 'AL_DIA' | 'CON_DEUDA'

export interface IEstadoCredito {
  estado: EstadoCreditoValor
  creditoAsignado: number   // en CLP, entero
  creditoUtilizado: number  // en CLP, entero
  porcentajeAgotamiento: number // 0-100, calculado: utilizado/asignado*100
}
