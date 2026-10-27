// Numeración externa ZNAC (ADR-027): los usuarios de Cooprinsem también crean
// clientes ZNAC directo en SAP con el mismo correlativo, así que el contador
// IDCLIENTE del POS puede quedar atrás (27-10-2026: estaba en 10000026 con
// 10000022–10000043 ya ocupados en SAP). Antes de usar un número se pregunta a
// SAP si existe y se salta los ocupados.

export const MAX_NUMEROS_A_REVISAR = 50;

/**
 * Busca el primer número libre en SAP a partir de `ultimoUsado + 1`.
 * `existeEnSap` debe lanzar si SAP no responde (no se asume libre).
 * Devuelve el número libre y los saltados (ocupados en SAP).
 */
export async function siguienteNumeroLibre(
  ultimoUsado: number,
  existeEnSap: (numero: string) => Promise<boolean>,
  maximo = MAX_NUMEROS_A_REVISAR,
): Promise<{ numero: string; saltados: string[] }> {
  const saltados: string[] = [];
  for (let n = ultimoUsado + 1; n <= ultimoUsado + maximo; n++) {
    const numero = String(n);
    if (!(await existeEnSap(numero))) return { numero, saltados };
    saltados.push(numero);
  }
  throw new Error(
    `Los ${maximo} números siguientes a ${ultimoUsado} ya existen en SAP. ` +
    'Revisar el parámetro IDCLIENTE en Administración > Parámetros.',
  );
}
