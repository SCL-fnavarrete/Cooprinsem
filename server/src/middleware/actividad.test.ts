import { describe, it, expect } from 'vitest';
import { motivoNoActualizar } from './actividad';

describe('actualización automática: esperar a que no haya actividad', () => {
  const ahora = 1_000_000_000;

  it('sin llamadas desde que arrancó, debería permitir actualizar', () => {
    expect(motivoNoActualizar({ ultimaActividad: 0, enCurso: 0 }, ahora)).toBeNull();
  });

  it('con una llamada en curso (ej. un pago con SAP) no debería actualizar', () => {
    expect(motivoNoActualizar({ ultimaActividad: ahora - 600_000, enCurso: 1 }, ahora)).toMatch(/en curso/);
  });

  it('con actividad hace menos de 2 minutos no debería actualizar', () => {
    expect(motivoNoActualizar({ ultimaActividad: ahora - 30_000, enCurso: 0 }, ahora)).toMatch(/hace 30 s/);
  });

  it('tras 2 minutos sin uso debería permitir actualizar', () => {
    expect(motivoNoActualizar({ ultimaActividad: ahora - 120_000, enCurso: 0 }, ahora)).toBeNull();
  });
});
