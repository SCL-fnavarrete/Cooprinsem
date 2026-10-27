// Fecha de entrega por posición del pedido (27-10-2026). Funciones puras, testeadas.
//
// Probado en DEV (pedido 133): SAP NO acepta la línea de reparto (to_ScheduleLine)
// al crear el pedido ("No debe actualizar repartos con solicitudes 'Inserción
// profunda'": la ignora y pone la fecha de hoy). Sí acepta, una vez creado, un
// PATCH a A_SalesOrderScheduleLine con RequestedDeliveryDate. Por eso la fecha se
// actualiza después de crear, solo en las líneas cuya fecha difiere de la de SAP.

/** "2026-10-29" si la fecha es real; null si no. */
export function fechaEntregaValida(valor: unknown): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor ?? '').trim());
  if (!m) return null;
  const [, anio, mes, dia] = m;
  const d = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  if (d.getUTCDate() !== Number(dia) || d.getUTCMonth() !== Number(mes) - 1) return null;
  return `${anio}-${mes}-${dia}`;
}

/** Hoy en Chile, "2026-10-27". */
export function hoyChileISO(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora);
}

/** Motivo de rechazo de las fechas de las posiciones (inválidas o pasadas), o null. */
export function errorFechasEntrega(items: { fechaEntrega?: unknown }[], ahora = new Date()): string | null {
  const hoy = hoyChileISO(ahora);
  for (let i = 0; i < items.length; i++) {
    const valor = items[i]?.fechaEntrega;
    if (valor === undefined || valor === null || valor === '') continue;
    const fecha = fechaEntregaValida(valor);
    if (!fecha) return `Posición ${(i + 1) * 10}: fecha de entrega inválida`;
    if (fecha < hoy) return `Posición ${(i + 1) * 10}: la fecha de entrega no puede ser anterior a hoy`;
  }
  return null;
}

/** Fecha OData V2 de SAP: "2026-10-29" → "/Date(1793232000000)/". */
export function fechaODataSap(iso: string): string {
  return `/Date(${Date.parse(`${iso}T00:00:00Z`)})/`;
}

/** "/Date(1793232000000)/" → "2026-10-29" ("" si no se puede leer). */
export function fechaDesdeODataSap(valor: unknown): string {
  const m = /\/Date\((-?\d+)/.exec(String(valor ?? ''));
  return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : '';
}

export interface ICambioFechaEntrega {
  posicion: string;      // SalesOrderItem de SAP ("10")
  lineaReparto: string;  // ScheduleLine ("1")
  fecha: string;         // "2026-10-29"
  etag?: string;
}

/**
 * Líneas de reparto que hay que actualizar. SAP numera las posiciones en el orden
 * en que se enviaron (10, 20…): se cruzan por orden y se confirma el material.
 */
export function cambiosFechaEntrega(items: { codigoMaterial: string; fechaEntrega?: unknown }[], itemsSap: any[]): ICambioFechaEntrega[] {
  const sinCeros = (s: unknown) => String(s ?? '').trim().replace(/^0+(?=\d)/, '');
  const cambios: ICambioFechaEntrega[] = [];
  items.forEach((item, i) => {
    const fecha = fechaEntregaValida(item.fechaEntrega);
    const sap = itemsSap[i];
    if (!fecha || !sap || sinCeros(sap.Material) !== sinCeros(item.codigoMaterial)) return;
    const lineas: any[] = sap.to_ScheduleLine?.results ?? sap.to_ScheduleLine ?? [];
    for (const l of lineas) {
      if (fechaDesdeODataSap(l.RequestedDeliveryDate) === fecha) continue;
      cambios.push({ posicion: sinCeros(sap.SalesOrderItem), lineaReparto: sinCeros(l.ScheduleLine), fecha, etag: l.__metadata?.etag });
    }
  });
  return cambios;
}
