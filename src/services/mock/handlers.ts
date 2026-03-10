import { http, HttpResponse } from 'msw'
import { CLIENTES_MOCK, ARTICULOS_MOCK, PARTIDAS_MOCK, PAGARES_MOCK, ANTICIPOS_MOCK, PEDIDOS_LIST_MOCK, getPedidoDetalleMock, crearArqueoMock, USUARIOS_ADMIN_MOCK, ROLES_MOCK, SUCURSALES_ADMIN_MOCK, crearUsuarioAdminMock } from '@/test/factories'

// URL base del backend POC — en tests import.meta.env puede no estar definido
const BASE = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:3001')
  : 'http://localhost:3001'

export const handlers = [
  // ------------------------------------------------------------------
  // GET /api/clientes?search=&sucursal=
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/clientes`, ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const sucursal = url.searchParams.get('sucursal') ?? 'D190'

    const filtered = search
      ? CLIENTES_MOCK.filter(
          (c) =>
            c.nombre.toLowerCase().includes(search) ||
            c.rut.toLowerCase().includes(search) ||
            c.codigoCliente.includes(search)
        )
      : CLIENTES_MOCK

    // Priorizar sucursal actual
    const sucursalActual = filtered.filter((c) => c.sucursal === sucursal)
    const otros = filtered.filter((c) => c.sucursal !== sucursal)

    return HttpResponse.json({ d: { results: [...sucursalActual, ...otros] } })
  }),

  // ------------------------------------------------------------------
  // GET /api/clientes/:kunnr
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/clientes/:kunnr`, ({ params }) => {
    const kunnr = String(params['kunnr'])
    const cliente = CLIENTES_MOCK.find((c) => c.codigoCliente === kunnr)

    if (!cliente) {
      return HttpResponse.json(
        { error: `Cliente ${kunnr} no encontrado` },
        { status: 404 }
      )
    }
    return HttpResponse.json({ d: cliente })
  }),

  // ------------------------------------------------------------------
  // GET /api/materiales?search=&centro=&almacen=
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/materiales`, ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''

    const filtered = search
      ? ARTICULOS_MOCK.filter(
          (m) =>
            m.descripcion.toLowerCase().includes(search) ||
            m.codigoMaterial.toLowerCase().includes(search)
        )
      : ARTICULOS_MOCK

    // Ordenar por stockDisponible descendente
    const sorted = [...filtered].sort((a, b) => b.stockDisponible - a.stockDisponible)

    return HttpResponse.json({ d: { results: sorted } })
  }),

  // ------------------------------------------------------------------
  // GET /api/stock/:matnr
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/stock/:matnr`, ({ params }) => {
    const matnr = String(params['matnr'])
    return HttpResponse.json({
      d: {
        matnr,
        stock: { B000: 20, B001: 10, B002: 5, G000: 0 },
      },
    })
  }),

  // ------------------------------------------------------------------
  // GET /api/partidas — todas las partidas abiertas (sin filtro)
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/partidas`, () => {
    return HttpResponse.json({ d: { results: PARTIDAS_MOCK } })
  }),

  // ------------------------------------------------------------------
  // GET /api/partidas/:kunnr — partidas abiertas filtradas por cliente
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/partidas/:kunnr`, ({ params }) => {
    const kunnr = String(params['kunnr'])
    const partidas = PARTIDAS_MOCK.filter((p) => p.kunnr === kunnr)
    return HttpResponse.json({ d: { results: partidas } })
  }),

  // ------------------------------------------------------------------
  // GET /api/pedidos/:vbeln → detalle de un pedido (ANTES de /api/pedidos)
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/pedidos/:vbeln`, ({ params }) => {
    const vbeln = String(params['vbeln'])
    const detalle = getPedidoDetalleMock(vbeln)

    if (!detalle) {
      return HttpResponse.json(
        { error: `Pedido ${vbeln} no encontrado` },
        { status: 404 }
      )
    }

    return HttpResponse.json({ d: detalle })
  }),

  // ------------------------------------------------------------------
  // GET /api/pedidos → listado de pedidos con filtros opcionales
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/pedidos`, ({ request }) => {
    const url = new URL(request.url)
    const estado = url.searchParams.get('estado') ?? ''

    let results = [...PEDIDOS_LIST_MOCK]
    if (estado) {
      results = results.filter((p) => p.estado === estado)
    }

    return HttpResponse.json({ d: { results } })
  }),

  // ------------------------------------------------------------------
  // POST /api/pedidos → retorna { d: { VBELN, BLART, total } }
  // ------------------------------------------------------------------
  http.post(`${BASE}/api/pedidos`, async ({ request }) => {
    const body = await request.json() as { kunnr?: string; lineas?: unknown[] }

    if (!body.kunnr || !body.lineas || body.lineas.length === 0) {
      return HttpResponse.json(
        { error: 'kunnr y al menos una linea son requeridos' },
        { status: 400 }
      )
    }

    return HttpResponse.json(
      { d: { VBELN: '0080099999', BLART: 'ZPOS', total: 99999 } },
      { status: 201 }
    )
  }),

  // ------------------------------------------------------------------
  // POST /api/auth/login
  // ------------------------------------------------------------------
  http.post(`${BASE}/api/auth/login`, async ({ request }) => {
    const body = await request.json() as { usuario?: string; password?: string }
    const USUARIOS = [
      { usuario: 'admin', password: '1234', id: 'admin', rolCod: 1, nombre: 'Admin Sistema', sucursal: 'D190' },
      { usuario: 'vendedor', password: '1234', id: 'vendedor', rolCod: 2, nombre: 'Juan Vendedor', sucursal: 'D190' },
      { usuario: 'cajero', password: '1234', id: 'cajero', rolCod: 3, nombre: 'María Cajero', sucursal: 'D190' },
      { usuario: 'consulta', password: '1234', id: 'consulta', rolCod: 4, nombre: 'Carlos Consulta', sucursal: 'D190' },
    ]
    const found = USUARIOS.find((u) => u.usuario === body.usuario && u.password === body.password)
    if (!found) {
      return HttpResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }
    const { password: _, usuario: __, ...userData } = found
    return HttpResponse.json(userData)
  }),

  // ------------------------------------------------------------------
  // GET /api/pagares → lista de pagarés (solo lectura)
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/pagares`, () => {
    return HttpResponse.json({ d: { results: PAGARES_MOCK } })
  }),

  // ------------------------------------------------------------------
  // POST /api/anticipos/buscar → buscar anticipo pendiente
  // ------------------------------------------------------------------
  http.post(`${BASE}/api/anticipos/buscar`, async ({ request }) => {
    const body = await request.json() as { kunnr?: string; nroComprobante?: string }

    if (!body.kunnr || !body.nroComprobante) {
      return HttpResponse.json(
        { error: 'Código cliente y Nº comprobante son requeridos' },
        { status: 400 }
      )
    }

    const anticipo = ANTICIPOS_MOCK.find(
      (a) => a.kunnr === body.kunnr && a.nroComprobante === body.nroComprobante
    )

    if (!anticipo) {
      return HttpResponse.json(
        { error: 'Comprobante no encontrado para el cliente indicado' },
        { status: 404 }
      )
    }

    return HttpResponse.json({ d: anticipo })
  }),

  // ------------------------------------------------------------------
  // POST /api/arqueo/grabar — grabar arqueo del cajero
  // ------------------------------------------------------------------
  http.post(`${BASE}/api/arqueo/grabar`, async ({ request }) => {
    const body = await request.json() as { detalles?: { monto: number }[]; sucursalId?: string; cajeroId?: string }

    if (!body.detalles || body.detalles.length === 0 || !body.sucursalId || !body.cajeroId) {
      return HttpResponse.json(
        { error: 'Faltan datos requeridos para grabar el arqueo' },
        { status: 400 }
      )
    }

    const montoTotal = body.detalles.reduce((sum, d) => sum + d.monto, 0)

    return HttpResponse.json({
      d: crearArqueoMock({
        id: `ARQ-${Date.now()}`,
        sucursalId: body.sucursalId,
        cajeroId: body.cajeroId,
        estado: 'GRABADO',
        montoTotal,
        detalles: body.detalles as import('@/types/arqueo').IArqueoDetalle[],
        fechaGrabado: new Date().toISOString(),
      }),
    }, { status: 201 })
  }),

  // ------------------------------------------------------------------
  // GET /api/arqueo/dia — consultar arqueo del día
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/arqueo/dia`, () => {
    return HttpResponse.json({ d: crearArqueoMock() })
  }),

  // ------------------------------------------------------------------
  // POST /api/arqueo/cierre — ejecutar cierre de caja
  // ------------------------------------------------------------------
  http.post(`${BASE}/api/arqueo/cierre`, async ({ request }) => {
    const body = await request.json() as { arqueoId?: string; jefeAdminId?: string; estado?: string }

    if (!body.arqueoId || !body.jefeAdminId) {
      return HttpResponse.json(
        { error: 'arqueoId y jefeAdminId son requeridos' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      d: {
        id: `CIE-${Date.now()}`,
        arqueoId: body.arqueoId,
        fechaCaja: crearArqueoMock().fechaCaja,
        sucursalId: 'D190',
        cajeroId: 'cajero',
        jefeAdminId: body.jefeAdminId,
        estado: body.estado ?? 'DEFINITIVO',
        detalles: [
          { tipoPagoCodigo: 'EF', denominacion: 'EFECTIVO', montoArqueo: 450000, montoRecaudado: 445000, diferencia: 5000, moneda: 'CLP' },
          { tipoPagoCodigo: 'TD', denominacion: 'TARJETA DE DÉBITO', montoArqueo: 180000, montoRecaudado: 180000, diferencia: 0, moneda: 'CLP' },
        ],
        fechaCierre: new Date().toISOString(),
      },
    }, { status: 201 })
  }),

  // ------------------------------------------------------------------
  // POST /api/cobros → retorna { d: { BELNR, BLART, BUKRS, monto, status } }
  // ------------------------------------------------------------------
  http.post(`${BASE}/api/cobros`, async ({ request }) => {
    const body = await request.json() as { kunnr?: string; monto?: number }

    if (!body.kunnr || !body.monto || body.monto <= 0) {
      return HttpResponse.json(
        { error: 'kunnr y monto > 0 son requeridos' },
        { status: 400 }
      )
    }

    return HttpResponse.json(
      { d: { BELNR: '1500099999', BLART: 'W', BUKRS: 'COOP', monto: body.monto, status: 'OK' } },
      { status: 201 }
    )
  }),

  // ------------------------------------------------------------------
  // ADMIN — Usuarios CRUD + Roles + Sucursales (lectura)
  // ------------------------------------------------------------------

  // GET /api/admin/usuarios
  http.get(`${BASE}/api/admin/usuarios`, () => {
    return HttpResponse.json({ d: { results: USUARIOS_ADMIN_MOCK } })
  }),

  // POST /api/admin/usuarios — crear usuario
  http.post(`${BASE}/api/admin/usuarios`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newUser = crearUsuarioAdminMock({
      id: `usr-${Date.now()}`,
      username: body.username as string,
      nombreCompleto: body.nombreCompleto as string,
      email: body.email as string,
      rolCod: body.rolCod as 1 | 2 | 3 | 4,
      sucursalId: body.sucursalId as string,
      estado: body.estado as 1 | 2,
    })
    return HttpResponse.json({ d: newUser }, { status: 201 })
  }),

  // PUT /api/admin/usuarios/:id — actualizar usuario
  http.put(`${BASE}/api/admin/usuarios/:id`, async ({ params, request }) => {
    const id = String(params['id'])
    const body = await request.json() as Record<string, unknown>
    const existing = USUARIOS_ADMIN_MOCK.find((u) => u.id === id)
    const updated = crearUsuarioAdminMock({
      ...(existing ?? {}),
      ...body,
      id,
    } as Partial<import('@/types/admin').IUsuarioAdmin>)
    return HttpResponse.json({ d: updated })
  }),

  // PATCH /api/admin/usuarios/:id/estado — toggle estado
  http.patch(`${BASE}/api/admin/usuarios/:id/estado`, async ({ params, request }) => {
    const id = String(params['id'])
    const body = await request.json() as { estado: 1 | 2 }
    const existing = USUARIOS_ADMIN_MOCK.find((u) => u.id === id)
    const updated = crearUsuarioAdminMock({
      ...(existing ?? {}),
      id,
      estado: body.estado,
    } as Partial<import('@/types/admin').IUsuarioAdmin>)
    return HttpResponse.json({ d: updated })
  }),

  // GET /api/admin/roles
  http.get(`${BASE}/api/admin/roles`, () => {
    return HttpResponse.json({ d: { results: ROLES_MOCK } })
  }),

  // GET /api/admin/sucursales
  http.get(`${BASE}/api/admin/sucursales`, () => {
    return HttpResponse.json({ d: { results: SUCURSALES_ADMIN_MOCK } })
  }),
]
