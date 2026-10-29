import { describe, it, expect } from 'vitest';
import { normalizarUnidadMedida, validarUnidadMedida, mensajeDuplicadoUnidad } from './unidadMedida';

describe('maestro de unidades de medida', () => {
  it('debería normalizar códigos a mayúsculas y opcionales vacíos a null', () => {
    expect(normalizarUnidadMedida({ msehi: ' st ', mseh3: 'un', mseh6: '', texto_corto: ' Unidad ', texto_largo: '' })).toEqual({
      msehi: 'ST', mseh3: 'UN', mseh6: null, texto_corto: 'Unidad', texto_largo: null,
    });
  });

  it('al editar debería tomar el código de la ruta, no del cuerpo', () => {
    expect(normalizarUnidadMedida({ msehi: 'XX', mseh3: 'CJ' }, 'kar').msehi).toBe('KAR');
  });

  it('debería aceptar una unidad válida', () => {
    expect(validarUnidadMedida(normalizarUnidadMedida({ msehi: 'TO', mseh3: 'TON', mseh6: 'TON', texto_corto: 'Tonelada', texto_largo: 'Tonelada' }))).toBeNull();
  });

  it('debería rechazar códigos o textos fuera del largo de la tabla', () => {
    const base = { msehi: 'ST', mseh3: 'UN' };
    expect(validarUnidadMedida(normalizarUnidadMedida({ ...base, msehi: '' }))).toMatch(/código SAP/);
    expect(validarUnidadMedida(normalizarUnidadMedida({ ...base, msehi: 'ABCD' }))).toMatch(/código SAP/);
    expect(validarUnidadMedida(normalizarUnidadMedida({ ...base, mseh3: '' }))).toMatch(/código comercial/);
    expect(validarUnidadMedida(normalizarUnidadMedida({ ...base, mseh6: 'ABCDEFG' }))).toMatch(/técnico/);
    expect(validarUnidadMedida(normalizarUnidadMedida({ ...base, texto_corto: 'Centímetros' }))).toMatch(/10 caracteres/);
    expect(validarUnidadMedida(normalizarUnidadMedida({ ...base, texto_largo: 'x'.repeat(31) }))).toMatch(/30 caracteres/);
  });

  it('debería explicar qué está duplicado', () => {
    const u = normalizarUnidadMedida({ msehi: 'ST', mseh3: 'UN' });
    expect(mensajeDuplicadoUnidad('ux_unidad_mseh3', u)).toBe('El código comercial UN ya está asignado a otra unidad');
    expect(mensajeDuplicadoUnidad('sap_unidad_medida_pkey', u)).toBe('La unidad ST ya existe');
  });
});
