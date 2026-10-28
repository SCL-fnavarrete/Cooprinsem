import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';
import { fragmentosBusqueda, filtroNombreSap, calzaEnOrden, LIMITE_SAP_DEFECTO } from './buscadorClientes';
import {
  construirBodyCrearCliente, construirBodyCrearDestinatario, construirBodyCrearPersonaRetira,
  construirBodyContactoCliente, construirBodyFuncionInterlocutor, rutaFuncionesInterlocutor,
  siguienteContador, yaVinculado, retiraComoCliente,
  type IDestinatarioSap, type IPersonaRetiraSap, type IFuncionInterlocutor, type IFilaFuncionSap, type IAreaVentas,
} from './sapClienteBody';
import { PARAMETROS_CREACION_BP, completarParametrosCreacionBp, type ParametrosCreacionBp } from './parametrosCreacionBp';
import { prisma } from '../lib/prisma';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Datos de un cliente tal como los devuelve SAP desde A_BusinessPartner.
 */
export interface SapCliente {
  BusinessPartner: string;
  BusinessPartnerFullName: string;
  BusinessPartnerName: string;
  BusinessPartnerName2: string;
  SearchTerm1: string;
  SearchTerm2: string;
  BusinessPartnerGrouping: string;
  Industry: string;
  TaxNumber1: string;  // RUT completo con guión (ej: 10009114-3)
}

/**
 * Datos de dirección de un cliente desde A_BusinessPartnerAddress.
 */
export interface SapDireccionCliente {
  BusinessPartner: string;
  AddressID: string;
  StreetName: string;   // Dirección
  CityName: string;   // Ciudad
  Region: string;   // Región (código)
  PostalCode: string;   // Código postal
  Country: string;   // País
  PhoneNumber: string;   // Teléfono
  MobilePhoneNumber: string;  // Celular
  FaxNumber: string;   // Fax
  EmailAddress: string;   // Correo
}

/**
 * Campos para crear un cliente nuevo en SAP.
 */
export interface SapCrearClienteParams {
  tipoSocio: string;     // Tipo socio (1=Persona, 2=Organización)
  tratamiento: string;   // Tratamiento
  rut: string;
  nombre: string;
  nombre2?: string;
  conceptoBusqueda: string;
  giro: string;
  direccion: string;
  region: string;
  ciudad: string;
  comuna: string;
  zonaTransporte: string;
  telefono?: string;
  celular?: string;
  fax?: string;
  direccionPostal?: string;
  ciudadPostal?: string;
  casilla?: string;
  correoContacto?: string;
  correoFactura?: string;
}

// ─── Agente HTTPS ─────────────────────────────────────────────────────────────

/**
 * Agente que permite certificados autofirmados.
 * Necesario en entornos SAP S/4HANA private on-premise.
 */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Cliente Axios base ───────────────────────────────────────────────────────

/**
 * Crea una instancia de axios configurada con las credenciales SAP.
 * Se instancia en cada llamada para leer siempre las variables de entorno actuales.
 */
async function crearClienteAxios(): Promise<AxiosInstance> {
  const { SAP_BASE_URL, SAP_USER, SAP_PASSWORD } = process.env;

  if (!SAP_BASE_URL || !SAP_USER || !SAP_PASSWORD) {
    throw new Error('Faltan variables de entorno SAP (SAP_BASE_URL, SAP_USER, SAP_PASSWORD)');
  }

  // Extraer la URL base sin el path de API_MATERIAL_STOCK_SRV
  const sapHost = SAP_BASE_URL.replace('/API_MATERIAL_STOCK_SRV', '');
  const credenciales = Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64');

  return axios.create({
    baseURL: `${sapHost}/API_BUSINESS_PARTNER`,
    httpsAgent,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'sap-client': await getMandante(),
      'Accept-Language': 'es',
      'sap-language': 'ES',
      Authorization: `Basic ${credenciales}`,
    },
  });
}

// ─── Funciones principales ────────────────────────────────────────────────────

