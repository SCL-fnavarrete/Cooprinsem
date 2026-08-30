const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface IDocumentoVenta {
  id: number
  org_ventas: string
  canal_distribucion: string
  sector: string
  clase_documento: string
  descripcion: string
  tipo_documento: string
  tipo_documento_desc: string
  api_relacionada: string
}

export interface IOficinaVenta {
  id: number
  org_ventas: string
  canal_distribucion: string
  sector: string
  codigo: string
  nombre: string
}

export interface ICentroSuministrador {
  id: number
  org_ventas: string
  canal_distribucion: string
  sector: string
  codigo: string
  nombre: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS DE VENTA
// ═══════════════════════════════════════════════════════════════════════════════

export async function getDocumentosVenta(): Promise<IDocumentoVenta[]> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/documentos-venta`)
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const json = await res.json()
  return json.data
}

export async function createDocumentoVenta(data: Partial<IDocumentoVenta>): Promise<IDocumentoVenta> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/documentos-venta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data
}

export async function updateDocumentoVenta(id: number, data: Partial<IDocumentoVenta>): Promise<IDocumentoVenta> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/documentos-venta/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data
}

export async function deleteDocumentoVenta(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/documentos-venta/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFICINAS DE VENTAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getOficinasVenta(): Promise<IOficinaVenta[]> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/oficinas-venta`)
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const json = await res.json()
  return json.data
}

export async function createOficinaVenta(data: Partial<IOficinaVenta>): Promise<IOficinaVenta> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/oficinas-venta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data
}

export async function updateOficinaVenta(id: number, data: Partial<IOficinaVenta>): Promise<IOficinaVenta> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/oficinas-venta/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data
}

export async function deleteOficinaVenta(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/oficinas-venta/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// CENTROS SUMINISTRADOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCentrosSuministrador(): Promise<ICentroSuministrador[]> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/centros-suministrador`)
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const json = await res.json()
  return json.data
}

export async function createCentroSuministrador(data: Partial<ICentroSuministrador>): Promise<ICentroSuministrador> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/centros-suministrador`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data
}

export async function updateCentroSuministrador(id: number, data: Partial<ICentroSuministrador>): Promise<ICentroSuministrador> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/centros-suministrador/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data
}

export async function deleteCentroSuministrador(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/centros-suministrador/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANAL DISTRIBUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export interface ICanalDistribucion {
  id: number
  codigo: string
  descripcion: string
}

export async function getCanalesDistribucion(): Promise<ICanalDistribucion[]> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/canales-distribucion`)
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const json = await res.json()
  return json.data
}

export async function createCanalDistribucion(data: Partial<ICanalDistribucion>): Promise<ICanalDistribucion> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/canales-distribucion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data
}

export async function updateCanalDistribucion(id: number, data: Partial<ICanalDistribucion>): Promise<ICanalDistribucion> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/canales-distribucion/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${res.status}`)
  }
  const json = await res.json()
  return json.data
}

export async function deleteCanalDistribucion(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/pos-maestros/canales-distribucion/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERLOCUTORES (Sap_clientes_interlocutor)
// ═══════════════════════════════════════════════════════════════════════════════

export interface IInterlocutor {
  id: number
  Customer: string
  SalesOrganization: string
  DistributionChannel: string
  Division: string
  PartnerCounter: string
  PartnerFunction: string
  BPCustomerNumber: string
  CustomerPartnerDescription: string
  DefaultPartner: boolean
}

export async function getInterlocutoresPorCliente(customer: string): Promise<IInterlocutor[]> {
  const res = await fetch(`${API_BASE_URL}/api/sap-maestro/interlocutores?customer=${encodeURIComponent(customer)}`)
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const json = await res.json()
  return json.d.results
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRUPO CUENTA (MS-07)
// ═══════════════════════════════════════════════════════════════════════════════

export interface IGrupoCuenta { id: number; codigo: string; descripcion: string }
export async function getGruposCuenta(): Promise<IGrupoCuenta[]> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/grupos-cuenta`); const j = await r.json(); return j.data }
export async function createGrupoCuenta(d: Omit<IGrupoCuenta, 'id'>): Promise<IGrupoCuenta> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/grupos-cuenta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); return j.data }
export async function updateGrupoCuenta(id: number, d: Omit<IGrupoCuenta, 'id'>): Promise<IGrupoCuenta> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/grupos-cuenta/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); return j.data }
export async function deleteGrupoCuenta(id: number): Promise<void> { await fetch(`${API_BASE_URL}/api/pos-maestros/grupos-cuenta/${id}`, { method: 'DELETE' }) }

