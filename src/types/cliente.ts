import type { KUNNR } from './sap'
import type { EstadoCreditoValor } from './credito'

// Cliente completo (desde GET /api/clientes/:kunnr)
export interface ICliente {
  codigoCliente: KUNNR       // kunnr
  nombre: string             // nombre
  rut: string                // rut (formato "12.345.678-9" o "" para boleta)
  condicionPago: string      // condicion_pago (CONT, 30D, 60D)
  estadoCredito: EstadoCreditoValor   // estado_credito
  creditoAsignado: number    // credito_asignado en CLP
  creditoUtilizado: number   // credito_utilizado en CLP
  porcentajeAgotamiento: number       // calculado en backend
  sucursal: string           // ej: D190
}

// Resultado de búsqueda (desde GET /api/clientes?search=)
// Mismo shape que ICliente — el backend retorna todos los campos
export type IClienteBusqueda = ICliente