/**
 * Busca un cliente en SAP por su número de Business Partner.
 *
 * @param numeroCliente - Número de cliente SAP (ej: "1000000")
 * @returns Datos del cliente encontrado
 */
export async function buscarClientePorNumero(numeroCliente: string): Promise<SapCliente> {
  const cliente = await crearClienteAxios();

  const response = await cliente.get(
    `/A_BusinessPartner('${numeroCliente}')`,
    { params: { $format: 'json', $expand: 'to_BusinessPartnerAddress' } }
  );

  console.log('[buscarClientePorNumero] FormOfAddress:', response.data?.d?.FormOfAddress, '| SearchTerm2:', response.data?.d?.SearchTerm2);
  return response.data?.d as SapCliente;
}

/**
 * ¿Existe el Business Partner en SAP? 404 = no existe; cualquier otro error se
 * relanza (no se puede asumir que el número está libre).
 */
export async function existeBusinessPartner(numero: string): Promise<boolean> {
  const cliente = await crearClienteAxios();
  try {
    await cliente.get(`/A_BusinessPartner('${numero}')`, { params: { $format: 'json', $select: 'BusinessPartner' } });
    return true;
  } catch (error: any) {
    if (error?.response?.status === 404) return false;
    throw error;
  }
}

/**
 * Busca un cliente en SAP por su RUT
 *
 * @param rut - RUT del cliente (ej: "12345678-9")
 * @returns Lista de clientes que coinciden con el RUT
 */
/**
 * Busca clientes en SAP por nombre (parcial, sin distinguir mayúsculas). "*" =
 * comodín respetando el orden (ver buscadorClientes.ts). Pide un registro más
 * que el límite para saber si hay más resultados.
 */
export async function buscarClientePorNombre(nombre: string, limite = LIMITE_SAP_DEFECTO): Promise<{ clientes: SapCliente[]; hayMas: boolean }> {
  const fragmentos = fragmentosBusqueda(nombre);
  if (fragmentos.length === 0) return { clientes: [], hayMas: false };
  const cliente = await crearClienteAxios();

  const response = await cliente.get('/A_BusinessPartner', {
    params: {
      $filter: filtroNombreSap(fragmentos),
      $top: String(limite + 1),
      $format: 'json',
    },
  });

  const todos: SapCliente[] = response.data?.d?.results ?? [];
  const clientes = todos.slice(0, limite).filter((c) =>
    calzaEnOrden(c.BusinessPartnerName ?? '', fragmentos) || calzaEnOrden(c.BusinessPartnerFullName ?? '', fragmentos));
  return { clientes, hayMas: todos.length > limite };
}
export async function buscarClientePorRut(rut: string): Promise<SapCliente[]> {
  const cliente = await crearClienteAxios();

  // Primero buscar el BusinessPartner por RUT en la entidad de impuestos
  const responseTax = await cliente.get('/A_BusinessPartnerTaxNumber', {
    params: {
      $filter: `BPTaxNumber eq '${rut}'`,
      $format: 'json',
    },
  });

  const resultadosImpuesto = responseTax.data?.d?.results ?? [];

  if (resultadosImpuesto.length === 0) {
    return [];
  }

  // Con los BusinessPartner encontrados, obtener sus datos completos
  const clientes: SapCliente[] = [];
  for (const item of resultadosImpuesto) {
    try {
      const bp = await buscarClientePorNumero(item.BusinessPartner);
      clientes.push(bp);
    } catch {
      // Si un BP no se puede obtener, continuamos con los demás
    }
  }

  return clientes;
}

/**
 * Obtiene el token CSRF necesario para operaciones de escritura en SAP OData.
 * SAP requiere este token antes de cualquier POST, PUT o DELETE.
 *
 * @returns Token CSRF y cookies de sesión
 */
