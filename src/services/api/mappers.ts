/**
 * Funciones centralizadas de mapping snake_case (backend POC) → camelCase (frontend).
 * Cada mapper acepta ambos formatos con fallback para compatibilidad MSW/backend.
 *
 * Antes: mapCliente en clientes.ts, mapMaterial en materiales.ts, mapPartida en facturas.ts
 * Ahora: todos importan desde aquí.
 */

import type { ICliente } from '@/types/cliente'
import type { IArticulo } from '@/types/articulo'
import type { IPartidaAbierta, Semaforo } from '@/types/caja'

// Helper genérico: toma el primer valor no-undefined de las claves
function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (raw[k] !== undefined) return raw[k]
  }
  return undefined
}

export function mapCliente(raw: Record<string, unknown>): ICliente {
  return {
    codigoCliente: String(pick(raw, 'kunnr', 'codigoCliente') ?? ''),
    nombre: String(raw['nombre'] ?? ''),
    rut: String(raw['rut'] ?? ''),
    condicionPago: String(pick(raw, 'condicion_pago', 'condicionPago') ?? 'CONT'),
    estadoCredito: (pick(raw, 'estado_credito', 'estadoCredito') ?? 'AL_DIA') as ICliente['estadoCredito'],
    creditoAsignado: Number(pick(raw, 'credito_asignado', 'creditoAsignado') ?? 0),
    creditoUtilizado: Number(pick(raw, 'credito_utilizado', 'creditoUtilizado') ?? 0),
    porcentajeAgotamiento: Number(pick(raw, 'porcentaje_agotamiento', 'porcentajeAgotamiento') ?? 0),
    sucursal: String(raw['sucursal'] ?? 'D190'),
  }
}

export function mapMaterial(raw: Record<string, unknown>): IArticulo {
  return {
    codigoMaterial: String(pick(raw, 'matnr', 'codigoMaterial') ?? ''),
    descripcion: String(raw['descripcion'] ?? ''),
    precioUnitario: Number(pick(raw, 'precio_unitario', 'precioUnitario') ?? 0),
    unidadMedida: String(pick(raw, 'unidad_medida', 'unidadMedida') ?? 'UN'),
    stockDisponible: Number(pick(raw, 'stock_disponible', 'stockDisponible') ?? 0),
    centro: String(raw['centro'] ?? 'D190'),
    almacen: String(raw['almacen'] ?? 'B000'),
  }
}

export function mapPartida(raw: Record<string, unknown>): IPartidaAbierta {
  const diasMora = Number(pick(raw, 'dias_mora', 'diasMora') ?? 0)
  const fechaVenc = String(pick(raw, 'fecha_venc', 'fechaVenc') ?? '')
  const estado = String(raw['estado'] ?? 'ABIERTO')

  return {
    belnr: String(raw['belnr'] ?? ''),
    kunnr: String(raw['kunnr'] ?? ''),
    claseDoc: String(pick(raw, 'clase_doc', 'claseDoc') ?? 'FV'),
    fechaDoc: String(pick(raw, 'fecha_doc', 'fechaDoc') ?? ''),
    fechaVenc,
    importe: Number(raw['importe'] ?? 0),
    estado: estado as IPartidaAbierta['estado'],
    diasMora,
    semaforo: (raw['semaforo'] ?? calcSemaforo(diasMora, fechaVenc, estado)) as Semaforo,
  }
}

function calcSemaforo(diasMora: number, fechaVenc: string, estado?: string): Semaforo {
  if (estado === 'PAGADO') return 'pagada'
  if (diasMora > 0) return 'rojo'
  const venc = new Date(fechaVenc)
  const hoy = new Date()
  const diff = Math.floor((venc.getTime() - hoy.getTime()) / 86400000)
  if (diff <= 7) return 'amarillo'
  return 'verde'
}
