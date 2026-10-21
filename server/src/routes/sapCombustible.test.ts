import { describe, it, expect } from 'vitest';
import {
  esVentaCombustible, armarVendedorTerreno, validarVendedorTerreno, fechaPedidoSap, cantidadesConfirmadas,
} from './sapCombustible';

// Datos reales de DEV (21-10-2026): MALVARADO, perfil TERRENO_OSORNO_COMBUSTIBLE, bodega 60000364.
describe('venta de combustible (ZV15)', () => {
  it('debería reconocer la clase ZV15', () => {
    expect(esVentaCombustible('ZV15')).toBe(true);
    expect(esVentaCombustible(' zv15 ')).toBe(true);
    expect(esVentaCombustible('ZV01')).toBe(false);
    expect(esVentaCombustible(undefined)).toBe(false);
  });

  it('debería permitir a un vendedor VT con bodega móvil', () => {
    const v = armarVendedorTerreno('MALVARADO', { IdRol: 'TERRENO_OSORNO_COMBUSTIBLE', PerfilVtweg: 'VT' }, { Zvendedor: '60000364' });
    expect(v).toMatchObject({ esVendedorTerreno: true, bodegaMovil: '60000364' });
    expect(validarVendedorTerreno(v)).toBeNull();
  });

  it('debería rechazar al vendedor VT sin bodega móvil con un mensaje claro', () => {
    const v = armarVendedorTerreno('NUEVO', { IdRol: 'TERRENO_OSORNO', PerfilVtweg: 'VT' }, null);
    expect(validarVendedorTerreno(v)).toMatch(/no tiene bodega móvil asignada/);
  });

  it('debería rechazar perfiles que no son de terreno y usuarios sin perfil SAP', () => {
    expect(validarVendedorTerreno(armarVendedorTerreno('SROSALES', { IdRol: 'MESON_OSORNO_AGRICOLA', PerfilVtweg: 'VM' }, null)))
      .toMatch(/solo para vendedores de terreno \(canal VT\).*canal VM/);
    expect(validarVendedorTerreno(armarVendedorTerreno('admin', null, null))).toMatch(/no está en Usuarios_pos/);
    expect(validarVendedorTerreno(armarVendedorTerreno('', null, null))).toMatch(/No se identificó/);
  });

  it('debería usar la fecha de hoy en Chile (medianoche UTC), también de noche', () => {
    // 21-10-2026 23:30 en Chile = 22-10-2026 02:30 UTC: debe seguir siendo el 21
    expect(fechaPedidoSap(new Date('2026-10-22T02:30:00Z'))).toBe(`/Date(${Date.UTC(2026, 9, 21)})/`);
  });

  it('debería sumar la cantidad confirmada de las líneas de reparto (respuesta real de DEV)', () => {
    const simulacion = { to_Item: { results: [
      { SalesOrderItem: '10', Material: '91000001', RequestedQuantity: '10.000',
        to_ScheduleLine: { results: [{ ConfdOrderQtyByMatlAvailCheck: '10.000' }] } },
      { SalesOrderItem: '000020', Material: '91000001', RequestedQuantity: '5', to_ScheduleLine: { results: [{ ConfdOrderQtyByMatlAvailCheck: '0.000' }] } },
    ] } };
    expect(cantidadesConfirmadas(simulacion)).toEqual([
      { posicion: '10', material: '91000001', pedida: 10, confirmada: 10 },
      { posicion: '20', material: '91000001', pedida: 5, confirmada: 0 },
    ]);
    expect(cantidadesConfirmadas(null)).toEqual([]);
  });
});
