import type { ILineaPedido } from '@/types/pedido'
import type { ISerieAsignada, ISerieValidada } from '@/types/serie'

export type EstadoSerie = 'asignada' | 'disponible' | 'no-disponible' | 'repetida'

export interface IResultadoAsignacion {
  // Cada serie del rango con su estado, en orden numérico.
  series: (ISerieValidada & { estado: EstadoSerie })[]
  asignadas: ISerieAsignada[]
  requeridas: number
  libres: number           // Disponibles y no usadas en otra línea del pedido
  suficientes: boolean     // libres >= requeridas
}

function compararSeries(a: string, b: string): number {
  const ba = BigInt(a)
  const bb = BigInt(b)
  return ba < bb ? -1 : ba > bb ? 1 : 0
}

/**
 * Regla de negocio (respuestas de José Castillo, 2026-10-01):
 *   - Se asignan automáticamente las primeras series libres del rango, en
 *     orden numérico, hasta completar la cantidad de la línea.
 *   - Una serie ya asignada a otra línea del mismo pedido no puede repetirse.
 *   - Si el rango no tiene suficientes series libres, no se puede confirmar.
 */
export function asignarPrimerasLibres(
  series: ISerieValidada[],
  cantidad: number,
  usadasEnOtrasLineas: ReadonlySet<string> = new Set(),
): IResultadoAsignacion {
  const ordenadas = [...series].sort((a, b) => compararSeries(a.numeroSerie, b.numeroSerie))
  const asignadas: ISerieAsignada[] = []
  let libres = 0

  const conEstado = ordenadas.map((s) => {
    let estado: EstadoSerie
    if (!s.disponible) {
      estado = 'no-disponible'
    } else if (usadasEnOtrasLineas.has(s.numeroSerie)) {
      estado = 'repetida'
    } else {
      libres++
      if (asignadas.length < cantidad) {
        asignadas.push({ numeroSerie: s.numeroSerie, material: s.material, lote: s.lote, centro: s.centro, almacen: s.almacen })
        estado = 'asignada'
      } else {
        estado = 'disponible'
      }
    }
    return { ...s, estado }
  })

  return { series: conEstado, asignadas, requeridas: cantidad, libres, suficientes: libres >= cantidad }
}

// Series asignadas en las demás líneas del pedido (para no repetirlas).
export function seriesEnOtrasLineas(lineas: ILineaPedido[], posicion: string): Set<string> {
  return new Set(
    lineas.filter((l) => l.posicion !== posicion).flatMap((l) => (l.series ?? []).map((s) => s.numeroSerie))
  )
}

/**
 * Errores que bloquean Grabar. Las series son opcionales: solo se valida la
 * línea que tiene series asignadas.
 */
export function validarSeriesPedido(lineas: ILineaPedido[]): string[] {
  const errores: string[] = []
  const vistas = new Map<string, string>()

  for (const linea of lineas) {
    const series = linea.series ?? []
    if (series.length === 0) continue
    if (series.length !== linea.cantidad) {
      errores.push(`Artículo ${linea.codigoMaterial} (pos. ${linea.posicion}): tiene ${series.length} series y la cantidad es ${linea.cantidad}`)
    }
    for (const s of series) {
      const otraPosicion = vistas.get(s.numeroSerie)
      if (otraPosicion) {
        errores.push(`La serie ${s.numeroSerie} está repetida en las posiciones ${otraPosicion} y ${linea.posicion}`)
      } else {
        vistas.set(s.numeroSerie, linea.posicion)
      }
    }
  }
  return errores
}
