// Condiciones de precio manuales del pedido (descuentos y recargos que ingresa
// el vendedor). Las calcula SAP: el POS solo envía la tasa.
// Clases confirmadas por Arquitectura SAP (correo de José Castillo, 08-10-2026):
//   Cabecera: ZD02 Descuento % (porcentual) · ZFEM Recargo Flete Mínimo (importe fijo)
//   Posición: ZD02 Descuento Man. % (porcentual) · ZFX3 Flete Pes./Vol. (peso bruto)
//
// Formato validado contra $metadata y simulaciones en QAS (08-10-2026):
//   - Navegación to_PricingElement en cabecera y en cada posición, tanto en
//     A_SalesOrderSimulation como en A_SalesOrder (no dentro de to_Pricing).
//   - El valor va en ConditionRateValue (ConditionAmount no es creatable).
//   - ZD02: SAP la deja negativa (descuento) aunque se envíe positiva.
//   - ZFEM: requiere ConditionCurrency "CLP".
//   - ZFX3: SAP QAS la rechaza ("No puede utilizar la cl.condición ZFX3 en este
//     documento comercial") — pendiente de habilitar en SAP. Se envía igual
//     para poder probar; la línea muestra el rechazo.

export interface ICondicionSap {
  ConditionType: string;
  ConditionRateValue: string;
  ConditionCurrency?: string;
}

// Porcentaje válido: número > 0 y ≤ 100. Cualquier otro valor no se envía
// (SAP interpreta 0 como "no enviado").
function porcentaje(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
}

// Monto CLP válido: entero > 0 (CLP sin decimales).
function montoClp(valor: unknown): number | null {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Condiciones de cabecera: "Descuento %" (ZD02) y "Recargo Flete" (ZFEM). */
export function condicionesCabecera(
  datos: { descuentoPorcentaje?: unknown; recargoFlete?: unknown } | null | undefined,
): ICondicionSap[] {
  const condiciones: ICondicionSap[] = [];
  const descuento = porcentaje(datos?.descuentoPorcentaje);
  if (descuento !== null) condiciones.push({ ConditionType: 'ZD02', ConditionRateValue: String(descuento) });
  const flete = montoClp(datos?.recargoFlete);
  if (flete !== null) condiciones.push({ ConditionType: 'ZFEM', ConditionRateValue: String(flete), ConditionCurrency: 'CLP' });
  return condiciones;
}

/** Condiciones de una posición: "Desc. %" (ZD02) y "Recargo" (ZFX3). */
export function condicionesPosicion(item: { descuentoLinea?: unknown; recargo?: unknown } | null | undefined): ICondicionSap[] {
  const condiciones: ICondicionSap[] = [];
  const descuento = porcentaje(item?.descuentoLinea);
  if (descuento !== null) condiciones.push({ ConditionType: 'ZD02', ConditionRateValue: String(descuento) });
  const recargo = montoClp(item?.recargo);
  if (recargo !== null) condiciones.push({ ConditionType: 'ZFX3', ConditionRateValue: String(recargo), ConditionCurrency: 'CLP' });
  return condiciones;
}

// ---------------------------------------------------------------------------
// Desglose de las condiciones de cabecera para mostrarlas en los TOTALES y no
// dentro del precio de las líneas. SAP reparte el descuento de cabecera en
// todas las líneas y carga el ZFEM entero en una sola (probado en QAS
// 08-10-2026), y el ConditionAmount viene con escalas distintas según la
// condición. Por eso cada monto se obtiene de NetAmount (confiable) comparando
// simulaciones: sin cabecera (precio de las líneas), solo con el descuento
// de cabecera, y completa (descuento + flete; da el IVA y el total reales).
// ---------------------------------------------------------------------------

export interface IAjustesCabecera {
  descuento: number;      // CLP, negativo (lo que rebaja el Descuento % de cabecera)
  recargoFlete: number;   // CLP (lo que suma el Recargo Flete de cabecera)
  neto: number;           // Neto total del pedido con todo aplicado
  iva: number;            // IVA total del pedido con todo aplicado
}

type BodyConCondiciones = Record<string, unknown> & { to_PricingElement?: ICondicionSap[] };

/** Copia del body sin las condiciones de cabecera indicadas. */
export function quitarCondicionesCabecera<T extends BodyConCondiciones>(body: T, tipos: string[]): T {
  const restantes = (body.to_PricingElement ?? []).filter((c) => !tipos.includes(c.ConditionType));
  const copia: BodyConCondiciones = { ...body };
  if (restantes.length > 0) copia.to_PricingElement = restantes;
  else delete copia.to_PricingElement;
  return copia as T;
}

/** Tipos de condición de cabecera presentes en el body. */
export function tiposCabecera(body: BodyConCondiciones): { descuento: boolean; flete: boolean } {
  const tipos = (body.to_PricingElement ?? []).map((c) => c.ConditionType);
  return { descuento: tipos.includes('ZD02'), flete: tipos.includes('ZFEM') };
}

interface IItemMontosSap { NetAmount?: string | number; TaxAmount?: string | number }
interface ISimulacionMontosSap { to_Item?: { results?: IItemMontosSap[] } | IItemMontosSap[] }

/** Suma NetAmount / TaxAmount de las posiciones de una simulación (CLP enteros). */
export function sumarSimulacion(simulacion: unknown): { neto: number; iva: number } {
  const toItem = (simulacion as ISimulacionMontosSap | null | undefined)?.to_Item;
  const items: IItemMontosSap[] = (Array.isArray(toItem) ? toItem : toItem?.results) ?? [];
  return items.reduce(
    (acc, it) => ({ neto: acc.neto + Math.round(Number(it?.NetAmount) || 0), iva: acc.iva + Math.round(Number(it?.TaxAmount) || 0) }),
    { neto: 0, iva: 0 },
  );
}

/**
 * Montos de cabecera a partir de las simulaciones: `sinCabecera` (sin ZD02 ni
 * ZFEM de cabecera), `soloDescuento` (con ZD02, sin ZFEM — solo cuando hay
 * ambas) y `completa`.
 */
export function calcularAjustesCabecera(
  hay: { descuento: boolean; flete: boolean },
  sinCabecera: unknown,
  soloDescuento: unknown | null,
  completa: unknown,
): IAjustesCabecera {
  const a = sumarSimulacion(sinCabecera);
  const c = sumarSimulacion(completa);
  // Neto tras aplicar solo el descuento de cabecera
  const conDescuento = !hay.descuento ? a.neto : hay.flete && soloDescuento ? sumarSimulacion(soloDescuento).neto : c.neto;
  return {
    descuento: hay.descuento ? conDescuento - a.neto : 0,
    recargoFlete: hay.flete ? c.neto - conDescuento : 0,
    neto: c.neto,
    iva: c.iva,
  };
}
