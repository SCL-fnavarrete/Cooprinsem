import type { SapCrearClienteParams } from './sapClientesService';
import type { ParametrosCreacionBp } from './parametrosCreacionBp';

// Bodies de API_BUSINESS_PARTNER para Pedidos > Clientes > Crear: cliente (ZNAC),
// destinatario de mercancía (ZDES) y persona que retira (ZPER), según el correo
// de José Castillo del 27-10-2026. Los valores fijos salen de las variables de
// sistema (parametrosCreacionBp.ts). Funciones puras para probarlas sin SAP.
//
// Diferencias con el correo:
//  - Zona de transporte y casilla no se envían (decisión del usuario, 28-10-2026).
//  - El grupo estadístico (CLI_GRUPO_ESTAD) no se envía: la API de DEV no tiene ese campo.
//  - Persona que retira con ZB (RET_FUNCION_INTERLOC): como las personas que ya
//    existen en SAP, cuelga del destinatario con BPCustomerNumber, así que necesita
//    rol de cliente (FLCU01), grupo de cuentas ZD09 y área de ventas. Con AP se
//    usan los 3 pasos del correo (persona de contacto del cliente).

/** RUT como lo guarda SAP: sin puntos, con guion y DV en mayúscula (12345678-K). */
export function rutFormatoSap(rut: string): string {
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

// Tratamiento del formulario → FormOfAddress SAP
function formaTratamiento(tratamiento: string): string {
  if (tratamiento === 'Señora') return '0001';
  if (tratamiento === 'Señor') return '0002';
  if (tratamiento === 'Empresa') return '0003';
  return '0004'; // Señor y señora
}

// Correo y celular dentro de la dirección (formato del ejemplo de José)
function contactoDireccion(correo?: string, celular?: string, paisTelefono = 'CL') {
  return {
    ...(celular ? {
      to_MobilePhoneNumber: { results: [{ PhoneNumber: celular, DestinationLocationCountry: paisTelefono, IsDefaultPhoneNumber: true }] },
    } : {}),
    ...(correo ? {
      to_EmailAddress: { results: [{ EmailAddress: correo, IsDefaultEmailAddress: true }] },
    } : {}),
  };
}

export function construirBodyCrearCliente(params: SapCrearClienteParams, p: ParametrosCreacionBp, numeroExterno?: string) {
  const rut = rutFormatoSap(params.rut);
  const esPersona = params.tipoSocio === '1';
  return {
    // Con numeración interna (CLI_NUMERACION_EXTERNA = N) SAP asigna el número
    ...(numeroExterno ? { BusinessPartner: numeroExterno } : {}),
    BusinessPartnerCategory: params.tipoSocio,   // 1=Persona, 2=Organización
    BusinessPartnerGrouping: p['BP_AGRUPACION'],
    BusinessPartnerType: '0003',                 // Tipo interlocutor comercial
    CorrespondenceLanguage: 'ES',
    ...(esPersona ? {
      FirstName: params.nombre,                  // Nombre (Persona)
      LastName: params.nombre2 ?? '',            // Apellidos (Persona)
    } : {
      OrganizationBPName1: params.nombre,        // Nombre 1 (Organización)
      OrganizationBPName2: params.nombre2 ?? '', // Nombre 2 (Organización)
    }),
    SearchTerm1: rut,                            // Concepto búsqueda 1 = RUT
    SearchTerm2: params.conceptoBusqueda,        // Concepto búsqueda 2
    ...(esPersona ? {} : { Industry: params.giro }), // Ramo/Giro (una persona no lleva giro)
    FormOfAddress: formaTratamiento(params.tratamiento),
    // Roles de cliente (sin ellos el BP queda sin rol deudor)
    to_BusinessPartnerRole: {
      results: [
        { BusinessPartnerRole: 'FLCU00' },       // Cliente (contabilidad)
        { BusinessPartnerRole: 'FLCU01' },       // Cliente (ventas)
      ],
    },
    to_BusinessPartnerAddress: {
      results: [
        {
          StreetName: params.direccion,
          CityName: params.ciudad,
          District: params.comuna,
          Region: params.region,
          Country: 'CL',
          Language: 'ES',
        },
      ],
    },
    // RUT como número de identificación fiscal chileno
    to_BusinessPartnerTax: {
      results: [{ BPTaxType: 'CL1', BPTaxNumber: rut }],
    },
    to_Customer: {
      CustomerAccountGroup: p['CLI_GRUPO_CUENTA'],
      to_CustomerCompany: {
        results: [
          {
            CompanyCode: p['CLI_SOCIEDAD'],
            PaymentTerms: p['CLI_SOC_COND_PAGO'],
            LayoutSortingRule: '000',
            ReconciliationAccount: p['CLI_SOC_CUENTA_ASOC'],
            CashPlanningGroup: p['CLI_SOC_GRUPO_TESOR'],
            RecordPaymentHistoryIndicator: true,
          },
        ],
      },
      to_CustomerSalesArea: {
        results: [
          {
            SalesOrganization: p['CLI_ORG_VENTAS'],
            DistributionChannel: p['CLI_CANAL'],
            Division: p['CLI_SECTOR'],
            Currency: 'CLP',
            CustomerPaymentTerms: p['CLI_VTA_COND_PAGO'],
            ShippingCondition: p['CLI_COND_EXPEDICION'],
            CustomerPricingProcedure: p['CLI_ESQUEMA_CLIENTE'],
            CustomerAccountAssignmentGroup: p['CLI_GR_IMPUTACION'],
            CustomerGroup: p['CLI_GRUPO_CLIENTES'],
            // CLI_GRUPO_ESTAD no se envía: CustomerStatisticsGroup no existe en
            // API_BUSINESS_PARTNER de DEV (SAP: "Eigenschaft ... ist ungültig", 28-10-2026)
            to_SalesAreaTax: {
              results: [
                { DepartureCountry: p['CLI_IMP_PAIS'], CustomerTaxCategory: p['CLI_IMP_CATEGORIA'], CustomerTaxClassification: '1' },
              ],
            },
          },
        ],
      },
    },
  };
}

// ─── Destinatario de mercancía ───────────────────────────────────────────────

export interface IDestinatarioSap {
  rut: string;
  nombre1: string;
  nombre2?: string;
  direccion?: string;
  region: string;
  comuna: string;
  ciudad: string;
  correo?: string;
}

export function construirBodyCrearDestinatario(d: IDestinatarioSap, p: ParametrosCreacionBp) {
  const rut = rutFormatoSap(d.rut);
  const esPersona = p['DEST_CATEGORIA'] === '1';
  return {
    BusinessPartnerCategory: p['DEST_CATEGORIA'],
    BusinessPartnerGrouping: p['DEST_AGRUPACION'],
    CorrespondenceLanguage: p['DEST_IDIOMA_CORRESP'],
    ...(esPersona
      ? { FirstName: d.nombre1, LastName: d.nombre2 ?? '' }
      : { OrganizationBPName1: d.nombre1, ...(d.nombre2 ? { OrganizationBPName2: d.nombre2 } : {}) }),
    SearchTerm1: rut,                            // SearchTerm2 no se envía (José, 28-10-2026)
    to_BusinessPartnerRole: { results: [{ BusinessPartnerRole: p['DEST_ROL'] }] },
    to_BusinessPartnerAddress: {
      results: [
        {
          StreetName: d.direccion ?? '',
          CityName: d.ciudad,
          District: d.comuna,
          Region: d.region,
          Country: p['DEST_DIR_PAIS'],
          Language: p['DEST_DIR_IDIOMA'],
          ...contactoDireccion(d.correo),
        },
      ],
    },
    to_BusinessPartnerTax: { results: [{ BPTaxType: p['DEST_TIPO_IMPUESTO'], BPTaxNumber: rut }] },
    to_Customer: {
      CustomerAccountGroup: p['DEST_GRUPO_CUENTA'],
      to_CustomerSalesArea: {
        results: [
          {
            SalesOrganization: p['DEST_ORG_VENTAS'],
            DistributionChannel: p['DEST_CANAL'],
            Division: p['DEST_SECTOR'],
            Currency: p['DEST_MONEDA'],
            ShippingCondition: p['DEST_COND_EXPEDICION'],
            to_SalesAreaTax: {
              results: [
                { DepartureCountry: p['DEST_IMP_PAIS'], CustomerTaxCategory: p['DEST_IMP_CATEGORIA'], CustomerTaxClassification: p['DEST_IMP_CLASIF'] },
              ],
            },
          },
        ],
      },
    },
  };
}

// ─── Persona que retira ──────────────────────────────────────────────────────

export interface IPersonaRetiraSap {
  tratamiento?: string;
  rut: string;
  nombre: string;
  apellido: string;
  celular?: string;
  correo?: string;
  direccion: string;
  region: string;
  comuna: string;
  ciudad: string;
}

/** true = la persona cuelga del destinatario como ZB (cliente); false = contacto del cliente (AP). */
export function retiraComoCliente(p: ParametrosCreacionBp): boolean {
  return p['RET_FUNCION_INTERLOC'] !== 'AP';
}

export function construirBodyCrearPersonaRetira(r: IPersonaRetiraSap, cliente: string, p: ParametrosCreacionBp) {
  const rut = rutFormatoSap(r.rut);
  return {
    BusinessPartnerCategory: p['RET_CATEGORIA'],
    BusinessPartnerGrouping: p['RET_AGRUPACION'],
    CorrespondenceLanguage: p['RET_IDIOMA_CORRESP'],
    FormOfAddress: r.tratamiento ? formaTratamiento(r.tratamiento) : p['RET_TRATAMIENTO'],
    FirstName: r.nombre,
    LastName: r.apellido,
    SearchTerm1: rut,
    SearchTerm2: `RETIRA ${cliente}`.slice(0, 20),
    to_BusinessPartnerAddress: {
      results: [
        {
          StreetName: r.direccion,
          CityName: r.ciudad,
          District: r.comuna,
          Region: r.region,
          Country: p['RET_DIR_PAIS'],
          Language: p['RET_DIR_IDIOMA'],
          ...contactoDireccion(r.correo, r.celular, p['RET_TEL_PAIS']),
        },
      ],
    },
    to_BusinessPartnerTax: { results: [{ BPTaxType: p['RET_TIPO_IMPUESTO'], BPTaxNumber: rut }] },
    // ZB lleva la persona en BPCustomerNumber: SAP exige que sea cliente (rol + área de ventas)
    ...(retiraComoCliente(p) ? {
      to_BusinessPartnerRole: { results: [{ BusinessPartnerRole: p['RET_ROL'] }] },
      to_Customer: {
        CustomerAccountGroup: p['RET_GRUPO_CUENTA'],
        to_CustomerSalesArea: {
          results: [
            { SalesOrganization: p['CLI_ORG_VENTAS'], DistributionChannel: p['CLI_CANAL'], Division: p['CLI_SECTOR'], Currency: p['RET_MONEDA'] },
          ],
        },
      },
    } : {}),
  };
}

/** Fecha OData V2 (/Date(ms)/) de un día, a medianoche UTC. Acepta AAAA-MM-DD o DD-MM-AAAA. */
export function fechaODataSap(fecha: string): string {
  const m = fecha.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? fecha.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) throw new Error(`Fecha inválida: "${fecha}"`);
  const [anio, mes, dia] = m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
  return `/Date(${Date.UTC(Number(anio), Number(mes) - 1, Number(dia))})/`;
}

