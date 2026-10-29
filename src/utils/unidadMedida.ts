// Texto de la unidad de medida según el maestro sap_unidad_medida (Admin > Maestros
// POS > Unidad Medida). El código llega en dos formatos (verificado en DEV, 30-10-2026):
// el stock trae el interno de SAP (msehi: ST, TO) y la simulación de precios el
// comercial (mseh3: UN). Se busca primero por comercial y luego por interno.
import type { IUnidadMedida } from '@/services/api/posMaestros'

export function buscarUnidad(codigo: string | undefined, unidades: IUnidadMedida[]): IUnidadMedida | undefined {
  const c = (codigo ?? '').trim().toUpperCase()
  if (!c) return undefined
  return unidades.find((u) => u.mseh3 === c) ?? unidades.find((u) => u.msehi === c)
}

/** Texto corto de la unidad; sin dato en el maestro, el mismo código. */
export function textoUnidad(codigo: string | undefined, unidades: IUnidadMedida[]): string {
  return buscarUnidad(codigo, unidades)?.texto_corto?.trim() || (codigo ?? '')
}

/** Tooltip: texto largo y código (el texto corto viene cortado a 10 caracteres). */
export function tooltipUnidad(codigo: string | undefined, unidades: IUnidadMedida[]): string {
  const largo = buscarUnidad(codigo, unidades)?.texto_largo?.trim()
  return largo ? `${largo} (${codigo})` : (codigo ?? '')
}

/** "ST - Unidad" en las sugerencias del buscador; sin texto, solo el código. */
export function codigoYTextoUnidad(codigo: string | undefined, unidades: IUnidadMedida[]): string {
  const texto = textoUnidad(codigo, unidades)
  return texto && texto !== codigo ? `${codigo} - ${texto}` : (codigo ?? '')
}
