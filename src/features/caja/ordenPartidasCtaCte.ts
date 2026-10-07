import type { IPartidaCtaCte } from '@/types/ctaCte'

// Orden de la grilla de Pago Cta. Cte. Se ordena en el navegador sobre las
// partidas ya consultadas a SAP (no vuelve a consultar).

export type ColumnaOrdenCtaCte =
  | 'estado' | 'sucursal' | 'tipoDocumento' | 'documento' | 'folio' | 'moneda'
  | 'monto' | 'monedaDocumento' | 'montoDocumento' | 'fechaVencimiento' | 'bloqueoPago'

export type DireccionOrden = 'asc' | 'desc'

export interface IOrdenCtaCte {
  columna: ColumnaOrdenCtaCte
  direccion: DireccionOrden
}

// Por defecto: fecha de vencimiento más próxima primero.
export const ORDEN_CTACTE_DEFECTO: IOrdenCtaCte = { columna: 'fechaVencimiento', direccion: 'asc' }

type Valor = string | number

// Estado ascendente = más días de mora primero; las ya pagadas (pendientes de
// compensación) al final.
function valorEstado(p: IPartidaCtaCte): number {
  return p.pagoPendiente ? Number.MAX_SAFE_INTEGER : -p.diasMora
}

function valorColumna(p: IPartidaCtaCte, columna: ColumnaOrdenCtaCte): Valor {
  switch (columna) {
    case 'estado': return valorEstado(p)
    case 'tipoDocumento': return `${p.tipoDocumento} ${p.tipoDocumentoNombre}`
    case 'monto': return p.monto
    case 'montoDocumento': return p.montoDocumento
    default: return p[columna] ?? ''
  }
}

function comparar(a: Valor, b: Valor): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
}

/**
 * Devuelve una copia ordenada. Los valores vacíos (sin fecha, sin folio…) van
 * siempre al final; los empates se resuelven por vencimiento y N° documento
 * para que el orden sea estable.
 */
export function ordenarPartidasCtaCte(partidas: IPartidaCtaCte[], orden: IOrdenCtaCte): IPartidaCtaCte[] {
  const signo = orden.direccion === 'asc' ? 1 : -1
  return [...partidas].sort((a, b) => {
    const va = valorColumna(a, orden.columna)
    const vb = valorColumna(b, orden.columna)
    const vaVacio = va === ''
    const vbVacio = vb === ''
    if (vaVacio !== vbVacio) return vaVacio ? 1 : -1
    const principal = vaVacio ? 0 : comparar(va, vb) * signo
    if (principal !== 0) return principal
    return comparar(a.fechaVencimiento, b.fechaVencimiento) || comparar(a.documento, b.documento)
  })
}

/** Clic en una cabecera: misma columna invierte la dirección; otra columna parte ascendente. */
export function siguienteOrden(actual: IOrdenCtaCte, columna: ColumnaOrdenCtaCte): IOrdenCtaCte {
  if (actual.columna === columna) {
    return { columna, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
  }
  return { columna, direccion: 'asc' }
}
