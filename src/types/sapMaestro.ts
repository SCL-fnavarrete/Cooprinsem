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

export interface ISapRegion {
  id: number
  Codigo: string
  Descripcion: string
}