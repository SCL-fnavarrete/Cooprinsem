import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { sapResults } from '../utils/sapResponse';
import { Prisma } from '../generated/prisma/client';
import { patronLike, patronRut, grupoBusqueda, GRUPO_BP_DEFECTO } from './buscadorClientes';

const router = Router();

// Solo clientes del grupo BP ZNAC (José Castillo, 14-10-2026; confirmado el
// 26-10-2026) en todas las búsquedas (Pedido, Clientes, Caja, Ant. Cliente).
// `grupo=TODOS` solo lo usa la pantalla de pago para cargar por código un cliente
// ya elegido. El Cliente Boleta 999999 es grupo ZESP: se carga con su botón propio.
export const GRUPO_BP_CLIENTES_POS = GRUPO_BP_DEFECTO;

const MAXIMO_RESULTADOS = 50;

// unaccent (extensión de PostgreSQL, la activa Arquitectura): búsqueda sin tildes.
// Se revisa cada 5 minutos, así se aprovecha apenas la activen sin reiniciar; si
// no está, se busca igual pero distinguiendo tildes.
let unaccentCache: { disponible: boolean; revisado: number } | null = null;
async function unaccentDisponible(): Promise<boolean> {
  if (unaccentCache && Date.now() - unaccentCache.revisado < 5 * 60_000) return unaccentCache.disponible;
  let disponible = false;
  try {
    const r = await prisma.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') AS existe`;
    disponible = !!r[0]?.existe;
  } catch {
    disponible = false;
  }
  if (unaccentCache?.disponible !== disponible) {
    console.log(`[sap-cliente-tabla] extensión unaccent ${disponible ? 'disponible: búsqueda sin tildes' : 'no instalada: la búsqueda distingue tildes'}`);
  }
  unaccentCache = { disponible, revisado: Date.now() };
  return disponible;
}

/**
 * Clientes del grupo pedido (null = todos) cuyo código, nombre o RUT calzan con la búsqueda. "*" = cualquier
 * texto entre medio respetando el orden ("agricola*verde"); sin tildes si existe
 * unaccent. Devuelve los códigos en orden por nombre.
 */
async function buscarCodigosClientes(search: string, grupo: string | null): Promise<string[]> {
  const patron = patronLike(search);
  if (!patron) return [];
  const rut = patronRut(search) || patron;
  const f = (await unaccentDisponible()) ? Prisma.raw('unaccent') : Prisma.raw('');
  const filtroGrupo = grupo ? Prisma.sql`"BusinessPartnerGrouping" = ${grupo}` : Prisma.sql`TRUE`;
  const filas = await prisma.$queryRaw<{ Customer: string }[]>`
    SELECT "Customer" FROM "Sap_cliente"
    WHERE ${filtroGrupo}
      AND (${f}("Customer") ILIKE ${f}(${patron})
        OR ${f}("CustomerName") ILIKE ${f}(${patron})
        OR ${f}("CliRut") ILIKE ${f}(${rut}))
    ORDER BY "CustomerName" ASC
    LIMIT ${MAXIMO_RESULTADOS}`;
  return filas.map((r) => r.Customer);
}

// GET /api/sap-cliente-tabla?search=&grupo= — buscar clientes en las tablas Sap_cliente/Sap_clientes_direccion
// (sincronizadas desde SAP por un proceso externo, ver PROGRESS.md).
// Nombre de ruta provisional — se renombrará junto con el botón "Busca Cliente SAP_CLIENTES" en la UI.
//
// Crédito NO está disponible en estas tablas (ver PROGRESS.md). El frontend oculta el
// panel de crédito para esta fuente en vez de inventar un estado — no confiar en
// estadoCredito/creditoAsignado/creditoUtilizado del resultado de este endpoint.
// Sucursal SÍ está disponible desde Sap_cliente.CliSucursal (agregado post-migración,
// ver PROGRESS.md / ADR-027).
router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query['search'] ?? '').trim();
  const sucursal = req.query['sucursal'] ? String(req.query['sucursal']) : undefined;
  const grupo = grupoBusqueda(req.query['grupo']);

  // Con texto: comodín "*" y sin tildes (ver buscarCodigosClientes); sin texto
  // (o solo "*", "todos" en el buscador avanzado): los primeros 50.
  let clientesSinPriorizar;
  if (patronLike(search)) {
    const codigos = await buscarCodigosClientes(search, grupo);
    const encontrados = codigos.length
      ? await prisma.sapCliente.findMany({ where: { Customer: { in: codigos } } })
      : [];
    const porCodigo = new Map(encontrados.map((c) => [c.Customer, c]));
    clientesSinPriorizar = codigos.map((c) => porCodigo.get(c)).filter((c): c is NonNullable<typeof c> => !!c);
  } else {
    clientesSinPriorizar = await prisma.sapCliente.findMany({
      where: grupo ? { BusinessPartnerGrouping: grupo } : {},
      orderBy: { CustomerName: 'asc' },
      take: MAXIMO_RESULTADOS,
    });
  }

  // Prioridad por sucursal (PRD §4.8): clientes de la sucursal actual primero.
  // Un CliSucursal vacío (frecuente hoy — ver PROGRESS.md) simplemente no matchea
  // nunca, así que cae al grupo "otros" sin necesitar ningún caso especial.
  const clientes = sucursal
    ? [
      ...clientesSinPriorizar.filter((c) => c.CliSucursal === sucursal),
      ...clientesSinPriorizar.filter((c) => c.CliSucursal !== sucursal),
    ]
    : clientesSinPriorizar;

  const businessPartners = clientes.map((c) => c.BusinessPartner).filter(Boolean);

  const direcciones = businessPartners.length
    ? await prisma.sapClienteDireccion.findMany({ where: { BusinessPartner: { in: businessPartners } } })
    : [];
  const direccionPorBp = new Map(direcciones.map((d) => [d.BusinessPartner, d]));

  const codigosRegion = [...new Set(direcciones.map((d) => d.Region).filter(Boolean))];
  const regiones = codigosRegion.length
    ? await prisma.sapRegion.findMany({ where: { Codigo: { in: codigosRegion } } })
    : [];
  const regionPorCodigo = new Map(regiones.map((r) => [r.Codigo, r.Descripcion]));

  const resultado = clientes.map((c) => {
    const direccion = direccionPorBp.get(c.BusinessPartner);
    return {
      kunnr: c.Customer,
      nombre: c.CustomerName,
      rut: c.CliRut,
      condicion_pago: '',
      sucursal: c.CliSucursal ?? '',
      direccion: direccion?.StreetName ?? '',
      ciudad: direccion?.CityName ?? '',
      comuna: direccion?.District ?? '',
      casilla: direccion?.PostalCode ?? '',
      grupo_bp: c.BusinessPartnerGrouping ?? '',
      region: (direccion?.Region ? regionPorCodigo.get(direccion.Region) : undefined) ?? direccion?.Region ?? '',
    };
  });

  sapResults(res, resultado);
}));

export default router;