/** Relación persona de contacto ↔ cliente (solo AP, paso 3.2 del correo). */
export function construirBodyContactoCliente(cliente: string, persona: string, hoy: string, p: ParametrosCreacionBp) {
  return {
    BusinessPartnerCompany: cliente,
    BusinessPartnerPerson: persona,
    ValidityStartDate: fechaODataSap(hoy),
    ValidityEndDate: fechaODataSap(p['RET_VALIDEZ_HASTA']),
  };
}

// ─── Funciones de interlocutor (to_PartnerFunction) ──────────────────────────

export interface IAreaVentas {
  organizacion: string;
  canal: string;
  sector: string;
}

export interface IFuncionInterlocutor {
  customer: string;            // dueño de la función (cliente o destinatario)
  area: IAreaVentas;
  funcion: string;             // WE, ZB, AP
  contador: string;
  numero: string;              // BP asignado
  esContacto: boolean;         // true = ContactPerson (AP); false = BPCustomerNumber
}

export function rutaFuncionesInterlocutor(customer: string, area: IAreaVentas): string {
  return `/A_CustomerSalesArea(Customer='${customer}',SalesOrganization='${area.organizacion}',`
    + `DistributionChannel='${area.canal}',Division='${area.sector}')/to_PartnerFunction`;
}

