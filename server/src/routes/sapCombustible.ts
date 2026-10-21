// Venta de combustible (ZV15) — correo de José del 21-10-2026 y ejemplo de
// Juan Francisco (pedido ZV15 74). Funciones puras: sin SAP ni BD, testeadas.
// Diferencias con el pedido normal:
//   - Clase ZV15 y canal VT (Venta Terreno).
//   - Interlocutor SB ("Responsable stock especial") = bodega móvil del
//     vendedor (Sap_usuario_vendedor.Zvendedor, ej. MALVARADO → 60000364). Sin
//     él SAP no encuentra el stock del camión y confirma cantidad 0.
//   - RequestedDeliveryDate y PricingDate = fecha del pedido (hoy en Chile).
//   - Sin unidad ni tipo de posición: SAP pone la unidad del material (L) y la
//     posición Z006 (probado en DEV, pedido 126).
// Solo pedido: la factura y el folio del combustible van por otra API que
// todavía no envían (José, 21-10-2026).

export const CLASE_COMBUSTIBLE = 'ZV15';
export const CANAL_VENTA_TERRENO = 'VT';
export const FUNCION_BODEGA_MOVIL = 'SB';

export function esVentaCombustible(claseDocumento: string | null | undefined): boolean {
  return String(claseDocumento ?? '').trim().toUpperCase() === CLASE_COMBUSTIBLE;
}

// Datos del vendedor para la venta de combustible.
export interface IVendedorTerreno {
  usuario: string;
  encontrado: boolean;       // existe en Usuarios_pos (usuario SAP)
  perfil: string;            // Usuarios_pos.IdRol (ej. TERRENO_OSORNO_COMBUSTIBLE)
  canalPerfil: string;       // Usuarios_pos.PerfilVtweg
  bodegaMovil: string;       // Sap_usuario_vendedor.Zvendedor ('' = sin asignar)
  esVendedorTerreno: boolean; // canal del perfil = VT (José: "todos los VT")
}

export function armarVendedorTerreno(
  usuario: string,
  usuarioPos: { IdRol?: string | null; PerfilVtweg?: string | null } | null,
  bodega: { Zvendedor?: string | null } | null,
): IVendedorTerreno {
  const canalPerfil = String(usuarioPos?.PerfilVtweg ?? '').trim().toUpperCase();
  return {
    usuario,
    encontrado: !!usuarioPos,
    perfil: String(usuarioPos?.IdRol ?? '').trim(),
    canalPerfil,
    bodegaMovil: String(bodega?.Zvendedor ?? '').trim(),
    esVendedorTerreno: canalPerfil === CANAL_VENTA_TERRENO,
  };
}

/** Motivo por el que el usuario no puede crear un pedido de combustible. null = puede. */
export function validarVendedorTerreno(v: IVendedorTerreno): string | null {
  if (!v.usuario) return 'No se identificó al usuario que graba el pedido de combustible.';
  if (!v.encontrado) return `El usuario ${v.usuario} no está en Usuarios_pos (usuarios SAP): la venta de combustible es solo para vendedores de terreno.`;
  if (!v.esVendedorTerreno) {
    return `La venta de combustible es solo para vendedores de terreno (canal VT). El perfil de ${v.usuario} (${v.perfil || 'sin perfil'}) tiene canal ${v.canalPerfil || 'vacío'}.`;
  }
  if (!v.bodegaMovil) {
    return `El vendedor ${v.usuario} no tiene bodega móvil asignada (Admin > Tablas SAP > Usuario Vendedor): sin ella SAP no puede confirmar el stock del combustible.`;
  }
  return null;
}

/** Fecha de hoy en Chile en formato OData V2 (/Date(medianoche UTC)/). */
export function fechaPedidoSap(ahora = new Date()): string {
  const [anio, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' })
    .format(ahora).split('-').map(Number);
  return `/Date(${Date.UTC(anio, mes - 1, dia)})/`;
}

export interface ICantidadConfirmada {
  posicion: string;
  material: string;
  pedida: number;
  confirmada: number;
}

/**
 * Cantidad pedida vs confirmada por SAP en cada posición (suma de las líneas de
 * reparto, ConfdOrderQtyByMatlAvailCheck). Requiere enviar to_ScheduleLine: []
 * en cada posición de la simulación (sin eso SAP no devuelve las líneas).
 */
export function cantidadesConfirmadas(simulacion: any): ICantidadConfirmada[] {
  const items: any[] = simulacion?.to_Item?.results ?? [];
  return items.map((it) => {
    const lineas: any[] = it?.to_ScheduleLine?.results ?? [];
    return {
      posicion: String(parseInt(String(it?.SalesOrderItem), 10)),
      material: String(it?.Material ?? ''),
      pedida: Number(it?.RequestedQuantity) || 0,
      confirmada: lineas.reduce((s, l) => s + (Number(l?.ConfdOrderQtyByMatlAvailCheck) || 0), 0),
    };
  });
}
