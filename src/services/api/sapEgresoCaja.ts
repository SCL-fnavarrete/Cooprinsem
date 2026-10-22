import { API_BASE_URL } from './config'

export interface IPartidaAbiertaSap {
  Customer: string
  CompanyCode: string
  FiscalYear: string
  AccountingDocument: string
  AccountingDocumentItem: string
  AccountingDocumentType: string
  AmountInTransactionCurrency: string
  TransactionCurrency: string
  NetDueDate: string
  DocumentDate: string
  ClearingDate: string | null
}

export interface IEgresoContabilizado {
  CompanyCode: string
  FiscalYear: string
  AccountingDocument: string
  DocumentType: string
  DocumentHeaderText: string
  CreatedByUser: string
}

export async function getPartidasAbiertasSap(customer: string): Promise<IPartidaAbiertaSap[]> {
  const res = await fetch(`${API_BASE_URL}/api/sap-egreso/partidas-abiertas?customer=${encodeURIComponent(customer)}`)
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const json = await res.json()
  return json.d.results
}

export async function contabilizarEgreso(payload: {
  companyCode: string
  documentType: string
  documentDate: string
  postingDate: string
  headerText: string
  referenceDocument: string
  lineaCme: {
    customer: string
    specialGLCode: string
    amount: number
    currency: string
    text: string
  }
  lineaCompensacion: {
    customer: string
    amount: number
    currency: string
    text: string
    referenceDocument: string
    fiscalYear: string
    companyCode: string
    lineItem: string
  }
}): Promise<IEgresoContabilizado> {
  const res = await fetch(`${API_BASE_URL}/api/sap-egreso/contabilizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || `Error: ${res.status}`)
  return json.data
}

export async function getComprobante(companyCode: string, fiscalYear: string, document: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/sap-egreso/comprobante?companyCode=${companyCode}&fiscalYear=${fiscalYear}&document=${document}`)
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  const json = await res.json()
  return json.d
}