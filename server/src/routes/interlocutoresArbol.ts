// Destinatarios de mercancía (SH) de un cliente y, para cada uno, las personas que
// retiran (ZB), desde Sap_clientes_interlocutor (sync de SAP). Panel Clientes >
// Buscar (26-10-2026). Funciones puras, testeadas.
//
// En la BD: cliente (ZNAC) → SH → destinatarios (ZDES o el mismo cliente) → ZB →
// personas que retiran (ZPER). La misma relación viene repetida por cada área de
// venta: se muestra una vez.

export const FUNCION_DESTINATARIO = 'SH';
export const FUNCION_RETIRA = 'ZB';

export interface IInterlocutorFila {
  Customer: string;
  PartnerFunction: string;
  BPCustomerNumber: string;
}

export interface IClienteFila {
  Customer: string;
  BusinessPartner: string;
  CustomerName: string;
  CliRut: string;
}

export interface IDireccionFila {
  BusinessPartner: string;
  StreetName: string;
  District: string;
  CityName: string;
  Region: string;
}

export interface IPersonaRetiraArbol {
  codigo: string;
  rut: string;
  nombre: string;
}

export interface IDestinatarioArbol {
  codigo: string;
  rut: string;
  nombre: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
  personasRetira: IPersonaRetiraArbol[];
}

const sinCeros = (s: string) => s.trim().replace(/^0+(?=\d)/, '');

/** Códigos de la función pedida para un dueño, sin repetir y en orden de aparición. */
export function codigosPorFuncion(filas: IInterlocutorFila[], dueno: string, funcion: string): string[] {
  const vistos = new Set<string>();
  for (const f of filas) {
    if (sinCeros(f.Customer) !== sinCeros(dueno) || f.PartnerFunction !== funcion) continue;
    const codigo = sinCeros(f.BPCustomerNumber);
    if (codigo) vistos.add(codigo);
  }
  return [...vistos];
}

// Funciones de interlocutor que trae el sync (Sap_clientes_interlocutor, 29-10-2026).
// BU: sin descripción confirmada (3 clientes, número de persona de contacto).
export const DESCRIPCION_FUNCION: Record<string, string> = {
  SP: 'Solicitante',
  BP: 'Destinatario factura',
  PY: 'Responsable de pago',
  SH: 'Destinatario mercancía',
  ZB: 'Persona retira',
};
const ORDEN_FUNCION = ['SP', 'BP', 'PY', 'SH'];

export interface IInterlocutorFicha {
  funcion: string;
  descripcion: string;
  codigo: string;
  nombre: string;
  rut: string;
  /** Solo en las personas que retiran: destinatario del que dependen. */
  destinatario?: string;
}

/**
 * Interlocutores del cliente para Clientes > Ficha: cada función una vez por
 * código (sin repetir por área de venta), ordenadas SP, BP, PY, SH y el resto;
 * bajo cada destinatario (SH) van sus personas que retiran (ZB).
 */
export function armarInterlocutoresFicha(op: {
  cliente: string;
  interlocutores: IInterlocutorFila[];
  clientes: IClienteFila[];
}): IInterlocutorFicha[] {
  const cliente = sinCeros(op.cliente);
  const porCodigo = new Map(op.clientes.map((c) => [sinCeros(c.Customer), c]));
  const fila = (funcion: string, codigo: string, destinatario?: string): IInterlocutorFicha => {
    const c = porCodigo.get(codigo);
    return {
      funcion,
      descripcion: DESCRIPCION_FUNCION[funcion] ?? funcion,
      codigo,
      nombre: c?.CustomerName ?? '',
      rut: c?.CliRut ?? '',
      ...(destinatario ? { destinatario } : {}),
    };
  };

  const funcionesCliente = [...new Set(
    op.interlocutores.filter((f) => sinCeros(f.Customer) === cliente).map((f) => f.PartnerFunction),
  )].sort((a, b) => {
    const ia = ORDEN_FUNCION.indexOf(a);
    const ib = ORDEN_FUNCION.indexOf(b);
    return (ia < 0 ? ORDEN_FUNCION.length : ia) - (ib < 0 ? ORDEN_FUNCION.length : ib) || a.localeCompare(b);
  });

  const resultado: IInterlocutorFicha[] = [];
  for (const funcion of funcionesCliente) {
    for (const codigo of codigosPorFuncion(op.interlocutores, cliente, funcion)) {
      resultado.push(fila(funcion, codigo));
      if (funcion !== FUNCION_DESTINATARIO) continue;
      for (const persona of codigosPorFuncion(op.interlocutores, codigo, FUNCION_RETIRA)) {
        resultado.push(fila(FUNCION_RETIRA, persona, codigo));
      }
    }
  }
  return resultado;
}

/**
 * Árbol destinatarios → personas que retiran. El propio cliente va primero (es
 * el destinatario por defecto en SAP); el resto por nombre.
 */
export function armarArbolInterlocutores(op: {
  cliente: string;
  interlocutores: IInterlocutorFila[];
  clientes: IClienteFila[];
  direcciones: IDireccionFila[];
  regiones: Map<string, string>;
}): IDestinatarioArbol[] {
  const cliente = sinCeros(op.cliente);
  const porCodigo = new Map(op.clientes.map((c) => [sinCeros(c.Customer), c]));
  const direccionPorBp = new Map<string, IDireccionFila>();
  for (const d of op.direcciones) if (!direccionPorBp.has(d.BusinessPartner)) direccionPorBp.set(d.BusinessPartner, d);

  const destinatarios = codigosPorFuncion(op.interlocutores, cliente, FUNCION_DESTINATARIO).map((codigo) => {
    const c = porCodigo.get(codigo);
    const d = c ? direccionPorBp.get(c.BusinessPartner) : undefined;
    const personasRetira = codigosPorFuncion(op.interlocutores, codigo, FUNCION_RETIRA)
      .map((cod) => {
        const p = porCodigo.get(cod);
        return { codigo: cod, rut: p?.CliRut ?? '', nombre: p?.CustomerName ?? '' };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return {
      codigo,
      rut: c?.CliRut ?? '',
      nombre: c?.CustomerName ?? '',
      direccion: d?.StreetName ?? '',
      comuna: d?.District ?? '',
      ciudad: d?.CityName ?? '',
      region: (d?.Region ? op.regiones.get(d.Region) : undefined) ?? d?.Region ?? '',
      personasRetira,
    };
  });

  return destinatarios.sort((a, b) =>
    a.codigo === cliente ? -1 : b.codigo === cliente ? 1 : a.nombre.localeCompare(b.nombre, 'es'));
}
