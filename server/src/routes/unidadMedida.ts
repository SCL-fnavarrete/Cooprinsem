// Maestro de unidades de medida (tabla sap_unidad_medida, de Arquitectura): validación
// del CRUD de Admin > Maestros POS (30-10-2026). Funciones puras, testeadas.
// Llave: msehi (código interno SAP) + spras (idioma, siempre "S" desde el POS).

export const IDIOMA_UNIDAD_MEDIDA = 'S';

export interface IUnidadMedida {
  msehi: string;
  mseh3: string;
  mseh6: string | null;
  texto_corto: string | null;
  texto_largo: string | null;
}

const CODIGO = /^[A-Z0-9]{1,3}$/;
const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Normaliza el cuerpo: códigos en mayúsculas, opcionales vacíos como null. */
export function normalizarUnidadMedida(body: Record<string, unknown>, msehi?: string): IUnidadMedida {
  const opcional = (v: unknown) => texto(v) || null;
  return {
    msehi: texto(msehi ?? body.msehi).toUpperCase(),
    mseh3: texto(body.mseh3).toUpperCase(),
    mseh6: opcional(body.mseh6)?.toUpperCase() ?? null,
    texto_corto: opcional(body.texto_corto),
    texto_largo: opcional(body.texto_largo),
  };
}

/** Mensaje del primer error o null si la unidad es válida (largos de la tabla). */
export function validarUnidadMedida(u: IUnidadMedida): string | null {
  if (!CODIGO.test(u.msehi)) return 'El código SAP debe tener de 1 a 3 caracteres (letras o números)';
  if (!CODIGO.test(u.mseh3)) return 'El código comercial es obligatorio: de 1 a 3 caracteres (letras o números)';
  if (u.mseh6 && !/^[A-Z0-9]{1,6}$/.test(u.mseh6)) return 'El código técnico debe tener hasta 6 caracteres (letras o números)';
  if (u.texto_corto && u.texto_corto.length > 10) return 'El texto corto admite hasta 10 caracteres';
  if (u.texto_largo && u.texto_largo.length > 30) return 'El texto largo admite hasta 30 caracteres';
  return null;
}

/** Mensaje para un duplicado de PostgreSQL (23505) según el índice que lo rechazó. */
export function mensajeDuplicadoUnidad(constraint: string | undefined, u: IUnidadMedida): string {
  if (constraint === 'ux_unidad_mseh3') return `El código comercial ${u.mseh3} ya está asignado a otra unidad`;
  return `La unidad ${u.msehi} ya existe`;
}