export async function obtenerCsrfToken(): Promise<{ token: string; cookies: string }> {
  const cliente = await crearClienteAxios();

  const response = await cliente.get('/', {
    params: { $format: 'json' },
    headers: { 'X-CSRF-Token': 'Fetch', 'Accept': '*/*' },
  });

  const token = response.headers['x-csrf-token'] as string;
  const cookies = (response.headers['set-cookie'] ?? []).join('; ');

  if (!token) {
    throw new Error('SAP no devolvió el token CSRF');
  }

  return { token, cookies };
}

/**
 * Crea un nuevo cliente (Business Partner) en SAP.
 * Requiere obtener un token CSRF antes de enviar el POST.
 *
 * @param params - Datos del cliente a crear
 * @returns Número de BusinessPartner creado
 */
/**
 * Obtiene el RUT de un cliente desde la entidad A_Customer.
 * La entidad A_BusinessPartner tiene el RUT incompleto en SearchTerm1,
 * mientras que A_Customer tiene el RUT completo con dígito verificador en TaxNumber1.
 *
 * @param businessPartner - Número de Business Partner
 * @returns RUT completo con dígito verificador (ej: "10009114-3") o cadena vacía
 */
export async function obtenerRutCliente(businessPartner: string): Promise<string> {
  const cliente = await crearClienteAxios();

  const response = await cliente.get(
    `/A_Customer('${businessPartner}')`,
    { params: { $format: 'json' } }
  );

  return (response.data?.d?.TaxNumber1 as string) ?? '';
}

/**
 * Obtiene la dirección de un cliente desde SAP.
 * Los datos de dirección están en una entidad separada A_BusinessPartnerAddress.
 *
 * @param businessPartner - Número de Business Partner
 * @returns Datos de dirección del cliente
 */
export async function obtenerDireccionCliente(businessPartner: string): Promise<SapDireccionCliente | null> {
  const cliente = await crearClienteAxios();

  const response = await cliente.get(
    `/A_BusinessPartnerAddress`,
    {
      params: {
        $filter: `BusinessPartner eq '${businessPartner}'`,
        $format: 'json',
        $top: '1',
      },
    }
  );

  const resultados = response.data?.d?.results ?? [];
  return resultados.length > 0 ? resultados[0] as SapDireccionCliente : null;
}

// Registro de cada llamada a SAP al crear un cliente, destinatario o persona que
// retira (URL, JSON enviado y respuesta o error), para mostrarlo en pantalla.
export interface ILlamadaSapCliente {
  paso: string;          // Ej. "Crear cliente", "Teléfono"
  metodo: 'POST' | 'GET';
  url: string;
  body: unknown;
  ok: boolean;
  status?: number;
  respuesta?: unknown;   // d de la respuesta de SAP (si ok)
  error?: unknown;       // cuerpo del error de SAP (si falla)
}

export interface IResultadoCrearClienteSap {
  businessPartner: string;
  llamadas: ILlamadaSapCliente[];
}

// Error de la creación principal: lleva las llamadas hechas hasta el fallo.
export class ErrorCrearClienteSap extends Error {
  constructor(public causa: any, public llamadas: ILlamadaSapCliente[]) {
    super(causa?.message ?? 'Error al crear cliente en SAP');
  }
}

/** Variables de sistema de la creación (pos_parametro_general); las vacías usan su valor por defecto. */
export async function leerParametrosCreacionBp(): Promise<ParametrosCreacionBp> {
  const claves = PARAMETROS_CREACION_BP.map((p) => p.clave);
  const filas = await prisma.$queryRaw<{ clave: string; valor: string }[]>`
    SELECT clave, valor FROM pos_parametro_general WHERE clave = ANY(${claves})`;
  return completarParametrosCreacionBp(Object.fromEntries(filas.map((f) => [f.clave, f.valor])));
}

