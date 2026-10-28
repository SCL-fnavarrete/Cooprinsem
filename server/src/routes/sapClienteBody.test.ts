import { describe, it, expect } from 'vitest';
import {
  construirBodyCrearCliente, construirBodyCrearDestinatario, construirBodyCrearPersonaRetira,
  construirBodyContactoCliente, construirBodyFuncionInterlocutor, rutaFuncionesInterlocutor,
  fechaODataSap, rutFormatoSap, siguienteContador, yaVinculado, retiraComoCliente,
  type IDestinatarioSap, type IPersonaRetiraSap,
} from './sapClienteBody';
import { completarParametrosCreacionBp, PARAMETROS_CREACION_BP } from './parametrosCreacionBp';
import type { SapCrearClienteParams } from './sapClientesService';

const P = completarParametrosCreacionBp({});

const params: SapCrearClienteParams = {
  tipoSocio: '1',
  tratamiento: 'Señor',
  rut: '22.222.222-2',
  nombre: 'John',
  nombre2: 'Doe Prueba',
  conceptoBusqueda: 'BUSQUEDA',
  giro: 'AGRO',
  direccion: 'AVE TESTING 123',
  region: '13',
  ciudad: 'SANTIAGO',
  comuna: 'SANTIAGO',
  zonaTransporte: '0000000001',
  casilla: '1234',
};

describe('completarParametrosCreacionBp', () => {
  it('debería usar el valor por defecto si el parámetro falta o está vacío', () => {
    const p = completarParametrosCreacionBp({ CLI_SOC_CUENTA_ASOC: '1010404000', CLI_CANAL: '  ' });
    expect(p['CLI_SOC_CUENTA_ASOC']).toBe('1010404000');
    expect(p['CLI_CANAL']).toBe('00');
    expect(Object.keys(p)).toHaveLength(PARAMETROS_CREACION_BP.length);
  });

  it('debería guardar los códigos con sus ceros a la izquierda (formato SAP)', () => {
    expect(P).toMatchObject({ CLI_CANAL: '00', CLI_COND_EXPEDICION: '02', CLI_GR_IMPUTACION: '01', RET_TRATAMIENTO: '0002' });
  });
});

describe('rutFormatoSap', () => {
  it('debería quitar los puntos y dejar el guion', () => {
    expect(rutFormatoSap('22.222.222-2')).toBe('22222222-2');
  });
  it('debería agregar el guion y poner la K en mayúscula', () => {
    expect(rutFormatoSap('7654321k')).toBe('7654321-K');
  });
});

describe('construirBodyCrearCliente', () => {
  const body = construirBodyCrearCliente(params, P) as any;

  it('no debería enviar BusinessPartner con numeración interna, y sí con número externo', () => {
    expect(body).not.toHaveProperty('BusinessPartner');
    expect((construirBodyCrearCliente(params, P, '10000050') as any).BusinessPartner).toBe('10000050');
  });

  it('debería enviar idioma, comuna en District y no enviar casilla ni zona de transporte', () => {
    expect(body.CorrespondenceLanguage).toBe('ES');
    const dir = body.to_BusinessPartnerAddress.results[0];
    expect(dir).toEqual({ StreetName: 'AVE TESTING 123', CityName: 'SANTIAGO', District: 'SANTIAGO', Region: '13', Country: 'CL', Language: 'ES' });
    expect(JSON.stringify(body)).not.toContain('0000000001');
  });

  it('debería enviar el RUT sin puntos en SearchTerm1 y en to_BusinessPartnerTax (CL1)', () => {
    expect(body.SearchTerm1).toBe('22222222-2');
    expect(body.to_BusinessPartnerTax.results).toEqual([{ BPTaxType: 'CL1', BPTaxNumber: '22222222-2' }]);
  });

  it('debería enviar los roles de cliente FLCU00 y FLCU01 y la agrupación del parámetro', () => {
    expect(body.BusinessPartnerGrouping).toBe('ZNAC');
    expect(body.to_BusinessPartnerRole.results).toEqual([{ BusinessPartnerRole: 'FLCU00' }, { BusinessPartnerRole: 'FLCU01' }]);
  });

  it('debería enviar la sociedad con cuenta asociada y grupo de tesorería del correo', () => {
    expect(body.to_Customer.CustomerAccountGroup).toBe('ZD01');
    expect(body.to_Customer.to_CustomerCompany.results).toEqual([{
      CompanyCode: 'COOP', PaymentTerms: 'D001', LayoutSortingRule: '000',
      ReconciliationAccount: '1010401000', CashPlanningGroup: 'E1', RecordPaymentHistoryIndicator: true,
    }]);
  });

  it('debería enviar el área de ventas completa del correo', () => {
    expect(body.to_Customer.to_CustomerSalesArea.results).toEqual([{
      SalesOrganization: 'COOP', DistributionChannel: '00', Division: '00', Currency: 'CLP',
      CustomerPaymentTerms: 'D001', ShippingCondition: '02', CustomerPricingProcedure: '1',
      CustomerAccountAssignmentGroup: '01', CustomerGroup: '10',
      to_SalesAreaTax: { results: [{ DepartureCountry: 'CL', CustomerTaxCategory: 'MWST', CustomerTaxClassification: '1' }] },
    }]);
  });

  it('debería usar FirstName/LastName para persona y OrganizationBPName para organización', () => {
    expect(body).toMatchObject({ FirstName: 'John', LastName: 'Doe Prueba', FormOfAddress: '0002' });
    const org = construirBodyCrearCliente({ ...params, tipoSocio: '2', tratamiento: 'Empresa' }, P) as any;
    expect(org).toMatchObject({ OrganizationBPName1: 'John', OrganizationBPName2: 'Doe Prueba', FormOfAddress: '0003' });
    expect(org).not.toHaveProperty('FirstName');
  });

  it('debería enviar el giro (Industry) solo cuando no es persona', () => {
    expect(body).not.toHaveProperty('Industry');
    expect((construirBodyCrearCliente({ ...params, tipoSocio: '2' }, P) as any).Industry).toBe('AGRO');
  });

  it('debería tomar los valores de los parámetros editados', () => {
    const p = completarParametrosCreacionBp({ CLI_SOC_CUENTA_ASOC: '9999999999', BP_AGRUPACION: 'ZXXX' });
    const b = construirBodyCrearCliente(params, p) as any;
    expect(b.BusinessPartnerGrouping).toBe('ZXXX');
    expect(b.to_Customer.to_CustomerCompany.results[0].ReconciliationAccount).toBe('9999999999');
  });
});

