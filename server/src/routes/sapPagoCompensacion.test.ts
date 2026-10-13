import { describe, it, expect } from 'vitest';
import {
  construirBodyPagoCompensacion, validarCuadre, mensajeErrorPago, montoSap, clienteSinCeros,
} from './sapPagoCompensacion';

// Ejemplos de la guía ZCOOP_PAYMENT_SRV v1.0 (A y B validados en SAP DEV).
const BASE = { refDocNo: 'CAJ-D190-000010', cuentaCaja: '1010504000', fecha: { anio: '2026', mes: '10', dia: '12' } };
const FACTURA_A = { documento: '1800000006', ejercicio: '2026', monto: 446 };
const FACTURA_B = { documento: '1800000002', ejercicio: '2026', monto: 19040 };
const FACTURA_C2 = { documento: '1800000005', ejercicio: '2026', monto: 64903 };

describe('construirBodyPagoCompensacion', () => {
  it('debería armar el escenario A (cobro exacto) igual que la guía: solo PK 40 y una factura a compensar', () => {
    const body = construirBodyPagoCompensacion({ ...BASE, facturas: [FACTURA_A] });
    expect(body).toEqual({
      CompCode: 'COOP', DocDate: '20261012', PstngDate: '20261012', DocType: 'DW',
      RefDocNo: 'CAJ-D190-000010', Currency: 'CLP', FiscYear: '2026', FisPeriod: '10',
      to_Positions: { results: [
        { Count: '1', PostingKey: '40', Account: '1010504000', Amount: '446.00', Text: 'COBRO FACTURA 1800000006' },
      ] },
      to_Clearing: { results: [{ ItemNo: '1', AccountingDocument: '1800000006', FiscalYear: '2026' }] },
    });
  });

  it('debería armar el escenario B (saldo a favor) con PK 40 por lo cobrado y PK 15 por la diferencia', () => {
    const body = construirBodyPagoCompensacion({ ...BASE, facturas: [FACTURA_B], saldoFavor: { cliente: '0010000001', monto: 5960 } });
    expect(body.to_Positions.results).toEqual([
      { Count: '1', PostingKey: '40', Account: '1010504000', Amount: '25000.00', Text: 'COBRO FACTURA 1800000002' },
      { Count: '2', PostingKey: '15', Account: '10000001', Amount: '5960.00', Text: 'SALDO A FAVOR CLIENTE' },
    ]);
    expect(validarCuadre(body, [FACTURA_B])).toBeNull();
  });

  it('debería armar el escenario C (varias facturas) con una sola PK 40 por la suma y una línea de compensación por factura', () => {
    const body = construirBodyPagoCompensacion({ ...BASE, facturas: [FACTURA_B, FACTURA_C2] });
    expect(body.to_Positions.results).toEqual([
      { Count: '1', PostingKey: '40', Account: '1010504000', Amount: '83943.00', Text: 'COBRO CTA CTE 2 FACTURAS' },
    ]);
    expect(body.to_Clearing.results).toEqual([
      { ItemNo: '1', AccountingDocument: '1800000002', FiscalYear: '2026' },
      { ItemNo: '2', AccountingDocument: '1800000005', FiscalYear: '2026' },
    ]);
  });

  it('debería usar el período con 2 dígitos ("01") en enero', () => {
    const body = construirBodyPagoCompensacion({ ...BASE, fecha: { anio: '2027', mes: '01', dia: '05' }, facturas: [FACTURA_A] });
    expect(body.FisPeriod).toBe('01');
    expect(body.DocDate).toBe('20270105');
  });

  it('debería ignorar un saldo a favor en 0 (no envía PK 15)', () => {
    const body = construirBodyPagoCompensacion({ ...BASE, facturas: [FACTURA_A], saldoFavor: { cliente: '10000001', monto: 0 } });
    expect(body.to_Positions.results).toHaveLength(1);
  });

  it('debería rechazar un pago sin facturas', () => {
    expect(() => construirBodyPagoCompensacion({ ...BASE, facturas: [] })).toThrow();
  });
});

describe('validarCuadre (regla R1)', () => {
  it('debería aceptar un pago cuadrado', () => {
    const body = construirBodyPagoCompensacion({ ...BASE, facturas: [FACTURA_A] });
    expect(validarCuadre(body, [FACTURA_A])).toBeNull();
  });

  it('debería detectar que la caja no cuadra con las facturas', () => {
    const body = construirBodyPagoCompensacion({ ...BASE, facturas: [FACTURA_A] });
    body.to_Positions.results[0].Amount = '500.00';
    expect(validarCuadre(body, [FACTURA_A])).toMatch(/no cuadra/);
  });

  it('debería detectar Count repetido', () => {
    const body = construirBodyPagoCompensacion({ ...BASE, facturas: [FACTURA_B], saldoFavor: { cliente: '10000001', monto: 5960 } });
    body.to_Positions.results[1].Count = '1';
    expect(validarCuadre(body, [FACTURA_B])).toMatch(/Count repetido/);
  });
});

describe('montoSap', () => {
  it('debería enviar el CLP entero con dos ceros decimales', () => {
    expect(montoSap(446)).toBe('446.00');
    expect(montoSap(83943)).toBe('83943.00');
  });

  it('debería rechazar montos con decimales o negativos', () => {
    expect(() => montoSap(446.5)).toThrow();
    expect(() => montoSap(-1)).toThrow();
  });
});

describe('clienteSinCeros', () => {
  it('debería quitar los ceros a la izquierda del cliente', () => {
    expect(clienteSinCeros('0010000001')).toBe('10000001');
  });
});

describe('mensajeErrorPago', () => {
  it('debería traducir F5/263 y conservar el mensaje de SAP', () => {
    const msg = mensajeErrorPago('Error en contabilización [sy-subrc=0 e_subrc=1001] F5/263: La diferencia es demasiado grande para una compensación');
    expect(msg).toMatch(/^El monto del pago no cuadra/);
    expect(msg).toContain('F5/263');
  });

  it('debería dejar igual un mensaje desconocido', () => {
    expect(mensajeErrorPago('Otro error')).toBe('Otro error');
  });
});
