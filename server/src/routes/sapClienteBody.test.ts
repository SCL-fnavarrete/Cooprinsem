import { describe, it, expect } from 'vitest';
import { construirBodyCrearCliente, rutFormatoSap } from './sapClienteBody';
import type { SapCrearClienteParams } from './sapClientesService';

const params: SapCrearClienteParams = {
  businessPartner: '10000044',
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
};

describe('rutFormatoSap', () => {
  it('debería quitar los puntos y dejar el guion', () => {
    expect(rutFormatoSap('22.222.222-2')).toBe('22222222-2');
  });
  it('debería agregar el guion y poner la K en mayúscula', () => {
    expect(rutFormatoSap('7654321k')).toBe('7654321-K');
  });
});

describe('construirBodyCrearCliente', () => {
  const body = construirBodyCrearCliente(params) as any;

  it('debería enviar el RUT sin puntos en SearchTerm1 y en to_BusinessPartnerTax (CL1)', () => {
    expect(body.SearchTerm1).toBe('22222222-2');
    expect(body.to_BusinessPartnerTax.results).toEqual([{ BPTaxType: 'CL1', BPTaxNumber: '22222222-2' }]);
  });

  it('debería enviar los roles de cliente FLCU00 y FLCU01', () => {
    expect(body.to_BusinessPartnerRole.results).toEqual([{ BusinessPartnerRole: 'FLCU00' }, { BusinessPartnerRole: 'FLCU01' }]);
  });

  it('debería enviar los datos de sociedad COOP sin la cuenta asociada (pendiente)', () => {
    expect(body.to_Customer.CustomerAccountGroup).toBe('ZD01');
    expect(body.to_Customer.to_CustomerCompany.results).toEqual([{ CompanyCode: 'COOP', PaymentTerms: 'D001', LayoutSortingRule: '000' }]);
  });

  it('debería enviar el área de ventas COOP/00/00 con impuesto MWST, sin los campos pendientes', () => {
    const area = body.to_Customer.to_CustomerSalesArea.results[0];
    expect(area).toMatchObject({ SalesOrganization: 'COOP', DistributionChannel: '00', Division: '00', Currency: 'CLP', CustomerPaymentTerms: 'D001' });
    expect(area.to_SalesAreaTax.results).toEqual([{ DepartureCountry: 'CL', CustomerTaxCategory: 'MWST', CustomerTaxClassification: '1' }]);
    expect(area).not.toHaveProperty('CustomerPricingProcedure');
    expect(area).not.toHaveProperty('ShippingCondition');
    expect(area).not.toHaveProperty('CustomerAccountAssignmentGroup');
  });

  it('debería usar FirstName/LastName para persona y OrganizationBPName para organización', () => {
    expect(body).toMatchObject({ FirstName: 'John', LastName: 'Doe Prueba', FormOfAddress: '0002', BusinessPartnerGrouping: 'ZNAC' });
    const org = construirBodyCrearCliente({ ...params, tipoSocio: '2', tratamiento: 'Empresa' }) as any;
    expect(org).toMatchObject({ OrganizationBPName1: 'John', OrganizationBPName2: 'Doe Prueba', FormOfAddress: '0003' });
    expect(org).not.toHaveProperty('FirstName');
  });

  it('debería enviar el giro (Industry) solo cuando no es persona', () => {
    expect(body).not.toHaveProperty('Industry');
    const org = construirBodyCrearCliente({ ...params, tipoSocio: '2' }) as any;
    expect(org.Industry).toBe('AGRO');
  });
});