describe('construirBodyCrearDestinatario', () => {
  const d: IDestinatarioSap = {
    rut: '76.111.111-1', nombre1: 'Agrícola Prueba SpA', direccion: 'Camino a Puerto Octay km 5',
    region: '10', comuna: 'OSORNO', ciudad: 'Osorno', correo: 'despacho@prueba.cl',
  };
  const body = construirBodyCrearDestinatario(d, P) as any;

  it('debería armar el destinatario como el ejemplo del correo (ZDES, ZD06, FLCU01) sin SearchTerm2', () => {
    expect(body).toMatchObject({
      BusinessPartnerCategory: '2', BusinessPartnerGrouping: 'ZDES', CorrespondenceLanguage: 'ES',
      OrganizationBPName1: 'Agrícola Prueba SpA', SearchTerm1: '76111111-1',
    });
    expect(body).not.toHaveProperty('SearchTerm2');
    expect(body).not.toHaveProperty('OrganizationBPName2');
    expect(body.to_BusinessPartnerRole.results).toEqual([{ BusinessPartnerRole: 'FLCU01' }]);
    expect(body.to_BusinessPartnerTax.results).toEqual([{ BPTaxType: 'CL1', BPTaxNumber: '76111111-1' }]);
  });

  it('debería enviar la dirección con el correo y el área de ventas con su impuesto', () => {
    expect(body.to_BusinessPartnerAddress.results[0]).toEqual({
      StreetName: 'Camino a Puerto Octay km 5', CityName: 'Osorno', District: 'OSORNO', Region: '10', Country: 'CL', Language: 'ES',
      to_EmailAddress: { results: [{ EmailAddress: 'despacho@prueba.cl', IsDefaultEmailAddress: true }] },
    });
    expect(body.to_Customer).toEqual({
      CustomerAccountGroup: 'ZD06',
      to_CustomerSalesArea: { results: [{
        SalesOrganization: 'COOP', DistributionChannel: '00', Division: '00', Currency: 'CLP', ShippingCondition: '02',
        to_SalesAreaTax: { results: [{ DepartureCountry: 'CL', CustomerTaxCategory: 'MWST', CustomerTaxClassification: '1' }] },
      }] },
    });
  });

  it('no debería enviar el correo si viene vacío', () => {
    const sinCorreo = construirBodyCrearDestinatario({ ...d, correo: '' }, P) as any;
    expect(sinCorreo.to_BusinessPartnerAddress.results[0]).not.toHaveProperty('to_EmailAddress');
  });
});

