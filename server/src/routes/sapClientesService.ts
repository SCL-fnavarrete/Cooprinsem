import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';

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
 * Busca un cliente en SAP por su RUT
 *
 * @param rut - RUT del cliente (ej: "12345678-9")
 * @returns Lista de clientes que coinciden con el RUT
 */
/**
 * Busca clientes en SAP por nombre (case-insensitive, búsqueda parcial)
 */
export async function buscarClientePorNombre(nombre: string): Promise<SapCliente[]> {
  const cliente = await crearClienteAxios();
  const nombreUpper = nombre.toUpperCase();

  const response = await cliente.get('/A_BusinessPartner', {
    params: {
      $filter: `substringof('${nombreUpper}', BusinessPartnerName) or substringof('${nombreUpper}', BusinessPartnerFullName)`,
      $top: '50',
      $format: 'json',
    },
  });

  return response.data?.d?.results ?? [];
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

export async function crearClienteSap(params: SapCrearClienteParams): Promise<string> {
  const { token, cookies } = await obtenerCsrfToken();
  const cliente = await crearClienteAxios();

  // Mapear los campos del formulario al formato SAP API_BUSINESS_PARTNER
  const body = {
    BusinessPartnerCategory: params.tipoSocio,  // 1=Persona, 2=Organización
    BusinessPartnerGrouping: '0001',             // Grupo deudor Cooprinsem
    BusinessPartnerType: '0003',                 // Tipo interlocutor comercial
    ...((() => { console.log('[crearClienteSap] tipoSocio:', params.tipoSocio); return params.tipoSocio === '1'; })() ? {
      LastName: params.nombre,                     // Apellidos (Persona)
      FirstName: params.nombre2 ?? '',             // Nombre (Persona)
    } : {
      OrganizationBPName1: params.nombre,          // Nombre 1 (Organización)
      OrganizationBPName2: params.nombre2 ?? '',   // Nombre 2 (Organización)
    }),
    SearchTerm1: params.rut,                     // Concepto búsqueda 1 = RUT
    SearchTerm2: params.conceptoBusqueda,        // Concepto búsqueda 2
    Industry: params.giro,                       // Ramo/Giro
    FormOfAddress: params.tratamiento === 'Señora' ? '0001'
      : params.tratamiento === 'Señor' ? '0002'
        : params.tratamiento === 'Empresa' ? '0003'
          : '0004',                                  // Señor y señora
    to_BusinessPartnerAddress: {
      results: [
        {
          StreetName: params.direccion,
          CityName: params.ciudad,
          Region: params.region,
          PostalCode: params.casilla ?? '',
          Country: 'CL',

        },
      ],
    },
    // to_BusinessPartnerTaxNumber: {
    //   results: [
    //     {
    //       BPTaxType: 'CL1',
    //       BPTaxNumber: params.rut,
    //     },
    //   ],
    // },
  };

  const response = await cliente.post('/A_BusinessPartner', body, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
      Cookie: cookies,
    },
  });

  const businessPartner = response.data?.d?.BusinessPartner as string;
  const addressID = response.data?.d?.to_BusinessPartnerAddress?.results?.[0]?.AddressID as string;
  console.log('[crearClienteSap] BusinessPartner:', businessPartner, '| AddressID:', addressID);

  // Segunda llamada: agregar datos de contacto si hay AddressID
  if (addressID) {
    try {
      const addrKey = `A_BusinessPartnerAddress(BusinessPartner='${businessPartner}',AddressID='${addressID}')`;
      const contactHeaders = { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: cookies };

      if (params.telefono) {
        await cliente.post('/A_AddressPhoneNumber', {
          AddressID: addressID,
          Person: businessPartner.padStart(10, '0'),
          OrdinalNumber: '1',
          PhoneNumber: params.telefono,
          PhoneNumberType: '2',
          IsDefaultPhoneNumber: true,
        }, { headers: contactHeaders });
      }
      if (params.celular) {
        await cliente.post('/A_AddressMobilePhoneNumber', {
          AddressID: addressID,
          MobilePhoneNumber: params.celular,
          IsDefaultMobilePhoneNumber: true,
        }, { headers: contactHeaders });
      }
      if (params.fax) {
        await cliente.post(`/${addrKey}/to_FaxNumber`, {
          AddressID: addressID,
          FaxNumber: params.fax,
        }, { headers: contactHeaders });
      }
      if (params.correoFactura || params.correoContacto) {
      await cliente.post('/A_AddressEmailAddress', {
        AddressID: addressID,
        Person: businessPartner.padStart(10, '0'),
        OrdinalNumber: '1',
        EmailAddress: params.correoFactura ?? params.correoContacto ?? '',
        IsDefaultEmailAddress: true,
      }, { headers: contactHeaders });
    }
    } catch (contactErr: any) {
      console.error('[crearClienteSap] Error en datos contacto:', JSON.stringify(contactErr?.response?.data ?? contactErr?.message));
      console.error('[crearClienteSap] Status:', contactErr?.response?.status);
      console.error('[crearClienteSap] URL:', contactErr?.config?.url);
      console.error('[crearClienteSap] Body enviado:', JSON.stringify(contactErr?.config?.data));
    }
  }

  return businessPartner;
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