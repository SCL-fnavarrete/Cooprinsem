import { describe, it, expect } from 'vitest';
import {
  fechaEntregaValida, errorFechasEntrega, fechaODataSap, fechaDesdeODataSap, cambiosFechaEntrega,
} from './fechasEntregaPedido';

describe('fecha de entrega por posición', () => {
  // 27-10-2026 01:00 UTC = 26-10-2026 en Chile
  const nocheUtc = new Date('2026-10-27T01:00:00Z');

  it('debería validar fechas reales en formato AAAA-MM-DD', () => {
    expect(fechaEntregaValida('2026-10-29')).toBe('2026-10-29');
    expect(fechaEntregaValida('2026-02-31')).toBeNull();
    expect(fechaEntregaValida('29-10-2026')).toBeNull();
  });

  it('debería rechazar fechas pasadas (día de Chile) y aceptar vacías', () => {
    expect(errorFechasEntrega([{ fechaEntrega: '2026-10-26' }, { fechaEntrega: '' }], nocheUtc)).toBeNull();
    expect(errorFechasEntrega([{}, { fechaEntrega: '2026-10-25' }], nocheUtc)).toMatch(/Posición 20.*anterior a hoy/);
    expect(errorFechasEntrega([{ fechaEntrega: 'x' }], nocheUtc)).toMatch(/Posición 10.*inválida/);
  });

  it('debería convertir a y desde el formato de fecha de SAP (pedido 133)', () => {
    expect(fechaODataSap('2026-10-29')).toBe('/Date(1793232000000)/');
    expect(fechaDesdeODataSap('/Date(1793836800000)/')).toBe('2026-11-05');
  });

  it('debería pedir cambio solo en las líneas de reparto con otra fecha', () => {
    const itemsSap = [
      { SalesOrderItem: '10', Material: '14700006', to_ScheduleLine: { results: [{ ScheduleLine: '1', RequestedDeliveryDate: '/Date(1793059200000)/' }] } },
      { SalesOrderItem: '20', Material: '14700007', to_ScheduleLine: { results: [{ ScheduleLine: '1', RequestedDeliveryDate: '/Date(1793059200000)/' }] } },
    ];
    const items = [
      { codigoMaterial: '14700006', fechaEntrega: '2026-10-29' },
      { codigoMaterial: '14700007', fechaEntrega: '2026-10-27' }, // ya es la fecha de SAP
    ];
    expect(cambiosFechaEntrega(items, itemsSap)).toEqual([{ posicion: '10', lineaReparto: '1', fecha: '2026-10-29', etag: undefined }]);
  });

  it('no debería cambiar nada si el material no calza con la posición', () => {
    const itemsSap = [{ SalesOrderItem: '10', Material: '99999999', to_ScheduleLine: { results: [{ ScheduleLine: '1', RequestedDeliveryDate: '/Date(0)/' }] } }];
    expect(cambiosFechaEntrega([{ codigoMaterial: '14700006', fechaEntrega: '2026-10-29' }], itemsSap)).toEqual([]);
  });
});