describe('construirBodyCrearPersonaRetira', () => {
  const r: IPersonaRetiraSap = {
    tratamiento: 'Señor', rut: '12.345.678-5', nombre: 'Pedro', apellido: 'Retira', celular: '912345678',
    correo: 'pedro.retira@correo.cl', direccion: 'ave testing', region: '13', comuna: 'SANTIAGO', ciudad: 'santiago',
  };

  it('debería armar la persona como el ejemplo del correo (ZPER, celular y correo en la dirección)', () => {
    const body = construirBodyCrearPersonaRetira(r, '10000046', P) as any;
    expect(body).toMatchObject({
      BusinessPartnerCategory: '1', BusinessPartnerGrouping: 'ZPER', CorrespondenceLanguage: 'ES', FormOfAddress: '0002',
      FirstName: 'Pedro', LastName: 'Retira', SearchTerm1: '12345678-5', SearchTerm2: 'RETIRA 10000046',
    });
    expect(body.to_BusinessPartnerAddress.results[0]).toEqual({
      StreetName: 'ave testing', CityName: 'santiago', District: 'SANTIAGO', Region: '13', Country: 'CL', Language: 'ES',
      to_MobilePhoneNumber: { results: [{ PhoneNumber: '912345678', DestinationLocationCountry: 'CL', IsDefaultPhoneNumber: true }] },
      to_EmailAddress: { results: [{ EmailAddress: 'pedro.retira@correo.cl', IsDefaultEmailAddress: true }] },
    });
    expect(body.to_BusinessPartnerTax.results).toEqual([{ BPTaxType: 'CL1', BPTaxNumber: '12345678-5' }]);
  });

  it('con ZB debería ser cliente: rol FLCU01, grupo ZD09 y área de ventas (como las personas ZB de SAP)', () => {
    expect(retiraComoCliente(P)).toBe(true);
    const body = construirBodyCrearPersonaRetira(r, '10000046', P) as any;
    expect(body.to_BusinessPartnerRole.results).toEqual([{ BusinessPartnerRole: 'FLCU01' }]);
    expect(body.to_Customer).toEqual({
      CustomerAccountGroup: 'ZD09',
      to_CustomerSalesArea: { results: [{ SalesOrganization: 'COOP', DistributionChannel: '00', Division: '00', Currency: 'CLP' }] },
    });
  });

  it('con AP no debería llevar rol ni datos de cliente (JSON del correo tal cual)', () => {
    const pAp = completarParametrosCreacionBp({ RET_FUNCION_INTERLOC: 'AP' });
    expect(retiraComoCliente(pAp)).toBe(false);
    const body = construirBodyCrearPersonaRetira(r, '10000046', pAp) as any;
    expect(body).not.toHaveProperty('to_BusinessPartnerRole');
    expect(body).not.toHaveProperty('to_Customer');
  });

  it('debería usar el tratamiento por defecto del parámetro si no viene', () => {
    expect((construirBodyCrearPersonaRetira({ ...r, tratamiento: '' }, '1', P) as any).FormOfAddress).toBe('0002');
    expect((construirBodyCrearPersonaRetira({ ...r, tratamiento: 'Señora' }, '1', P) as any).FormOfAddress).toBe('0001');
  });
});

describe('fechaODataSap y construirBodyContactoCliente', () => {
  it('debería convertir AAAA-MM-DD y DD-MM-AAAA a /Date(ms)/ en UTC', () => {
    expect(fechaODataSap('9999-12-31')).toBe('/Date(253402214400000)/');
    expect(fechaODataSap('31-12-9999')).toBe('/Date(253402214400000)/');
    expect(() => fechaODataSap('31/12/9999')).toThrow();
  });

  it('debería relacionar la persona con el cliente desde hoy hasta el fin de validez (como el correo)', () => {
    expect(construirBodyContactoCliente('10000046', '90001500', '2026-10-27', P)).toEqual({
      BusinessPartnerCompany: '10000046', BusinessPartnerPerson: '90001500',
      ValidityStartDate: '/Date(1793059200000)/', ValidityEndDate: '/Date(253402214400000)/',
    });
  });
});

describe('funciones de interlocutor', () => {
  const area = { organizacion: 'COOP', canal: '00', sector: '00' };

  it('debería armar la ruta y el body del vínculo WE como el correo', () => {
    expect(rutaFuncionesInterlocutor('10000046', area))
      .toBe("/A_CustomerSalesArea(Customer='10000046',SalesOrganization='COOP',DistributionChannel='00',Division='00')/to_PartnerFunction");
    expect(construirBodyFuncionInterlocutor({ customer: '10000046', area, funcion: 'WE', contador: '001', numero: '80000400', esContacto: false })).toEqual({
      Customer: '10000046', SalesOrganization: 'COOP', DistributionChannel: '00', Division: '00',
      PartnerCounter: '001', PartnerFunction: 'WE', BPCustomerNumber: '80000400',
    });
  });

  it('debería usar ContactPerson para AP', () => {
    expect(construirBodyFuncionInterlocutor({ customer: '1', area, funcion: 'AP', contador: '001', numero: '9', esContacto: true }))
      .toMatchObject({ PartnerFunction: 'AP', ContactPerson: '9' });
  });

  // Funciones reales del cliente 10000003 en DEV (28-10-2026): WE 0 y WE 1
  const filas = [
    { PartnerFunction: 'AG', PartnerCounter: '0', BPCustomerNumber: '10000003' },
    { PartnerFunction: 'WE', PartnerCounter: '0', BPCustomerNumber: '10000003' },
    { PartnerFunction: 'WE', PartnerCounter: '1', BPCustomerNumber: '80000344' },
  ];

  it('debería calcular el siguiente contador de la función', () => {
    expect(siguienteContador(filas, 'WE')).toBe('002');
    expect(siguienteContador(filas, 'ZB')).toBe('000');
  });

  it('debería detectar un BP ya vinculado con esa función (reintento sin duplicar)', () => {
    expect(yaVinculado(filas, 'WE', '0080000344', false)).toBe(true);
    expect(yaVinculado(filas, 'ZB', '80000344', false)).toBe(false);
  });
});
