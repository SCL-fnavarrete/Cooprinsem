// Caja > E° de Cuenta — filas y totales del PDF (formato de los ejemplos de
// Cooprinsem: "Agricola Laguna Verde al 11-12-2025" y "Estado de cuenta ejemplo
// completo"). Funciones puras: sin pantalla ni SAP, testeadas.
import type { IPartidaCtaCte } from '@/types/ctaCte'

// Dato sin fuente todavía (a revisar con Arquitectura).
export const DATO_PENDIENTE = 'DATO PENDIENTE'

export const valorOPendiente = (v: string | null | undefined): string => {
  const t = String(v ?? '').trim()
  return t || DATO_PENDIENTE
}

/** "2025-11-03" → "03.11.25" (columnas de fecha del PDF). */
export function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : ''
}

/** "2025-12-11" → "11.12.2025" ("Estado de Cuenta al …"). */
export function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

/** CLP entero con punto de miles y sin signo $ (columnas Monto y Saldo): 1234567 → "1.234.567". */
export function montoTabla(monto: number): string {
  return Math.round(monto).toLocaleString('es-CL')
}

/** Hoy en Chile (YYYY-MM-DD); de noche UTC ya es mañana. */
export function hoyChileISO(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora)
}

export interface IFilaCuentaCorriente {
  destino: string
  nroDocumento: string     // folio SII (DocumentReferenceID); en blanco si SAP no lo trae
  nroDoctoInterno: string  // N° documento SAP
  clase: string
  oficina: string
  cuotas: string
  fechaEmision: string     // dd.mm.aa
  fechaVencimiento: string // dd.mm.aa
  acc: string
  moneda: string
  monto: number
  saldo: number            // acumulado fila a fila
}

/**
 * Filas de "Cuenta Corriente" en el orden recibido (el de la tabla en pantalla),
 * con saldo acumulado. Destin. y ACC. no tienen fuente todavía: van en blanco; Cuotas "1 de 1"
 * (los documentos en cuotas no se listan: su pago está pendiente de definir).
 */
export function filasCuentaCorriente(partidas: IPartidaCtaCte[], nombreOficina: (codigo: string) => string): IFilaCuentaCorriente[] {
  let saldo = 0
  return partidas.map((p) => {
    saldo += p.monto
    return {
      destino: '',
      nroDocumento: p.folio,
      nroDoctoInterno: p.documento,
      clase: p.tipoDocumentoNombre || p.tipoDocumento,
      oficina: p.sucursal ? (nombreOficina(p.sucursal) || p.sucursal) : '',
      cuotas: '1 de 1',
      fechaEmision: fechaCorta(p.fechaDocumento),
      fechaVencimiento: fechaCorta(p.fechaVencimiento),
      acc: '',
      moneda: p.moneda,
      monto: p.monto,
      saldo,
    }
  })
}

export interface IConsolidadoDeuda {
  protestados: number
  vencida: number        // Cuenta Corriente con vencimiento anterior a la fecha del estado de cuenta
  totalVencida: number   // protestados + vencida
  porVencer: number
  cartera: number
  totalGeneral: number
}

/**
 * "Detalle Consolidado de Deuda" según lo que va en el PDF. Vencida = vence
 * antes de la fecha del estado de cuenta (ej. al 20.07.2026, lo que vence el
 * 12.07.26 es vencido y lo que vence el 12.08.26 es por vencer).
 */
export function consolidadoDeuda(op: {
  protestados: number[]
  cuentaCorriente: Pick<IPartidaCtaCte, 'monto' | 'fechaVencimiento'>[]
  cartera: number[]
  fecha: string  // YYYY-MM-DD
}): IConsolidadoDeuda {
  const suma = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
  const protestados = suma(op.protestados)
  const vencida = suma(op.cuentaCorriente.filter((p) => p.fechaVencimiento && p.fechaVencimiento < op.fecha).map((p) => p.monto))
  const porVencer = suma(op.cuentaCorriente.filter((p) => !(p.fechaVencimiento && p.fechaVencimiento < op.fecha)).map((p) => p.monto))
  const cartera = suma(op.cartera)
  return {
    protestados,
    vencida,
    totalVencida: protestados + vencida,
    porVencer,
    cartera,
    totalGeneral: protestados + vencida + porVencer + cartera,
  }
}
