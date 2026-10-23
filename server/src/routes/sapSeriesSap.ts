// Validación de números de serie contra SAP (PE-23, material seriado DIIO).
// Servicio ZCDS_ZPOS_SERIES_CDS / entidad ZCDS_ZPOS_SERIES (Javier, 21-10-2026;
// guía zpos_consumo_api.html). Solo lectura. Funciones puras, testeadas.
//
// Lo que se observó en DEV (23-10-2026, material 11000074):
//   - El filtro por rango funciona: NumeroSerie ge '2008' and NumeroSerie le '2012'.
//     La comparación es de TEXTO: un rango con largos distintos (ej. 998..1002) se
//     consulta por tramos del mismo largo.
//   - Hay series repetidas (17 vienen 3 veces): se agrupan por número de serie.
//   - Las no disponibles traen DescEstatus "En almacén" con Disponible vacío: solo
//     se confía en Disponible = "X".
//   - El servicio no trae centro ni almacén: todavía no se valida que la serie
//     esté en la sucursal (pendiente con Javier).

export const SERVICIO_SERIES = 'ZCDS_ZPOS_SERIES_CDS';
export const ENTIDAD_SERIES = 'ZCDS_ZPOS_SERIES';

export interface IFilaSerieSap {
  Material?: string;
  NumeroSerie?: string;
  Disponible?: string;
  CodigoEstatus?: string | null;
  DescEstatus?: string | null;
}

export interface ISerieValidadaSap {
  numeroSerie: string;
  material: string;
  lote: string;
  centro: string;
  almacen: string;
  disponible: boolean;
  motivo?: string;
}

export const MOTIVO_NO_REGISTRADA = 'No registrada en SAP para este material';
export const MOTIVO_NO_DISPONIBLE = 'No disponible en almacén (SAP)';
export const ADVERTENCIA_SUCURSAL =
  'SAP todavía no informa el centro ni el almacén de cada serie: no se valida que la serie esté ingresada en la sucursal.';

const sinCeros = (s: string) => s.replace(/^0+(?=\d)/, '');

/**
 * Tramos de igual largo para filtrar por texto. 998..1002 → [998..999, 1000..1002].
 * Los extremos van sin ceros a la izquierda (formato que muestra SAP).
 */
export function tramosPorLargo(inicio: bigint, fin: bigint): { desde: string; hasta: string }[] {
  const tramos: { desde: string; hasta: string }[] = [];
  let actual = inicio;
  while (actual <= fin) {
    const largo = actual.toString().length;
    const tope = 10n ** BigInt(largo) - 1n;
    const hasta = fin < tope ? fin : tope;
    tramos.push({ desde: actual.toString(), hasta: hasta.toString() });
    actual = hasta + 1n;
  }
  return tramos;
}

/** $filter de un tramo. El material va tal cual (en DEV funciona sin ceros). */
export function filtroTramo(material: string, tramo: { desde: string; hasta: string }): string {
  const mat = material.trim().replace(/'/g, "''");
  return `Material eq '${mat}' and NumeroSerie ge '${tramo.desde}' and NumeroSerie le '${tramo.hasta}'`;
}

/**
 * Cruza el rango pedido con lo que devolvió SAP. Cada número del rango queda:
 * disponible (alguna fila con Disponible = "X"), no disponible, o no registrado
 * (SAP no lo devolvió). Conserva el largo con ceros que escribió el usuario si
 * SAP no devolvió la serie.
 */
export function interpretarSeriesSap(op: {
  inicio: bigint;
  fin: bigint;
  largoIngresado: number;
  material: string;
  centro: string;
  filas: IFilaSerieSap[];
}): ISerieValidadaSap[] {
  const porSerie = new Map<string, { texto: string; disponible: boolean }>();
  for (const f of op.filas) {
    const texto = String(f.NumeroSerie ?? '').trim();
    if (!texto || !/^\d+$/.test(texto)) continue;
    const clave = sinCeros(texto);
    const previo = porSerie.get(clave);
    const disponible = String(f.Disponible ?? '').trim().toUpperCase() === 'X';
    porSerie.set(clave, { texto: previo?.texto ?? texto, disponible: (previo?.disponible ?? false) || disponible });
  }

  const series: ISerieValidadaSap[] = [];
  for (let n = op.inicio; n <= op.fin; n++) {
    const encontrada = porSerie.get(n.toString());
    const base = { material: op.material.trim(), lote: '', centro: op.centro, almacen: '' };
    if (!encontrada) {
      series.push({ ...base, numeroSerie: n.toString().padStart(op.largoIngresado, '0'), disponible: false, motivo: MOTIVO_NO_REGISTRADA });
    } else if (!encontrada.disponible) {
      series.push({ ...base, numeroSerie: encontrada.texto, disponible: false, motivo: MOTIVO_NO_DISPONIBLE });
    } else {
      series.push({ ...base, numeroSerie: encontrada.texto, disponible: true });
    }
  }
  return series;
}

/** Mensaje para el vendedor ante un error HTTP del servicio (SAP responde en alemán). */
export function mensajeErrorSeriesSap(status: number | undefined, detalle?: string): string {
  if (status === 401) return 'SAP rechazó el usuario técnico del POS (401). Avise a soporte.';
  if (status === 403) return 'El usuario técnico del POS no tiene autorización para consultar series en SAP (403).';
  if (status === 400) return `SAP rechazó la consulta de series (400)${detalle ? `: ${detalle}` : ''}.`;
  if (status === 404) return 'El servicio de series no está publicado en SAP (404).';
  if (status && status >= 500) return `Error interno de SAP al consultar series (${status}). Intente nuevamente.`;
  return 'No se pudo conectar con SAP para validar las series. Revise la conexión e intente nuevamente.';
}
