import { describe, it, expect } from 'vitest';
import { comprobanteDeClase, motivoClienteBoleta, motivoNoFacturar, esClienteBoleta } from './comprobante';

describe('comprobanteDeClase', () => {
  it('debería clasificar las ventas boleta, factura y el resto como por definir', () => {
    expect(comprobanteDeClase(' zv02 ')).toBe('Boleta');
    for (const c of ['ZV01', 'ZV04', 'ZV06', 'ZV07', 'ZV15']) expect(comprobanteDeClase(c)).toBe('Factura');
    for (const c of ['ZC01', 'ZD01', 'ZN01', 'ZN02', 'ZN05', '', undefined]) expect(comprobanteDeClase(c)).toBe('Por definir');
  });
});

describe('Cliente Boleta', () => {
  it('debería aceptarse solo en ventas boleta', () => {
    expect(esClienteBoleta('0000999999')).toBe(true);
    expect(motivoClienteBoleta('999999', 'ZV01')).toContain('solo se usa en ventas boleta');
    expect(motivoClienteBoleta('999999', 'ZV02')).toBeNull();
    expect(motivoClienteBoleta('999999', 'ZV04')).toContain('solo se usa en ventas boleta');
    expect(motivoClienteBoleta('999999', 'ZC01')).toContain('ZC01');
    expect(motivoClienteBoleta('10000003', 'ZV04')).toBeNull();
  });
});

describe('motivoNoFacturar', () => {
  it('debería facturar solo Venta normal (ZV01), con el motivo de cada grupo en el resto', () => {
    expect(motivoNoFacturar('ZV01')).toBeNull();
    expect(motivoNoFacturar('ZV02')).toContain('venta boleta');
    expect(motivoNoFacturar('ZV07')).toContain('pendiente');
    expect(motivoNoFacturar('ZN01')).toContain('no es una venta');
  });
});
