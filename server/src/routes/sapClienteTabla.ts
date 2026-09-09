import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { sapResults } from '../utils/sapResponse';

const router = Router();

// GET /api/sap-cliente-tabla?search= — buscar clientes en las tablas Sap_cliente/Sap_clientes_direccion
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

  const searchLimpioRut = search.replace(/[.\-]/g, '');

  const clientesSinPriorizar = search
    ? await prisma.sapCliente.findMany({
      where: {
        OR: [
          { Customer: { contains: search, mode: 'insensitive' } },
          { CustomerName: { contains: search, mode: 'insensitive' } },
          { CliRut: { contains: searchLimpioRut, mode: 'insensitive' } },
        ],
      },
      orderBy: { CustomerName: 'asc' },
      take: 50,
    })
    : await prisma.sapCliente.findMany({ orderBy: { CustomerName: 'asc' }, take: 50 });

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
      sucursal: c.CliSucursal,
      direccion: direccion?.StreetName ?? '',
      ciudad: direccion?.CityName ?? '',
      comuna: direccion?.District ?? '',
      casilla: direccion?.PostalCode ?? '',
      region: (direccion?.Region ? regionPorCodigo.get(direccion.Region) : undefined) ?? direccion?.Region ?? '',
    };
  });

  sapResults(res, resultado);
}));

export default router;