// Sesión contra API_BUSINESS_PARTNER: un token CSRF y el registro de llamadas.
async function abrirSesionSap() {
  const { token, cookies } = await obtenerCsrfToken();
  const cliente = await crearClienteAxios();
  const llamadas: ILlamadaSapCliente[] = [];

  // POST registrado: guarda URL, body y respuesta/error. Si `critica`, relanza el error.
  const post = async (paso: string, ruta: string, payload: unknown, critica: boolean) => {
    const llamada: ILlamadaSapCliente = { paso, metodo: 'POST', url: `${cliente.defaults.baseURL}${ruta}`, body: payload, ok: false };
    llamadas.push(llamada);
    try {
      const response = await cliente.post(ruta, payload, {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: cookies },
      });
      llamada.ok = true;
      llamada.status = response.status;
      llamada.respuesta = response.data?.d ?? response.data ?? null;
      return response;
    } catch (err: any) {
      llamada.status = err?.response?.status;
      llamada.error = err?.response?.data ?? { message: err?.message };
      if (critica) throw new ErrorCrearClienteSap(err, llamadas);
      console.error(`[API_BUSINESS_PARTNER] Error en ${paso}:`, JSON.stringify(llamada.error));
      return null;
    }
  };

  // GET registrado (no crítico): devuelve `d` o null si falla.
  const get = async (paso: string, ruta: string) => {
    const llamada: ILlamadaSapCliente = { paso, metodo: 'GET', url: `${cliente.defaults.baseURL}${ruta}`, body: null, ok: false };
    llamadas.push(llamada);
    try {
      const response = await cliente.get(ruta, { params: { $format: 'json' } });
      llamada.ok = true;
      llamada.status = response.status;
      llamada.respuesta = response.data?.d ?? null;
      return response.data?.d ?? null;
    } catch (err: any) {
      llamada.status = err?.response?.status;
      llamada.error = err?.response?.data ?? { message: err?.message };
      return null;
    }
  };

  return { post, get, llamadas };
}

type SesionSap = Awaited<ReturnType<typeof abrirSesionSap>>;

const textoErrorSap = (llamada?: ILlamadaSapCliente) =>
  (llamada?.error as any)?.error?.message?.value ?? (llamada?.error as any)?.message ?? 'Error de SAP';

/**
 * Asigna un BP a una función de interlocutor (WE, ZB, AP) en el área de ventas
 * del dueño. Prueba el contador 001; si SAP lo rechaza, consulta las funciones
 * existentes y usa el siguiente. Si el BP ya estaba asignado (reintento), no
 * lo duplica.
 */
async function vincularInterlocutor(
  sesion: SesionSap,
  f: Omit<IFuncionInterlocutor, 'contador'>,
): Promise<{ ok: boolean; mensaje?: string }> {
  const ruta = rutaFuncionesInterlocutor(f.customer, f.area);
  const paso = `Vincular ${f.funcion} ${f.numero} a ${f.customer}`;
  const primero = await sesion.post(paso, ruta, construirBodyFuncionInterlocutor({ ...f, contador: '001' }), false);
  if (primero) return { ok: true };
  const errorPrimero = textoErrorSap(sesion.llamadas[sesion.llamadas.length - 1]);

  const existentes = await sesion.get(`Funciones de ${f.customer}`, ruta);
  const filas: IFilaFuncionSap[] = existentes?.results ?? [];
  if (yaVinculado(filas, f.funcion, f.numero, f.esContacto)) return { ok: true };
  if (!existentes) return { ok: false, mensaje: errorPrimero };

  const contador = siguienteContador(filas, f.funcion);
  const segundo = await sesion.post(`${paso} (contador ${contador})`, ruta, construirBodyFuncionInterlocutor({ ...f, contador }), false);
  return segundo ? { ok: true } : { ok: false, mensaje: textoErrorSap(sesion.llamadas[sesion.llamadas.length - 1]) };
}

const areaCliente = (p: ParametrosCreacionBp): IAreaVentas => ({ organizacion: p['CLI_ORG_VENTAS'], canal: p['CLI_CANAL'], sector: p['CLI_SECTOR'] });
const areaDestinatario = (p: ParametrosCreacionBp): IAreaVentas => ({ organizacion: p['DEST_ORG_VENTAS'], canal: p['DEST_CANAL'], sector: p['DEST_SECTOR'] });

