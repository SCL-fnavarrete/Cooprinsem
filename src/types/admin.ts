// Tipos del módulo Administración — gestión de usuarios, roles y sucursales

export interface IUsuarioAdmin {
  id: string
  username: string        // ej: "vendedor"
  nombreCompleto: string
  email: string
  rolCod: 1 | 2 | 3 | 4
  rolNombre: string       // "Ventas" | "Caja" | "Consultas"
  sucursalId: string      // ej: "D190"
  sucursalNombre: string
  estado: 1 | 2           // 1=Activo, 2=Inactivo
}

export interface ICreateUsuarioRequest {
  username: string
  password: string
  nombreCompleto: string
  email: string
  rolCod: 1 | 2 | 3 | 4
  sucursalId: string
  estado: 1 | 2
}

export interface IUpdateUsuarioRequest {
  nombreCompleto?: string
  email?: string
  rolCod?: 1 | 2 | 3 | 4
  sucursalId?: string
  estado?: 1 | 2
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
