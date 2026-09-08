import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { sapResults } from '../utils/sapResponse';

const router = Router();

// GET /api/sap-cliente-tabla?search= — buscar clientes en las tablas Sap_cliente/Sap_clientes_direccion
// (sincronizadas desde SAP por un proceso externo, ver PROGRESS.md).
// Nombre de ruta provisional — se renombrará junto con el botón "Busca Cliente SAP_CLIENTES" en la UI.
//
// Crédito y sucursal NO están disponibles en estas tablas (ver PROGRESS.md). El frontend
// oculta el panel de crédito para esta fuente en vez de inventar un estado — no confiar en
// estadoCredito/creditoAsignado/creditoUtilizado/sucursal del resultado de este endpoint.
router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query['search'] ?? '').trim();

  const searchLimpioRut = search.replace(/[.\-]/g, '');

  const clientes = search
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
      sucursal: '',
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
