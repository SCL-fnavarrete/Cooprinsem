import { describe, it, expect } from 'vitest';
import { armarArbolInterlocutores, armarInterlocutoresFicha, codigosPorFuncion, type IInterlocutorFila } from './interlocutoresArbol';

const fila = (Customer: string, PartnerFunction: string, BPCustomerNumber: string): IInterlocutorFila =>
  ({ Customer, PartnerFunction, BPCustomerNumber });

const interlocutores = [
  fila('10000003', 'SP', '10000003'),
  fila('10000003', 'SH', '10000003'),
  fila('10000003', 'SH', '80000344'),
  fila('10000003', 'SH', '80000344'), // misma relación en otra área de venta
  fila('80000344', 'ZB', '90001429'),
  fila('80000344', 'ZB', '90001424'),
  fila('80000344', 'ZB', '90001424'),
];

const clientes = [
  { Customer: '10000003', BusinessPartner: '10000003', CustomerName: 'Sergio Cutiño', CliRut: '16029421-3' },
  { Customer: '80000344', BusinessPartner: '80000344', CustomerName: 'WERNER SCHEEL OTTO', CliRut: '5455438-9' },
  { Customer: '90001424', BusinessPartner: '90001424', CustomerName: 'WELLMANN WERNER MARTIN', CliRut: '5455438-9' },
  { Customer: '90001429', BusinessPartner: '90001429', CustomerName: 'BASTIAS BILBAO CARLOS', CliRut: '10073678-0' },
];

describe('árbol de destinatarios y personas que retiran', () => {
  it('debería quitar las relaciones repetidas por área de venta', () => {
    expect(codigosPorFuncion(interlocutores, '10000003', 'SH')).toEqual(['10000003', '80000344']);
    expect(codigosPorFuncion(interlocutores, '0080000344', 'ZB')).toEqual(['90001429', '90001424']);
  });

  it('debería poner al propio cliente primero y las personas de cada destinatario por nombre', () => {
    const arbol = armarArbolInterlocutores({
      cliente: '10000003',
      interlocutores,
      clientes,
      direcciones: [{ BusinessPartner: '80000344', StreetName: 'FUNDO EL ROBLE', District: 'OSORNO', CityName: 'OSORNO', Region: '10' }],
      regiones: new Map([['10', 'X - De Los Lagos']]),
    });
    expect(arbol.map((d) => d.codigo)).toEqual(['10000003', '80000344']);
    expect(arbol[0].personasRetira).toEqual([]);
    expect(arbol[1]).toMatchObject({ nombre: 'WERNER SCHEEL OTTO', direccion: 'FUNDO EL ROBLE', region: 'X - De Los Lagos' });
    expect(arbol[1].personasRetira.map((p) => p.nombre)).toEqual(['BASTIAS BILBAO CARLOS', 'WELLMANN WERNER MARTIN']);
  });

  it('sin destinatarios debería devolver una lista vacía', () => {
    expect(armarArbolInterlocutores({ cliente: '1', interlocutores: [], clientes: [], direcciones: [], regiones: new Map() })).toEqual([]);
  });
});

describe('interlocutores de la ficha del cliente', () => {
  it('debería listar cada función una vez, en orden, con las personas que retiran bajo su destinatario', () => {
    const ficha = armarInterlocutoresFicha({
      cliente: '0010000003',
      interlocutores: [fila('10000003', 'BU', '1'), fila('10000003', 'PY', '10000003'), fila('10000003', 'BP', '10000003'), ...interlocutores],
      clientes,
    });
    expect(ficha.map((i) => [i.funcion, i.codigo, i.destinatario ?? ''])).toEqual([
      ['SP', '10000003', ''],
      ['BP', '10000003', ''],
      ['PY', '10000003', ''],
      ['SH', '10000003', ''],
      ['SH', '80000344', ''],
      ['ZB', '90001429', '80000344'],
      ['ZB', '90001424', '80000344'],
      ['BU', '1', ''],
    ]);
    expect(ficha[4]).toMatchObject({ descripcion: 'Destinatario mercancía', nombre: 'WERNER SCHEEL OTTO', rut: '5455438-9' });
    expect(ficha[5].descripcion).toBe('Persona retira');
    expect(ficha[7]).toMatchObject({ descripcion: 'BU', nombre: '' });
  });

  it('sin interlocutores debería devolver una lista vacía', () => {
    expect(armarInterlocutoresFicha({ cliente: '1', interlocutores: [], clientes: [] })).toEqual([]);
  });
});
