import { describe, it, expect } from 'vitest';
import {
  tramosPorLargo, filtroTramo, interpretarSeriesSap, mensajeErrorSeriesSap, MOTIVO_NO_DISPONIBLE, MOTIVO_NO_REGISTRADA,
} from './sapSeriesSap';

describe('tramosPorLargo', () => {
  it('debería dejar un solo tramo si Desde y Hasta tienen el mismo largo', () => {
    expect(tramosPorLargo(2008n, 2012n)).toEqual([{ desde: '2008', hasta: '2012' }]);
  });
  it('debería partir el rango por largo (el filtro de SAP compara texto)', () => {
    expect(tramosPorLargo(998n, 1002n)).toEqual([{ desde: '998', hasta: '999' }, { desde: '1000', hasta: '1002' }]);
  });
});

describe('filtroTramo', () => {
  it('debería armar el filtro del ejemplo de Javier', () => {
    expect(filtroTramo('11000074', { desde: '2008', hasta: '2012' }))
      .toBe("Material eq '11000074' and NumeroSerie ge '2008' and NumeroSerie le '2012'");
  });
});

describe('interpretarSeriesSap', () => {
  const base = { material: '11000074', centro: 'D190', largoIngresado: 4 };

  it('debería marcar disponibles, no disponibles y no registradas (datos de DEV)', () => {
    const series = interpretarSeriesSap({
      ...base, inicio: 2007n, fin: 2010n,
      filas: [
        // 2007: no disponible, repetida 3 veces y con DescEstatus "En almacén" (inconsistencia de SAP)
        { NumeroSerie: '2007', Disponible: '', CodigoEstatus: '', DescEstatus: 'En almacén' },
        { NumeroSerie: '2007', Disponible: '', CodigoEstatus: '', DescEstatus: 'En almacén' },
        { NumeroSerie: '2007', Disponible: '', CodigoEstatus: '', DescEstatus: 'En almacén' },
        { NumeroSerie: '2008', Disponible: 'X', CodigoEstatus: 'I0184', DescEstatus: 'En almacén' },
        { NumeroSerie: '2009', Disponible: 'X', CodigoEstatus: 'I0184', DescEstatus: 'En almacén' },
      ],
    });
    expect(series.map((s) => [s.numeroSerie, s.disponible, s.motivo ?? ''])).toEqual([
      ['2007', false, MOTIVO_NO_DISPONIBLE],
      ['2008', true, ''],
      ['2009', true, ''],
      ['2010', false, MOTIVO_NO_REGISTRADA],
    ]);
    expect(series[1]).toMatchObject({ material: '11000074', centro: 'D190', lote: '', almacen: '' });
  });

  it('debería considerar disponible una serie si alguna de sus filas trae Disponible = X', () => {
    const [s] = interpretarSeriesSap({
      ...base, inicio: 2001n, fin: 2001n,
      filas: [{ NumeroSerie: '2001', Disponible: '' }, { NumeroSerie: '2001', Disponible: 'X' }],
    });
    expect(s.disponible).toBe(true);
  });

  it('debería cruzar sin importar los ceros a la izquierda', () => {
    const series = interpretarSeriesSap({
      ...base, largoIngresado: 6, inicio: 2008n, fin: 2009n,
      filas: [{ NumeroSerie: '002008', Disponible: 'X' }],
    });
    expect(series.map((s) => [s.numeroSerie, s.disponible])).toEqual([['002008', true], ['002009', false]]);
  });
});

describe('mensajeErrorSeriesSap', () => {
  it('debería traducir los errores HTTP para el vendedor', () => {
    expect(mensajeErrorSeriesSap(403)).toContain('autorización');
    expect(mensajeErrorSeriesSap(500)).toContain('Error interno de SAP');
    expect(mensajeErrorSeriesSap(undefined)).toContain('No se pudo conectar');
  });
});
