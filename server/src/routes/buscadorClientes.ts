// Buscador de clientes con comodín (26-10-2026): "*" = cualquier texto entre
// medio, respetando el orden ("agricola*verde" encuentra "AGRICOLA CAMPO VERDE").
// Sin "*" se comporta como antes ("contiene"). Funciones puras, testeadas.

/** Escapa los comodines propios de LIKE (\, % y _) para buscarlos como texto. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Pedazos entre "*" (sin vacíos). "*agricola**verde*" → ["agricola", "verde"]. */
export function fragmentosBusqueda(texto: string): string[] {
  return texto.split('*').map((f) => f.trim()).filter((f) => f.length > 0);
}

/**
 * Patrón ILIKE con "contiene" y el comodín: "agricola*verde" → "%agricola%verde%".
 * Vacío si no hay nada que buscar.
 */
export function patronLike(texto: string): string {
  const fragmentos = fragmentosBusqueda(texto);
  return fragmentos.length > 0 ? `%${fragmentos.map(escaparLike).join('%')}%` : '';
}

/** RUT buscado sin puntos ni guion (como hasta ahora), manteniendo el comodín. */
export function patronRut(texto: string): string {
  return patronLike(texto.replace(/[.-]/g, ''));
}

// ─── Filtro por grupo BP (26-10-2026) ──────────────────────────────────────────
// Solo ZNAC (José Castillo, 14-10-2026; confirmado 26-10-2026). "TODOS" solo para
// cargar por código un cliente ya elegido (pantalla de pago).

export const GRUPO_BP_DEFECTO = 'ZNAC';
export const GRUPO_BP_TODOS = 'TODOS';

/**
 * Grupo BP pedido por la pantalla: null = todos los grupos. Vacío o inválido →
 * ZNAC (el comportamiento de siempre).
 */
export function grupoBusqueda(valor: unknown): string | null {
  const g = String(valor ?? '').trim().toUpperCase();
  if (g === GRUPO_BP_TODOS) return null;
  return /^[A-Z0-9]{1,4}$/.test(g) ? g : GRUPO_BP_DEFECTO;
}

// ─── Búsqueda en vivo en SAP (A_BusinessPartner) ───────────────────────────────
// SAP no entiende "*": cada pedazo va como substringof (unidos con and) en el nombre
// o en el nombre completo, y el backend confirma el orden. Probado en DEV
// (26-10-2026): substringof no distingue mayúsculas, pero sí tildes.

export const LIMITE_SAP_DEFECTO = 20;
export const LIMITE_SAP_MAXIMO = 200;

/** Límite pedido por la pantalla, entre 1 y el máximo (por defecto 20). */
export function limiteBusquedaSap(valor: unknown): number {
  const n = Number.parseInt(String(valor ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return LIMITE_SAP_DEFECTO;
  return Math.min(n, LIMITE_SAP_MAXIMO);
}

/** Texto para un literal OData: comillas simples duplicadas. */
export function literalOData(texto: string): string {
  return texto.replace(/'/g, "''");
}

/** $filter por nombre: (todos los pedazos en el nombre) or (todos en el nombre completo). */
export function filtroNombreSap(fragmentos: string[]): string {
  const campo = (c: string) => fragmentos.map((f) => `substringof('${literalOData(f.toUpperCase())}', ${c})`).join(' and ');
  return `(${campo('BusinessPartnerName')}) or (${campo('BusinessPartnerFullName')})`;
}

/** ¿Aparecen los pedazos en ese orden dentro del texto? (sin distinguir mayúsculas) */
export function calzaEnOrden(texto: string, fragmentos: string[]): boolean {
  const t = texto.toLowerCase();
  let desde = 0;
  for (const f of fragmentos) {
    const i = t.indexOf(f.toLowerCase(), desde);
    if (i < 0) return false;
    desde = i + f.length;
  }
  return true;
}
