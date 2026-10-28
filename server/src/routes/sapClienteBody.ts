import type { SapCrearClienteParams } from './sapClientesService';

// Body de POST /A_BusinessPartner (API_BUSINESS_PARTNER) para crear un cliente
// ZNAC desde Pedidos > Clientes > Crear. Basado en el JSON de un cliente creado
// con éxito (27-10-2026). Función pura para poder probarla sin SAP.
//
// PENDIENTES (no se envían hasta confirmar con José/Arquitectura de dónde salen).
// Valor de referencia = el que tiene el cliente ZNAC 10000003 en DEV:
//   to_CustomerCompany.ReconciliationAccount              "<cuenta asociada>"   ref. 1010404000
//   to_CustomerSalesArea.CustomerPricingProcedure         "<esquema cliente>"   ref. 1
//   to_CustomerSalesArea.ShippingCondition                "<cond. expedición>"  ref. 02
//   to_CustomerSalesArea.CustomerAccountAssignmentGroup   "<grupo imputación>"  ref. 01

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

export function construirBodyCrearCliente(params: SapCrearClienteParams) {
  const rut = rutFormatoSap(params.rut);
  const esPersona = params.tipoSocio === '1';
  return {
    BusinessPartner: params.businessPartner,     // Número reservado (numeración externa ZNAC)
    BusinessPartnerCategory: params.tipoSocio,   // 1=Persona, 2=Organización
    BusinessPartnerGrouping: 'ZNAC',             // Grupo deudor Cooprinsem
    BusinessPartnerType: '0003',                 // Tipo interlocutor comercial
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
          Region: params.region,
          PostalCode: params.casilla ?? '',
          Country: 'CL',
        },
      ],
    },
    // RUT como número de identificación fiscal chileno
    to_BusinessPartnerTax: {
      results: [{ BPTaxType: 'CL1', BPTaxNumber: rut }],
    },
    to_Customer: {
      CustomerAccountGroup: 'ZD01',              // Grupo de cuenta del Customer
      // Datos de la sociedad (falta ReconciliationAccount, ver PENDIENTES)
      to_CustomerCompany: {
        results: [
          {
            CompanyCode: 'COOP',
            PaymentTerms: 'D001',
            LayoutSortingRule: '000',
          },
        ],
      },
      // Área de ventas (faltan esquema, cond. expedición y grupo imputación, ver PENDIENTES)
      to_CustomerSalesArea: {
        results: [
          {
            SalesOrganization: 'COOP',
            DistributionChannel: '00',
            Division: '00',
            Currency: 'CLP',
            CustomerPaymentTerms: 'D001',
            to_SalesAreaTax: {
              results: [
                { DepartureCountry: 'CL', CustomerTaxCategory: 'MWST', CustomerTaxClassification: '1' },
              ],
            },
          },
        ],
      },
    },
  };
}
