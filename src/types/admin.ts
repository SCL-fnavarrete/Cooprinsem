// Tipos del módulo Administración — gestión de usuarios, roles y sucursales

export interface IUsuarioAdmin {
  id: string
  username: string        // ej: "vendedor"
  rut: string             // ej: "12.345.678-9"
  nombreCompleto: string
  email: string
  rolCod: 1 | 2 | 3 | 4
  rolNombre: string       // "Ventas" | "Caja" | "Consultas"
  sucursalId: string      // ej: "D190"
  sucursalNombre: string
  estado: 1 | 2           // 1=Activo, 2=Inactivo
  idVendedor?: string     // Id vendedor SAP — numérico, 3-15 dígitos, único
}

export interface ICreateUsuarioRequest {
  username: string
  password: string
  rut?: string
  nombreCompleto: string
  email: string
  rolCod: 1 | 2 | 3 | 4
  sucursalId: string
  estado: 1 | 2
  idVendedor?: string
}

export interface IUpdateUsuarioRequest {
  rut?: string
  nombreCompleto?: string
  email?: string
  rolCod?: 1 | 2 | 3 | 4
  sucursalId?: string
  estado?: 1 | 2
  idVendedor?: string
}

export interface IRol {
  codigo: 1 | 2 | 3 | 4
  nombre: string
  descripcion: string
  accesoAdmin: boolean
  accesoPedidos: boolean
  accesoCaja: boolean
}

export interface ISucursal {
  codigo: string        // "D190"
  nombre: string        // "Osorno"
  sociedad: string      // "COOP"
  oficinaVentas: string
}
