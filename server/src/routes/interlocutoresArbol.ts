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
