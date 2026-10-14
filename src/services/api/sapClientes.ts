import { API_BASE_URL } from './config';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Datos de un cliente tal como los devuelve el backend desde SAP API_BUSINESS_PARTNER.
 */
export interface SapClienteResult {
  BusinessPartner:         string;  // Número de cliente SAP
  BusinessPartnerFullName: string;  // Nombre completo
  BusinessPartnerName:     string;  // Nombre 1
  BusinessPartnerName2:    string;  // Nombre 2
  SearchTerm1:             string;  // Concepto búsqueda
  Industry:                string;  // Giro
  TaxNumber1:              string;  // RUT completo con guión (ej: 10009114-3)
}

/**
 * Parámetros para crear un cliente nuevo en SAP.
 */
export interface SapCrearClienteParams {
  tratamiento:      string;
  rut:              string;
  nombre:           string;
  nombre2?:         string;
  conceptoBusqueda: string;
  giro:             string;
  direccion:        string;
  region:           string;
  ciudad:           string;
  comuna:           string;
  zonaTransporte:   string;
  telefono?:        string;
  celular?:         string;
  fax?:             string;
  direccionPostal?: string;
  ciudadPostal?:    string;
  casilla?:         string;
  correoContacto?:  string;
  correoFactura?:   string;
}

/**
 * Respuesta del endpoint de búsqueda por número.
 */
interface BuscarPorNumeroResponse {
  success: boolean;
  data:    SapClienteResult;
}

/**
 * Respuesta del endpoint de búsqueda por RUT.
 */
interface BuscarPorRutResponse {
  success: boolean;
  total:   number;
  data:    SapClienteResult[];
}

/**
 * Respuesta del endpoint de creación.
 */
// Llamada a SAP hecha por el backend al crear el cliente (URL, JSON enviado y
// respuesta o error). La primera es la creación; las siguientes, datos de contacto.
export interface ILlamadaSapCliente {
  paso:       string;
  metodo:     'POST';
  url:        string;
  body:       unknown;
  ok:         boolean;
  status?:    number;
  respuesta?: unknown;
  error?:     unknown;
}

export interface IResultadoCrearCliente {
  success:          boolean;
  businessPartner?: string;
  message:          string;
  detail?:          string;
  llamadas:         ILlamadaSapCliente[];
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/**
 * Busca un cliente en SAP por su número de Business Partner.
 *
 * @param numero - Número de cliente SAP (ej: "1000000")
 * @returns Datos del cliente encontrado
 */
export async function buscarSapClientePorNumero(numero: string): Promise<SapClienteResult> {
  const params = new URLSearchParams({ numero });
  const response = await fetch(`${API_BASE_URL}/api/sap-clientes/buscar?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).message ?? `Error buscando cliente: ${response.status}`);
  }

  const json: BuscarPorNumeroResponse = await response.json();
  return json.data;
}

/**
 * Busca clientes en SAP por RUT (número de identificación fiscal).
 *
 * @param rut - RUT del cliente (ej: "12345678-9")
 * @returns Lista de clientes que coinciden con el RUT
 */
export async function buscarSapClientePorNombre(nombre: string): Promise<SapClienteResult[]> {
  const params = new URLSearchParams({ nombre });
  const response = await fetch(`${API_BASE_URL}/api/sap-clientes/buscar?${params}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).message ?? `Error buscando por nombre: ${response.status}`);
  }
  const json: { success: boolean; total: number; data: SapClienteResult[] } = await response.json();
  return json.data;
}
export async function buscarSapClientePorRut(rut: string): Promise<SapClienteResult[]> {
  const params = new URLSearchParams({ rut });
  const response = await fetch(`${API_BASE_URL}/api/sap-clientes/buscar?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).message ?? `Error buscando cliente por RUT: ${response.status}`);
  }

  const json: BuscarPorRutResponse = await response.json();
  return json.data;
}

/**
 * Crea un nuevo cliente en SAP a través del backend proxy.
 * El backend se encarga de obtener el token CSRF y enviar el POST a SAP.
 *
 * Nunca lanza por un rechazo de SAP: devuelve success:false con el mensaje y
 * las llamadas hechas (JSON enviado y error). Solo lanza por error de red.
 */
export async function crearSapCliente(params: SapCrearClienteParams): Promise<IResultadoCrearCliente> {
  const response = await fetch(`${API_BASE_URL}/api/sap-clientes`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params),
  });
  const json = await response.json().catch(() => ({})) as Partial<IResultadoCrearCliente>;

  return {
    success:         response.ok && json.success !== false,
    businessPartner: json.businessPartner,
    message:         json.message ?? `Error creando cliente: ${response.status}`,
    detail:          json.detail,
    llamadas:        json.llamadas ?? [],
  };
}

/**
 * Obtiene los datos completos de un cliente desde SAP para la pantalla Ficha.
 */
export async function obtenerFichaSap(bp: string): Promise<Record<string, any>> {
  const response = await fetch(`${API_BASE_URL}/api/sap-clientes/ficha/${encodeURIComponent(bp)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).message ?? `Error obteniendo ficha: ${response.status}`);
  }

  const json = await response.json();
  return json.data;
}