export interface IInterfaz {
  id: string
  fechaInicio: string | null
  tipo: number | null
  nombre: string | null
  fechaTermino: string | null
  cantActualiza: number | null
  estado: string | null
  observacion: string | null
}

export interface ISapBanco {
  id: number
  BankCountry: string
  BankKey: string
  BankName: string
  Region: string
  City: string
  SwiftCode: string
  BankCountryName: string
}

export interface ISapCentro {
  id: number
  Plant: string
  PlantName: string
  SalesOrganization: string
  Language: string
  IsMarkedForArchiving: boolean
}

export interface ISapCentroCosto {
  id: number
  ControllingArea: string
  CostCenter: string
  CostCenterCategory: string
  IsBlocked: boolean
  CompanyCode: string
  Department: string
  Country: string
}

export interface ISapSociedad {
  id: number
  CompanyCode: string
  CompanyCodeName: string
  CityName: string
  Country: string
  Currency: string
  Language: string
  ControllingArea: string
}

// Perfil organizacional SAP por rol (tabla Perfiles_usuarios).
export interface ISapPerfilUsuario {
  id: number
  IdRol: string       // Nombre del perfil, ej. "CAJA_OSORNO D190"
  Vkorg: string       // Organización de ventas
  Vtweg: string       // Canal de distribución (VM mesón, VT terreno, VS)
  Spart: string       // Sector
  Vkbur: string       // Oficina de ventas
  Vkgrp: string       // Grupo de vendedores
  Werks: string       // Centro
  Lgort: string       // Almacén
  Bukrs: string       // Sociedad
  Kkber: string       // Área de control de crédito
  CierreCaja: string  // 'X' = marca de cierre de caja
}

// Usuario POS mantenido en SAP (tabla Usuarios_pos, solo lectura).
// Se vincula con su perfil por IdRol y con el usuario del POS por
// username = IdUsuario.
export interface ISapUsuarioPos {
  id: number
  IdUsuario: string      // Usuario SAP, ej. "DVIANA"
  Nombre: string
  IdRol: string          // Perfil (Perfiles_usuarios.IdRol)
  IdVendedor: string     // Id vendedor SAP; '00000000' = sin vendedor (cajeros)
  Kunnr: string          // Cliente CME del cajero (vacío en vendedores)
  TipoUsuario: string    // FI = Caja, CO = Ventas (confirmado por SAP)
  BloqPedido: string
  BloqEntrega: string
  BloqEntregaBc: string
  CiaSeguro: string
  VendTerreno: string
  ModPrecio: string
  PerfilVkorg: string
  PerfilVtweg: string
  PerfilSpart: string
  PerfilVkbur: string
  PerfilVkgrp: string
  PerfilWerks: string
  PerfilLgort: string
  PerfilBukrs: string
  PerfilKkber: string
  PerfilCierreCaja: string
  enPos: boolean         // Ya existe un usuario del POS con ese username
}

// ─── Impresoras y vendedores (sync de Arquitectura SAP, 13-10-2026, solo lectura) ──
// Nombres de campo SAP; su significado exacto está pendiente de confirmar con Arquitectura.

// Impresoras por sociedad / oficina de ventas (tabla Sap_impresora_config).
export interface ISapImpresoraConfig {
  id: number
  Bukrs: string          // Sociedad
  Uname: string          // Usuario SAP ('' = aplica a toda la oficina)
  Vkbur: string          // Oficina de ventas
  ImpCopago: string      // Impresora de copago
  CopagoActivo: boolean
  ImpCtaCte: string      // Impresora de cuenta corriente
  ImpCotizacion: string  // Impresora de cotización
}

// Usuario SAP → código de vendedor (tabla Sap_usuario_vendedor).
export interface ISapUsuarioVendedor {
  id: number
  Bname: string                 // Usuario SAP
  Zvendedor: string             // Código de vendedor
  idVendedorPos: string | null  // IdVendedor del mismo usuario en Usuarios_pos (null = no está)
  difiere: boolean              // El código no coincide con Usuarios_pos (sin ceros a la izquierda)
}

// Impresora de red por usuario, centro y clase de mensaje (tabla Sap_usuario_impresora).
export interface ISapUsuarioImpresora {
  id: number
  Bname: string  // Usuario SAP
  Werks: string  // Centro
  Kschl: string  // Clase de mensaje (ZFE2, ZGN1, ZBO2, ZNC2…)
  Zip: string    // Ruta de la impresora de red (ej. \\64.23.33.30\CHNGDDSUC)
}

export interface ISapUsuarioImpresoraResult {
  results: ISapUsuarioImpresora[]
  truncado: boolean  // Hay más filas que el máximo: acotar con la búsqueda
  maximo: number
}

export interface ISapRegion {
  id: number
  Codigo: string
  Descripcion: string
}