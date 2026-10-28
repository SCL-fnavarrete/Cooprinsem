import { describe, it, expect } from 'vitest';
import {
  construirBodyPagoCompensacion, validarCuadre, mensajeErrorPago, montoSap, clienteSinCeros,
  construirBodyPagoResidual, validarPagoResidual, validarCuadreResidual,
  construirBodyPagoAnticipo, validarPagoAnticipo, validarCuadreAnticipo,
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

// Caso "Pago Residual" de la documentación de Javier (19-10-2026): factura
// 1800000041 de 6.490, cliente 10000003, cobro 3.000. La cuenta de la clave 09
// es el cliente CME del cajero (respuesta de José). Formato de la guía de
// Javier (28-10-2026): results, Count "1", sin SglInd ni Assignment.
describe('construirBodyPagoResidual', () => {
  const OP = {
    factura: { documento: '1800000041', ejercicio: '2026', monto: 6490, vencimiento: '2026-11-15' },
    cliente: '0010000003',
    clienteCmeCajero: '10128704',
    montoCobrado: 3000,
    refDocNo: 'CAJ-D190-000020',
    fecha: { anio: '2026', mes: '10', dia: '19' },
  };

  it('debería armar las claves 09 + 04 con results, sin SglInd ni Assignment', () => {
    expect(construirBodyPagoResidual(OP)).toEqual({
      CompCode: 'COOP', DocDate: '20261019', PstngDate: '20261019', DocType: 'DW', RefDocNo: 'CAJ-D190-000020',
      Currency: 'CLP', FiscYear: '2026', FisPeriod: '10',
      to_Positions: { results: [
        { Count: '1', PostingKey: '09', Account: '10128704', Amount: '3000.00', Text: 'PAGO PARCIAL 1800000041', SglInd: '', DueDate: '20261019', Assignment: '' },
        { Count: '2', PostingKey: '04', Account: '10000003', Amount: '3490.00', Text: 'SALDO 1800000041', SglInd: '', DueDate: '20261115', Assignment: '' },
      ] },
      to_Clearing: { results: [{ ItemNo: '1', AccountingDocument: '1800000041', FiscalYear: '2026' }] },
    });
  });

  // Caso real rechazado con F5/263 (19-10-2026): factura 1800000011 de 6.490, cobro 2.000
  it('debería enviar en la clave 04 el saldo pendiente (factura − cobrado), no la factura completa', () => {
    const body = construirBodyPagoResidual({
      ...OP, montoCobrado: 2000,
      factura: { documento: '1800000011', ejercicio: '2026', monto: 6490, vencimiento: '2026-10-12' },
    });
    expect(body.to_Positions.results.map((p) => p.Amount)).toEqual(['2000.00', '4490.00']);
    expect(validarCuadreResidual(body, 6490)).toBeNull();
  });

  it('debería detectar un body que no cuadra con el saldo de la factura', () => {
    const body = construirBodyPagoResidual(OP);
    const [p1, p2] = body.to_Positions.results;
    const descuadrado = { ...body, to_Positions: { results: [p1, { ...p2, Amount: '6490.00' }] } };
    expect(validarCuadreResidual(descuadrado, 6490)).toMatch(/no cuadra.*9490.*6490/);
  });

  it('debería rechazar un monto igual o mayor al saldo, en cero o con decimales', () => {
    expect(validarPagoResidual({ ...OP, montoCobrado: 6490 })).toMatch(/menor al saldo/);
    expect(validarPagoResidual({ ...OP, montoCobrado: 7000 })).toMatch(/menor al saldo/);
    expect(validarPagoResidual({ ...OP, montoCobrado: 0 })).toMatch(/mayor a 0/);
    expect(validarPagoResidual({ ...OP, montoCobrado: 10.5 })).toMatch(/entero/);
    expect(validarPagoResidual(OP)).toBeNull();
  });

  it('debería exigir el cliente CME del cajero', () => {
    expect(() => construirBodyPagoResidual({ ...OP, clienteCmeCajero: '' })).toThrow(/cliente CME/);
  });

  it('debería rechazar un vencimiento inválido', () => {
    expect(() => construirBodyPagoResidual({ ...OP, factura: { ...OP.factura, vencimiento: '' } })).toThrow(/Fecha inválida/);
  });
});

// Pago de anticipo: ejemplo de la guía de Javier (28-10-2026, doc. 1400000123):
// solicitud 1400000114 del cliente 10000003 por 65.000, en efectivo.
describe('construirBodyPagoAnticipo', () => {
  const OP = {
    solicitud: { documento: '1400000114', ejercicio: '2026', monto: 65000, cliente: '0010000003', vencimiento: '2026-10-28' },
    cuentaMedioPago: '1010504000',
    cuentaComplFxr: '1105000799',
    sucursal: 'D190',
    medio: 'EFECTIVO' as const,
    refDocNo: 'CAJ-D190-000030',
    fecha: { anio: '2026', mes: '10', dia: '28' },
  };

  it('debería armar las claves 41 + 09 (cliente, SglInd 4) + 51 como la guía de Javier', () => {
    expect(construirBodyPagoAnticipo(OP)).toEqual({
      CompCode: 'COOP', DocDate: '20261028', PstngDate: '20261028', DocType: 'DW', RefDocNo: 'CAJ-D190-000030',
      Currency: 'CLP', FiscYear: '2026', FisPeriod: '10',
      to_Positions: { results: [
        { Count: '1', PostingKey: '41', Account: '1010504000', Amount: '65000.00', Text: 'RECAUDACION CAJA D190 EF', SglInd: '', DueDate: '', Assignment: '' },
        { Count: '2', PostingKey: '09', Account: '10000003', Amount: '65000.00', Text: 'RECAUDACION CAJA D190 EF', SglInd: '4', DueDate: '20261028', Assignment: '' },
        { Count: '3', PostingKey: '51', Account: '1105000799', Amount: '65000.00', Text: 'RECAUDACION CAJA D190 EF', SglInd: '', DueDate: '', Assignment: '' },
      ] },
      to_Clearing: { results: [{ ItemNo: '1', AccountingDocument: '1400000114', FiscalYear: '2026' }] },
    });
  });

  it('debería usar el vencimiento de la solicitud en la clave 09 (y hoy si SAP no lo trae)', () => {
    const conVenc = construirBodyPagoAnticipo({ ...OP, solicitud: { ...OP.solicitud, vencimiento: '2026-11-30' } });
    expect(conVenc.to_Positions.results[1].DueDate).toBe('20261130');
    const sinVenc = construirBodyPagoAnticipo({ ...OP, solicitud: { ...OP.solicitud, vencimiento: '' } });
    expect(sinVenc.to_Positions.results[1].DueDate).toBe('20261028');
  });

  it('debería exigir el cliente de la solicitud y cuentas numéricas', () => {
    expect(validarPagoAnticipo({ ...OP, solicitud: { ...OP.solicitud, cliente: '' } })).toMatch(/Cliente de la solicitud/);
    expect(validarPagoAnticipo({ ...OP, cuentaMedioPago: '' })).toMatch(/medio de pago/);
    expect(validarPagoAnticipo({ ...OP, cuentaComplFxr: 'abc' })).toMatch(/FXR/);
    expect(validarPagoAnticipo({ ...OP, solicitud: { ...OP.solicitud, monto: 0 } })).toMatch(/Importe/);
    expect(validarPagoAnticipo(OP)).toBeNull();
  });

  it('debería usar las claves de caja parametrizadas (40/50) en las posiciones 1 y 3', () => {
    const body = construirBodyPagoAnticipo({ ...OP, clavesCaja: { debe: '40', haber: '50' } });
    expect(body.to_Positions.results.map((p) => p.PostingKey)).toEqual(['40', '09', '50']);
    expect(validarCuadreAnticipo(body, 65000, { debe: '40', haber: '50' })).toBeNull();
  });

  it('debería detectar un body que no cuadra con la solicitud', () => {
    const body = construirBodyPagoAnticipo(OP);
    expect(validarCuadreAnticipo(body, 65000)).toBeNull();
    const [p1, p2, p3] = body.to_Positions.results;
    const malo = { ...body, to_Positions: { results: [p1, { ...p2, Amount: '40000.00' }, p3] } };
    expect(validarCuadreAnticipo(malo, 65000)).toMatch(/clave 09 = 40000/);
  });
});
