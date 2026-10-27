import { describe, it, expect } from 'vitest';
import { siguienteNumeroLibre } from './numeracionClientes';

const sapCon = (ocupados: string[]) => async (n: string) => ocupados.includes(n);

describe('siguienteNumeroLibre (numeración externa ZNAC)', () => {
  it('debería usar el siguiente número si está libre en SAP', async () => {
    expect(await siguienteNumeroLibre(10000043, sapCon([]))).toEqual({ numero: '10000044', saltados: [] });
  });

  it('debería saltar los números ya creados en SAP por otros usuarios', async () => {
    const r = await siguienteNumeroLibre(10000026, sapCon(['10000027', '10000028', '10000029']));
    expect(r).toEqual({ numero: '10000030', saltados: ['10000027', '10000028', '10000029'] });
  });

  it('debería fallar si todos los números revisados están ocupados', async () => {
    await expect(siguienteNumeroLibre(100, async () => true, 3)).rejects.toThrow(/Los 3 números siguientes a 100/);
  });

  it('debería propagar el error si SAP no responde (no asume libre)', async () => {
    await expect(siguienteNumeroLibre(100, async () => { throw new Error('timeout'); })).rejects.toThrow('timeout');
  });
});