const hoyChile = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());

/**
 * Crea un cliente en SAP. `numeroExterno` solo con CLI_NUMERACION_EXTERNA = S
 * (numeración externa ZNAC, ADR-027); si no, SAP asigna el número.
 */
export async function crearClienteSap(params: SapCrearClienteParams, numeroExterno?: string): Promise<IResultadoCrearClienteSap> {
  const p = await leerParametrosCreacionBp();
  const sesion = await abrirSesionSap();
  const { llamadas } = sesion;

  const body = construirBodyCrearCliente(params, p, numeroExterno);
  const response = await sesion.post('Crear cliente', '/A_BusinessPartner', body, true);

  const businessPartner = response?.data?.d?.BusinessPartner as string;
  const addressID = response?.data?.d?.to_BusinessPartnerAddress?.results?.[0]?.AddressID as string;
  console.log('[crearClienteSap] BusinessPartner:', businessPartner, '| AddressID:', addressID);

  // Llamadas siguientes: datos de contacto si hay AddressID. Un error acá no
  // anula el cliente ya creado; queda registrado en `llamadas` para mostrarlo.
  if (addressID) {
    const addrKey = `A_BusinessPartnerAddress(BusinessPartner='${businessPartner}',AddressID='${addressID}')`;

    if (params.telefono) {
      await sesion.post('Teléfono', '/A_AddressPhoneNumber', {
        AddressID: addressID,
        Person: businessPartner.padStart(10, '0'),
        OrdinalNumber: '1',
        PhoneNumber: params.telefono,
        PhoneNumberType: '2',
        IsDefaultPhoneNumber: true,
      }, false);
    }
    if (params.celular) {
      await sesion.post('Celular', '/A_AddressMobilePhoneNumber', {
        AddressID: addressID,
        MobilePhoneNumber: params.celular,
        IsDefaultMobilePhoneNumber: true,
      }, false);
    }
    if (params.fax) {
      await sesion.post('Fax', `/${addrKey}/to_FaxNumber`, {
        AddressID: addressID,
        FaxNumber: params.fax,
      }, false);
    }
    if (params.correoFactura || params.correoContacto) {
      await sesion.post('Correo', '/A_AddressEmailAddress', {
        AddressID: addressID,
        Person: businessPartner.padStart(10, '0'),
        OrdinalNumber: '1',
        EmailAddress: params.correoFactura ?? params.correoContacto ?? '',
        IsDefaultEmailAddress: true,
      }, false);
    }
  }

  return { businessPartner, llamadas };
}

export interface IResultadoInterlocutorSap {
  numero: string;               // BP creado (o el que se reintentó vincular)
  vinculado: boolean;
  mensaje?: string;             // motivo si no se vinculó
  llamadas: ILlamadaSapCliente[];
}

/** Vincula un destinatario ya creado al cliente (función WE, paso 2.2 del correo). */
async function vincularDestinatario(sesion: SesionSap, cliente: string, destinatario: string, p: ParametrosCreacionBp) {
  return vincularInterlocutor(sesion, {
    customer: cliente, area: areaCliente(p), funcion: p['DEST_FUNCION_INTERLOC'], numero: destinatario, esContacto: false,
  });
}

/** Crea el destinatario de mercancía (ZDES) y lo vincula al cliente (WE). */
export async function crearDestinatarioSap(cliente: string, d: IDestinatarioSap): Promise<IResultadoInterlocutorSap> {
  const p = await leerParametrosCreacionBp();
  const sesion = await abrirSesionSap();
  const response = await sesion.post('Crear destinatario', '/A_BusinessPartner', construirBodyCrearDestinatario(d, p), true);
  const numero = response?.data?.d?.BusinessPartner as string;
  const v = await vincularDestinatario(sesion, cliente, numero, p);
  return { numero, vinculado: v.ok, mensaje: v.mensaje, llamadas: sesion.llamadas };
}

