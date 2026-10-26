import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler, withRetry } from '../middleware/errorHandler';
import { armarArbolInterlocutores, FUNCION_DESTINATARIO, FUNCION_RETIRA } from './interlocutoresArbol';

const router = Router();

// GET /api/sap-maestro/bancos
router.get('/bancos', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const bancos = await prisma.sapBanco.findMany({
    where: search ? {
      OR: [
        { BankKey: { contains: String(search), mode: 'insensitive' } },
        { BankName: { contains: String(search), mode: 'insensitive' } },
        { BankCountry: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { BankKey: 'asc' },
    take: 200,
  });

  res.json({ d: { results: bancos } });
}));

// GET /api/sap-maestro/centros
router.get('/centros', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const centros = await prisma.sapCentro.findMany({
    where: search ? {
      OR: [
        { Plant: { contains: String(search), mode: 'insensitive' } },
        { PlantName: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { Plant: 'asc' },
    take: 200,
  });

  res.json({ d: { results: centros } });
}));

// GET /api/sap-maestro/centros-costo
router.get('/centros-costo', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const centrosCosto = await prisma.sapCentroCosto.findMany({
    where: search ? {
      OR: [
        { CostCenter: { contains: String(search), mode: 'insensitive' } },
        { ControllingArea: { contains: String(search), mode: 'insensitive' } },
        { Department: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { CostCenter: 'asc' },
    take: 200,
  });

  res.json({ d: { results: centrosCosto } });
}));

// GET /api/sap-maestro/sociedades
router.get('/sociedades', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const sociedades = await prisma.sapSociedad.findMany({
    where: search ? {
      OR: [
        { CompanyCode: { contains: String(search), mode: 'insensitive' } },
        { CompanyCodeName: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { CompanyCode: 'asc' },
    take: 200,
  });

  res.json({ d: { results: sociedades } });
}));

// GET /api/sap-maestro/perfiles — Perfiles organizacionales SAP por rol
// (tabla Perfiles_usuarios, solo lectura). Búsqueda por perfil, oficina,
// centro o canal.
router.get('/perfiles', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;
  const perfiles = await withRetry(() => prisma.perfilUsuario.findMany({
    where: search ? {
      OR: [
        { IdRol: { contains: String(search), mode: 'insensitive' } },
        { Vkbur: { contains: String(search), mode: 'insensitive' } },
        { Werks: { contains: String(search), mode: 'insensitive' } },
        { Vtweg: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { IdRol: 'asc' },
  }));
  res.json({ d: { results: perfiles } });
}));

// GET /api/sap-maestro/usuarios-pos?idRol=&search= — Usuarios POS mantenidos
// en SAP (tabla Usuarios_pos, solo lectura). `idRol` filtra por perfil exacto
// (Usuarios_pos.IdRol = Perfiles_usuarios.IdRol); `search` por usuario, nombre
// o perfil. `enPos` indica si ya existe en usuarios del POS con el mismo
// username (vínculo usuario POS = usuario SAP, sin columna extra).
router.get('/usuarios-pos', asyncHandler(async (req: Request, res: Response) => {
  const idRol = req.query['idRol'] ? String(req.query['idRol']) : '';
  const search = req.query['search'] ? String(req.query['search']) : '';
  const usuariosSap = await withRetry(() => prisma.usuarioPos.findMany({
    where: {
      ...(idRol && { IdRol: idRol }),
      ...(search && {
        OR: [
          { IdUsuario: { contains: search, mode: 'insensitive' as const } },
          { Nombre: { contains: search, mode: 'insensitive' as const } },
          { IdRol: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    orderBy: { IdUsuario: 'asc' },
  }));
  const enPos = await prisma.usuario.findMany({
    where: { username: { in: usuariosSap.map((u) => u.IdUsuario), mode: 'insensitive' } },
    select: { username: true },
  });
  const usernamesPos = new Set(enPos.map((u) => u.username.toUpperCase()));
  const results = usuariosSap.map(({ created_at: _c, updated_at: _u, ...u }) => ({
    ...u,
    enPos: usernamesPos.has(u.IdUsuario.toUpperCase()),
  }));
  res.json({ d: { results } });
}));

// ─── Tablas de impresoras y vendedores (sync de Arquitectura SAP, 13-10-2026) ──
// Solo lectura. Se quitan created_at/updated_at de la respuesta.

// Tope de Sap_usuario_impresora (3.206 filas al 13-10-2026): la búsqueda se
// hace en el backend y se devuelven como máximo estas filas, con `truncado`.
const MAX_USUARIO_IMPRESORA = 1000;

// GET /api/sap-maestro/impresora-config?search= — Impresoras por sociedad /
// oficina de ventas / usuario (Sap_impresora_config).
router.get('/impresora-config', asyncHandler(async (req: Request, res: Response) => {
  const search = req.query['search'] ? String(req.query['search']) : '';
  const filas = await withRetry(() => prisma.sapImpresoraConfig.findMany({
    where: search ? {
      OR: [
        { Vkbur: { contains: search, mode: 'insensitive' } },
        { Uname: { contains: search, mode: 'insensitive' } },
        { Bukrs: { contains: search, mode: 'insensitive' } },
        { ImpCopago: { contains: search, mode: 'insensitive' } },
        { ImpCtaCte: { contains: search, mode: 'insensitive' } },
        { ImpCotizacion: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: [{ Vkbur: 'asc' }, { Uname: 'asc' }],
  }));
  const results = filas.map(({ created_at: _c, updated_at: _u, ...f }) => f);
  res.json({ d: { results } });
}));

// GET /api/sap-maestro/usuario-vendedor?search= — Usuario SAP → código de
// vendedor (Sap_usuario_vendedor). Se cruza con Usuarios_pos por usuario para
// mostrar si el código de vendedor difiere (pendiente: cuál es la fuente válida).
router.get('/usuario-vendedor', asyncHandler(async (req: Request, res: Response) => {
  const search = req.query['search'] ? String(req.query['search']) : '';
  const filas = await withRetry(() => prisma.sapUsuarioVendedor.findMany({
    where: search ? {
      OR: [
        { Bname: { contains: search, mode: 'insensitive' } },
        { Zvendedor: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: { Bname: 'asc' },
  }));
  const usuariosPos = await prisma.usuarioPos.findMany({
    where: { IdUsuario: { in: filas.map((f) => f.Bname), mode: 'insensitive' } },
    select: { IdUsuario: true, IdVendedor: true },
  });
  const vendedorPos = new Map(usuariosPos.map((u) => [u.IdUsuario.toUpperCase(), u.IdVendedor]));
  const sinCeros = (v: string) => v.replace(/^0+/, '');
  const results = filas.map(({ created_at: _c, updated_at: _u, ...f }) => {
    const idVendedorPos = vendedorPos.get(f.Bname.toUpperCase());
    return {
      ...f,
      idVendedorPos: idVendedorPos ?? null, // null = el usuario no está en Usuarios_pos
      difiere: idVendedorPos !== undefined && sinCeros(idVendedorPos) !== sinCeros(f.Zvendedor),
    };
  });
  res.json({ d: { results } });
}));

// GET /api/sap-maestro/usuario-impresora?search= — Impresora de red por
// usuario SAP, centro y clase de mensaje (Sap_usuario_impresora).
router.get('/usuario-impresora', asyncHandler(async (req: Request, res: Response) => {
  const search = req.query['search'] ? String(req.query['search']) : '';
  const filas = await withRetry(() => prisma.sapUsuarioImpresora.findMany({
    where: search ? {
      OR: [
        { Bname: { contains: search, mode: 'insensitive' } },
        { Werks: { contains: search, mode: 'insensitive' } },
        { Kschl: { contains: search, mode: 'insensitive' } },
        { Zip: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: [{ Bname: 'asc' }, { Werks: 'asc' }, { Kschl: 'asc' }],
    take: MAX_USUARIO_IMPRESORA + 1,
  }));
  const results = filas.slice(0, MAX_USUARIO_IMPRESORA).map(({ created_at: _c, updated_at: _u, ...f }) => f);
  res.json({ d: { results, truncado: filas.length > MAX_USUARIO_IMPRESORA, maximo: MAX_USUARIO_IMPRESORA } });
}));

// Tope de Sap_cliente (677 filas al 14-10-2026), mismo criterio que Impresoras Usuario.
const MAX_CLIENTES = 1000;

// GET /api/sap-maestro/clientes?search= — Maestro de clientes SAP (Sap_cliente,
// sync de Arquitectura, solo lectura) con TODOS sus campos, incluidas fechas de
// sync. Búsqueda por cliente, BP, nombre, RUT, sucursal, grupo de cuentas y grupo BP.
router.get('/clientes', asyncHandler(async (req: Request, res: Response) => {
  const search = req.query['search'] ? String(req.query['search']) : '';
  const filas = await withRetry(() => prisma.sapCliente.findMany({
    where: search ? {
      OR: [
        { Customer: { contains: search, mode: 'insensitive' } },
        { BusinessPartner: { contains: search, mode: 'insensitive' } },
        { CustomerName: { contains: search, mode: 'insensitive' } },
        { CustomerFullName: { contains: search, mode: 'insensitive' } },
        { CliRut: { contains: search, mode: 'insensitive' } },
        { CliSucursal: { contains: search, mode: 'insensitive' } },
        { CustomerAccountGroup: { contains: search, mode: 'insensitive' } },
        { BusinessPartnerGrouping: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: { Customer: 'asc' },
    take: MAX_CLIENTES + 1,
  }));
  res.json({ d: { results: filas.slice(0, MAX_CLIENTES), truncado: filas.length > MAX_CLIENTES, maximo: MAX_CLIENTES } });
}));

// GET /api/sap-maestro/regiones
router.get('/regiones', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;
  const regiones = await withRetry(() => prisma.sapRegion.findMany({
    where: search ? {
      OR: [
        { Codigo: { contains: String(search), mode: 'insensitive' } },
        { Descripcion: { contains: String(search), mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { Codigo: 'asc' },
  }));
  res.json({ d: { results: regiones } });
}));

// GET /api/sap-maestro/interlocutores/arbol?customer=10000003
// Destinatarios (SH) del cliente con sus personas que retiran (ZB), en una sola
// llamada: el panel Clientes > Buscar cambia de destinatario sin volver a consultar.
router.get('/interlocutores/arbol', asyncHandler(async (req: Request, res: Response) => {
  const customer = String(req.query.customer ?? '').trim().replace(/^0+/, '');
  if (!customer) {
    return res.status(400).json({ error: 'Parámetro customer es requerido' });
  }

  const campos = { Customer: true, PartnerFunction: true, BPCustomerNumber: true } as const;
  const destinatarios = await prisma.sapClienteInterlocutor.findMany({
    where: { Customer: customer, PartnerFunction: FUNCION_DESTINATARIO },
    select: campos,
  });
  const codigosDestinatarios = [...new Set(destinatarios.map((d) => d.BPCustomerNumber).filter(Boolean))];
  const retiran = codigosDestinatarios.length
    ? await prisma.sapClienteInterlocutor.findMany({
      where: { Customer: { in: codigosDestinatarios }, PartnerFunction: FUNCION_RETIRA },
      select: campos,
    })
    : [];

  const codigos = [...new Set([...codigosDestinatarios, ...retiran.map((r) => r.BPCustomerNumber)].filter(Boolean))];
  const clientes = codigos.length
    ? await prisma.sapCliente.findMany({
      where: { Customer: { in: codigos } },
      select: { Customer: true, BusinessPartner: true, CustomerName: true, CliRut: true },
    })
    : [];
  const bpDestinatarios = clientes
    .filter((c) => codigosDestinatarios.includes(c.Customer))
    .map((c) => c.BusinessPartner)
    .filter(Boolean);
  const direcciones = bpDestinatarios.length
    ? await prisma.sapClienteDireccion.findMany({ where: { BusinessPartner: { in: bpDestinatarios } } })
    : [];
  const codigosRegion = [...new Set(direcciones.map((d) => d.Region).filter(Boolean))];
  const regiones = codigosRegion.length
    ? await prisma.sapRegion.findMany({ where: { Codigo: { in: codigosRegion } } })
    : [];

  const arbol = armarArbolInterlocutores({
    cliente: customer,
    interlocutores: [...destinatarios, ...retiran],
    clientes,
    direcciones,
    regiones: new Map(regiones.map((r) => [r.Codigo, r.Descripcion])),
  });
  res.json({ success: true, data: arbol });
}));

// GET /api/sap-maestro/interlocutores?customer=0001234567
router.get('/interlocutores', asyncHandler(async (req: Request, res: Response) => {
  const { customer } = req.query;

  if (!customer) {
    return res.status(400).json({ error: 'Parámetro customer es requerido' });
  }

  const customerClean = String(customer).replace(/^0+/, '') || '0';
  const interlocutores = await prisma.sapClienteInterlocutor.findMany({
    where: { Customer: customerClean },
    orderBy: { PartnerFunction: 'asc' },
  });

  // Enriquecer con CustomerName desde Sap_cliente (match BPCustomerNumber = Customer).
  // Usado hoy solo por el Select "Destinatario Mercancía" (fuente='SH'); no afecta
  // a "Quien Retira", que no lee este campo.
  const bpNumbers = [...new Set(interlocutores.map((i) => i.BPCustomerNumber).filter(Boolean))];
  const clientesRelacionados = bpNumbers.length
    ? await prisma.sapCliente.findMany({ where: { Customer: { in: bpNumbers } } })
    : [];
  const nombrePorCustomer = new Map(clientesRelacionados.map((c) => [c.Customer, c.CustomerName]));

  const resultado = interlocutores.map((i) => ({
    ...i,
    CustomerName: nombrePorCustomer.get(i.BPCustomerNumber) ?? '',
  }));

  res.json({ d: { results: resultado } });
}));

export default router;