export function construirBodyFuncionInterlocutor(f: IFuncionInterlocutor) {
  return {
    Customer: f.customer,
    SalesOrganization: f.area.organizacion,
    DistributionChannel: f.area.canal,
    Division: f.area.sector,
    PartnerCounter: f.contador,
    PartnerFunction: f.funcion,
    ...(f.esContacto ? { ContactPerson: f.numero } : { BPCustomerNumber: f.numero }),
  };
}

export interface IFilaFuncionSap {
  PartnerFunction?: string;
  PartnerCounter?: string;
  BPCustomerNumber?: string;
  ContactPerson?: string;
}

const sinCeros = (s?: string) => (s ?? '').trim().replace(/^0+(?=\d)/, '');

/** Siguiente contador libre para una función (SAP devuelve "0", "1"…); sin filas → "000". */
export function siguienteContador(filas: IFilaFuncionSap[], funcion: string): string {
  const usados = filas
    .filter((f) => f.PartnerFunction === funcion)
    .map((f) => Number(f.PartnerCounter))
    .filter((n) => Number.isFinite(n));
  const siguiente = usados.length > 0 ? Math.max(...usados) + 1 : 0;
  return String(siguiente).padStart(3, '0');
}

/** true si el BP ya está asignado con esa función (reintento sin duplicar). */
export function yaVinculado(filas: IFilaFuncionSap[], funcion: string, numero: string, esContacto: boolean): boolean {
  return filas.some((f) => f.PartnerFunction === funcion
    && sinCeros(esContacto ? f.ContactPerson : f.BPCustomerNumber) === sinCeros(numero));
}
