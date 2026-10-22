// Estado y columnas de exportación de las partidas de Cuenta Corriente,
// compartidos por la grilla (TablaPartidasCtaCte), Pago Cta. Cte. y E° de Cuenta.
import { formatFecha } from '@/utils/format'
import type { ColumnaExport } from '@/utils/exportarTabla'
import type { IPartidaCtaCte } from '@/types/ctaCte'

// Semáforo (mismo criterio que el listado de Home): vencida si tiene días de
// mora, por vencer si vence en los próximos 7 días, vigente en otro caso.
export function estadoPartida(diasMora: number): { texto: string; color: 'Set1' | 'Set2' | 'Set8' } {
  if (diasMora > 0) return { texto: `Vencida (${diasMora} d)`, color: 'Set1' }
  if (diasMora >= -7) return { texto: 'Por vencer', color: 'Set2' }
  return { texto: 'Vigente', color: 'Set8' }
}

export function estadoMostrado(p: IPartidaCtaCte): { texto: string; color: 'Set1' | 'Set2' | 'Set8' } {
  return p.pagoPendiente ? { texto: 'Pagada · pend. compensación', color: 'Set8' } : estadoPartida(p.diasMora)
}

// Columnas para "Exportar tabla" (las de la grilla, sin Sel.). Montos como número.
export const COLUMNAS_EXPORT_PARTIDAS: ColumnaExport<IPartidaCtaCte>[] = [
  { titulo: 'Estado', valor: (p) => estadoMostrado(p).texto },
  { titulo: 'Sucursal', valor: (p) => p.sucursal || 'No informado' },
  { titulo: 'Tipo documento', valor: (p) => p.tipoDocumentoNombre || p.tipoDocumento },
  { titulo: 'Nº Documento SAP', valor: (p) => p.documento },
  { titulo: 'Folio', valor: (p) => p.folio },
  { titulo: 'Moneda', valor: (p) => p.moneda },
  { titulo: 'Monto', valor: (p) => p.monto },
  { titulo: 'Moneda Doc.', valor: (p) => p.monedaDocumento },
  { titulo: 'Monto Doc.', valor: (p) => p.montoDocumento },
  { titulo: 'Fecha documento', valor: (p) => (p.fechaDocumento ? formatFecha(p.fechaDocumento) : '') },
  { titulo: 'Fecha de vencimiento', valor: (p) => (p.fechaVencimiento ? formatFecha(p.fechaVencimiento) : '') },
  { titulo: 'Bloqueo pago', valor: (p) => (p.bloqueoPago ? `Bloqueado (${p.bloqueoPago})` : 'Autorizado el pago') },
]