/** Reintenta solo el vínculo de un destinatario ya creado. */
export async function vincularDestinatarioSap(cliente: string, destinatario: string): Promise<IResultadoInterlocutorSap> {
  const p = await leerParametrosCreacionBp();
  const sesion = await abrirSesionSap();
  const v = await vincularDestinatario(sesion, cliente, destinatario, p);
  return { numero: destinatario, vinculado: v.ok, mensaje: v.mensaje, llamadas: sesion.llamadas };
}

/**
 * Vincula una persona que retira ya creada. ZB: en el área de ventas del
 * destinatario (o del cliente, si es su propio destinatario). AP: relación de
 * contacto con el cliente + función AP en el área del cliente (correo José).
 */
async function vincularPersonaRetira(
  sesion: SesionSap, cliente: string, persona: string, destinatario: string | undefined, p: ParametrosCreacionBp,
) {
  if (retiraComoCliente(p)) {
    const dueno = destinatario || cliente;
    return vincularInterlocutor(sesion, {
      customer: dueno,
      area: dueno === cliente ? areaCliente(p) : areaDestinatario(p),
      funcion: p['RET_FUNCION_INTERLOC'], numero: persona, esContacto: false,
    });
  }
  // AP: si la relación ya existe (reintento), SAP la rechaza; se sigue igual con la función
  await sesion.post('Relacionar contacto con el cliente', '/A_BusinessPartnerContact',
    construirBodyContactoCliente(cliente, persona, hoyChile(), p), false);
  return vincularInterlocutor(sesion, {
    customer: cliente, area: areaCliente(p), funcion: p['RET_FUNCION_INTERLOC'], numero: persona, esContacto: true,
  });
}

/** Crea la persona que retira (ZPER) y la vincula (ZB o AP, según RET_FUNCION_INTERLOC). */
export async function crearPersonaRetiraSap(
  cliente: string, r: IPersonaRetiraSap, destinatario?: string,
): Promise<IResultadoInterlocutorSap> {
  const p = await leerParametrosCreacionBp();
  const sesion = await abrirSesionSap();
  const response = await sesion.post('Crear persona que retira', '/A_BusinessPartner', construirBodyCrearPersonaRetira(r, cliente, p), true);
  const numero = response?.data?.d?.BusinessPartner as string;
  const v = await vincularPersonaRetira(sesion, cliente, numero, destinatario, p);
  return { numero, vinculado: v.ok, mensaje: v.mensaje, llamadas: sesion.llamadas };
}

/** Reintenta solo el vínculo de una persona que retira ya creada. */
export async function vincularPersonaRetiraSap(cliente: string, persona: string, destinatario?: string): Promise<IResultadoInterlocutorSap> {
  const p = await leerParametrosCreacionBp();
  const sesion = await abrirSesionSap();
  const v = await vincularPersonaRetira(sesion, cliente, persona, destinatario, p);
  return { numero: persona, vinculado: v.ok, mensaje: v.mensaje, llamadas: sesion.llamadas };
}

/**
 * Obtiene los datos completos de un cliente para la Ficha.
 * Expande las navegaciones de SAP para traer dirección, datos de cliente,
 * crédito, contactos y relaciones en una sola llamada.
 */
export async function obtenerFichaCliente(businessPartner: string): Promise<Record<string, any>> {
  const cliente = await crearClienteAxios();

  const bp = businessPartner.padStart(10, '0');

  const response = await cliente.get(
    `/A_BusinessPartner('${bp}')`,
    {
      params: {
        $format: 'json',
        $expand: 'to_Customer,to_BusinessPartnerAddress,to_BusinessPartnerContact,to_BPRelationship',
      },
    }
  );

  const data = response.data?.d ?? {};

  // También obtener el RUT completo desde A_Customer
  let rutCompleto = '';
  try {
    rutCompleto = await obtenerRutCliente(bp);
  } catch {
    // Si falla, usar SearchTerm1
    rutCompleto = data.SearchTerm1 ?? '';
  }

  return { ...data, TaxNumber1: rutCompleto };
}