// ═══════════════════════════════════════════════════════════════════════════════
// CLASE INTERLOCUTOR (MS-08)
// ═══════════════════════════════════════════════════════════════════════════════

export interface IClaseInterlocutor { id: number; codigo: string; descripcion: string }
export async function getClasesInterlocutor(): Promise<IClaseInterlocutor[]> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/clases-interlocutor`); const j = await r.json(); return j.data }
export async function createClaseInterlocutor(d: Omit<IClaseInterlocutor, 'id'>): Promise<IClaseInterlocutor> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/clases-interlocutor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); return j.data }
export async function updateClaseInterlocutor(id: number, d: Omit<IClaseInterlocutor, 'id'>): Promise<IClaseInterlocutor> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/clases-interlocutor/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); return j.data }
export async function deleteClaseInterlocutor(id: number): Promise<void> { await fetch(`${API_BASE_URL}/api/pos-maestros/clases-interlocutor/${id}`, { method: 'DELETE' }) }

// ═══════════════════════════════════════════════════════════════════════════════
// CONDICIÓN DE EXPEDICIÓN (MS-09)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ICondicionExpedicion { id: number; codigo: string; descripcion: string }
export async function getCondicionesExpedicion(): Promise<ICondicionExpedicion[]> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/condiciones-expedicion`); const j = await r.json(); return j.data }
export async function createCondicionExpedicion(d: Omit<ICondicionExpedicion, 'id'>): Promise<ICondicionExpedicion> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/condiciones-expedicion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); return j.data }
export async function updateCondicionExpedicion(id: number, d: Omit<ICondicionExpedicion, 'id'>): Promise<ICondicionExpedicion> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/condiciones-expedicion/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); return j.data }
export async function deleteCondicionExpedicion(id: number): Promise<void> { await fetch(`${API_BASE_URL}/api/pos-maestros/condiciones-expedicion/${id}`, { method: 'DELETE' }) }

// ═══════════════════════════════════════════════════════════════════════════════
// CONDICIÓN DE PAGO (MS-10)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ICondicionPago { id: number; codigo: string; descripcion: string }
export async function getCondicionesPago(): Promise<ICondicionPago[]> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/condiciones-pago`); const j = await r.json(); return j.data }
export async function createCondicionPago(d: Omit<ICondicionPago, 'id'>): Promise<ICondicionPago> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/condiciones-pago`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); return j.data }
export async function updateCondicionPago(id: number, d: Omit<ICondicionPago, 'id'>): Promise<ICondicionPago> { const r = await fetch(`${API_BASE_URL}/api/pos-maestros/condiciones-pago/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); return j.data }
export async function deleteCondicionPago(id: number): Promise<void> { await fetch(`${API_BASE_URL}/api/pos-maestros/condiciones-pago/${id}`, { method: 'DELETE' }) }

// ═══════════════════════════════════════════════════════════════════════════════
// PARÁMETROS GENERALES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IParametroGeneral {
  id: number
  clave: string
  valor: string
  descripcion: string
}

export async function getParametros(): Promise<IParametroGeneral[]> {
  const r = await fetch(`${API_BASE_URL}/api/pos-maestros/parametros`)
  if (!r.ok) throw new Error(`Error: ${r.status}`)
  const j = await r.json()
  return j.data
}

export async function updateParametro(clave: string, valor: string): Promise<IParametroGeneral> {
  const r = await fetch(`${API_BASE_URL}/api/pos-maestros/parametros/${clave}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${r.status}`)
  }
  const j = await r.json()
  return j.data
}


// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTES LOCALES (SQLite)
// ═══════════════════════════════════════════════════════════════════════════════

export interface IClienteLocal {
  kunnr: string
  nombre: string
  rut: string
  sucursal: string
  fecha_actualizacion: string
}

export async function getClientesLocal(): Promise<{ data: IClienteLocal[]; total: number }> {
  const r = await fetch(`${API_BASE_URL}/api/pos-maestros/clientes-local`)
  if (!r.ok) throw new Error(`Error: ${r.status}`)
  const j = await r.json()
  return { data: j.data, total: j.total }
}

export async function limpiarClientesLocal(): Promise<string> {
  const r = await fetch(`${API_BASE_URL}/api/pos-maestros/clientes-local`, { method: 'DELETE' })
  if (!r.ok) throw new Error(`Error: ${r.status}`)
  const j = await r.json()
  return j.message
}

export async function recargarClientesLocal(): Promise<{ message: string; total: number }> {
  const r = await fetch(`${API_BASE_URL}/api/pos-maestros/clientes-local/recargar`, { method: 'POST' })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.message ?? `Error: ${r.status}`)
  }
  const j = await r.json()
  return { message: j.message, total: j.total }
}