import { describe, it, expect } from 'vitest';
import { comprobanteDeClase, motivoClienteBoleta, motivoNoFacturar, esClienteBoleta } from './comprobante';

describe('comprobanteDeClase', () => {
  it('debería clasificar las ventas boleta, factura y el resto como por definir', () => {
    expect(comprobanteDeClase('ZV01')).toBe('Boleta');
    expect(comprobanteDeClase(' zv02 ')).toBe('Boleta');
    for (const c of ['ZV04', 'ZV06', 'ZV07', 'ZV15']) expect(comprobanteDeClase(c)).toBe('Factura');
    for (const c of ['ZC01', 'ZD01', 'ZN01', 'ZN02', 'ZN05', '', undefined]) expect(comprobanteDeClase(c)).toBe('Por definir');
  });
});

describe('Cliente Boleta', () => {
  it('debería aceptarse solo en ventas boleta', () => {
    expect(esClienteBoleta('0000999999')).toBe(true);
    expect(motivoClienteBoleta('999999', 'ZV01')).toBeNull();
    expect(motivoClienteBoleta('999999', 'ZV02')).toBeNull();
    expect(motivoClienteBoleta('999999', 'ZV04')).toContain('solo se usa en ventas boleta');
    expect(motivoClienteBoleta('999999', 'ZC01')).toContain('ZC01');
    expect(motivoClienteBoleta('10000003', 'ZV04')).toBeNull();
  });
});

describe('motivoNoFacturar', () => {
  it('no debería facturar ninguna clase por ahora, con el motivo de cada grupo', () => {
    expect(motivoNoFacturar('ZV01')).toContain('venta boleta');
    expect(motivoNoFacturar('ZV07')).toContain('pendiente');
    expect(motivoNoFacturar('ZN01')).toContain('no es una venta');
  });
});
