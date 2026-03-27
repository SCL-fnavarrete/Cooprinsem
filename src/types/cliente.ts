import type { KUNNR } from './sap'
import type { EstadoCreditoValor } from './credito'

// Cliente completo (desde GET /api/clientes/:kunnr)
export interface ICliente {
  codigoCliente: KUNNR       // kunnr
  nombre: string             // nombre (Nombre 1)
  rut: string                // rut (formato "12.345.678-9" o "" para boleta)
  condicionPago: string      // condicion_pago (CONT, 30D, 60D)
  estadoCredito: EstadoCreditoValor   // estado_credito
  creditoAsignado: number    // credito_asignado en CLP
  creditoUtilizado: number   // credito_utilizado en CLP
  porcentajeAgotamiento: number       // calculado en backend
  sucursal: string           // ej: D190

  // Datos generales (SAP maestro deudor)
  tratamiento?: string       // "Señor", "Señora"
  nombre2?: string           // Segundo nombre/apellido
  conceptoBusqueda?: string  // Código búsqueda rápida
  giro?: string              // Ej: "AGRICOLA"
  direccion?: string         // Dirección calle
  region?: string            // Ej: "X- De los Lagos"
  ciudad?: string            // Ej: "Purranque"
  comuna?: string            // Ej: "Purranque"
  zonaTransporte?: string    // Ej: "TIENDA"
  telefono?: string
  celular?: string
  fax?: string
  direccionPostal?: string
  ciudadPostal?: string
  casilla?: string
  correoContacto?: string
  correoFactura?: string

  // Ficha (SAP FD32)
  razonSocial?: string
  clasificacionComercial?: string
  representanteLegal?: string
  seguro?: string
  grupoControlCredito?: string
}

// Resultado de búsqueda (desde GET /api/clientes?search=)
// Mismo shape que ICliente — el backend retorna todos los campos
export type IClienteBusqueda = ICliente

// Tipo para crear cliente (campos obligatorios marcados con * en SAP)
export interface ICrearCliente {
  tratamiento: string        // * obligatorio (Select: Señor/Señora)
  rut: string                // * obligatorio
  nombre: string             // * obligatorio (Nombre 1)
  nombre2?: string           // opcional
  conceptoBusqueda: string   // * obligatorio
  giro: string               // * obligatorio
  direccion: string          // * obligatorio
  region: string             // * obligatorio (Select)
  ciudad: string             // * obligatorio (Select)
  comuna: string             // * obligatorio (Select)
  zonaTransporte: string     // * obligatorio (default "TIENDA")
  telefono?: string
  celular?: string
  fax?: string
  direccionPostal?: string
  ciudadPostal?: string
  casilla?: string
  correoContacto?: string
  correoFactura?: string
}
