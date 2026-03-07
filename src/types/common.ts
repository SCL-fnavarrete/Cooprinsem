import type { RolCod } from '@/config/sap'

export interface IUsuario {
  id: string          // nombre de usuario SAP (login)
  nombre: string      // nombre completo
  rolCod: RolCod      // 1=Admin, 2=Ventas, 3=Caja, 4=Consultas
  sucursal: string    // código centro activo (ej: D190)
}

// Envelope de respuesta del backend POC (imita estructura SAP OData d.results)
export interface IApiResponse<T> {
  d: {
    results: T[]
  }
}

export interface IApiResponseSingle<T> {
  d: T
}

// Error SAP OData — el backend retorna { error: string } pero SAP real usa esta estructura
export interface ISapODataError {
  error: {
    code: string
    message: {
      lang: string
      value: string
    }
    innererror?: {
      errordetails: Array<{
        code: string
        message: string
        severity: 'error' | 'warning' | 'info'
      }>
    }
  }
}
