import type { IParametroGeneral } from '@/services/api/posMaestros'

// Buscar y ordenar la tabla de Maestros POS > Parámetros. Se hace en el navegador
// sobre los parámetros ya cargados (no vuelve a consultar el backend).

export type ColumnaOrdenParametro = 'clave' | 'valor' | 'descripcion'
export type DireccionOrden = 'asc' | 'desc'

export interface IOrdenParametros {
  columna: ColumnaOrdenParametro
  direccion: DireccionOrden
}

export const ORDEN_PARAMETROS_DEFECTO: IOrdenParametros = { columna: 'clave', direccion: 'asc' }

// Sin mayúsculas ni tildes: "parametro" encuentra "Parámetro".
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function filtrarParametros(parametros: IParametroGeneral[], filtro: string): IParametroGeneral[] {
  const texto = normalizar(filtro.trim())
  if (!texto) return parametros
  return parametros.filter((p) =>
    [p.clave, p.valor, p.descripcion].some((campo) => normalizar(campo ?? '').includes(texto)),
  )
}

// Orden natural ("10" después de "9"), sin distinguir mayúsculas ni tildes.
export function ordenarParametros(parametros: IParametroGeneral[], orden: IOrdenParametros): IParametroGeneral[] {
  const signo = orden.direccion === 'asc' ? 1 : -1
  return [...parametros].sort((a, b) =>
    signo * String(a[orden.columna] ?? '').localeCompare(String(b[orden.columna] ?? ''), 'es', { numeric: true, sensitivity: 'base' }),
  )
}

// Clic en la misma columna invierte la dirección; en otra columna parte ascendente.
export function siguienteOrdenParametros(actual: IOrdenParametros, columna: ColumnaOrdenParametro): IOrdenParametros {
  if (actual.columna === columna) return { columna, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
  return { columna, direccion: 'asc' }
}
