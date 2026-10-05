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
  // POST /api/clientes — crear cliente nuevo
  // ------------------------------------------------------------------
  http.post(`${BASE}/api/clientes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>
    const nuevoCliente = {
      codigoCliente: '0001000099',
      nombre: body['nombre'] ?? '',
      rut: body['rut'] ?? '',
      condicionPago: 'CONT',
      estadoCredito: 'AL_DIA',
      creditoAsignado: 0,
      creditoUtilizado: 0,
      porcentajeAgotamiento: 0,
      sucursal: 'D190',
      tratamiento: body['tratamiento'] ?? '',
      nombre2: body['nombre2'] ?? '',
      conceptoBusqueda: body['concepto_busqueda'] ?? '',
      giro: body['giro'] ?? '',
      direccion: body['direccion'] ?? '',
      region: body['region'] ?? '',
      ciudad: body['ciudad'] ?? '',
      comuna: body['comuna'] ?? '',
      zonaTransporte: body['zona_transporte'] ?? '',
      telefono: body['telefono'] ?? '',
      celular: body['celular'] ?? '',
      correoFactura: body['correo_factura'] ?? '',
    }
    return HttpResponse.json({ d: nuevoCliente }, { status: 201 })
  }),

  // ------------------------------------------------------------------
  // GET /api/partidas/doc/:belnr — buscar partida por número de documento
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/partidas/doc/:belnr`, ({ params }) => {
    const belnr = String(params['belnr'])
    const partida = PARTIDAS_MOCK.find((p) => p.belnr.includes(belnr))
    if (!partida) {
      return HttpResponse.json({ error: `Documento ${belnr} no encontrado` }, { status: 404 })
    }
    return HttpResponse.json(partida)
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
    const filtroVbeln = url.searchParams.get('vbeln') ?? ''
    const filtroCliente = url.searchParams.get('cliente') ?? ''

    let results = [...PEDIDOS_LIST_MOCK]
    if (estado) {
      results = results.filter((p) => p.estado === estado)
    }
    if (filtroVbeln) {
      results = results.filter((p) => p.vbeln.includes(filtroVbeln))
    }
    if (filtroCliente) {
      const q = filtroCliente.toLowerCase()
      results = results.filter((p) => p.nombreCliente.toLowerCase().includes(q))
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
  // GET /api/pos-maestros/canales-distribucion y /documentos-venta
  // Usados por PedidoHeader.tsx para poblar los selects "Canal Distribución"
  // y "Tipo Documento" (antes hardcodeados desde config/sap.ts).
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/pos-maestros/canales-distribucion`, () => {
    return HttpResponse.json({
      data: [
        { id: 1, codigo: '10', descripcion: 'Venta Mesón' },
        { id: 2, codigo: '20', descripcion: 'Venta Industrial' },
      ],
    })
  }),

  http.get(`${BASE}/api/pos-maestros/documentos-venta`, () => {
    return HttpResponse.json({
      data: [
        { id: 1, org_ventas: 'COOP', canal_distribucion: '10', sector: '00', clase_documento: 'ZPOS', descripcion: 'Venta normal', tipo_documento: 'ZPOS', tipo_documento_desc: 'Venta normal', api_relacionada: '' },
        { id: 2, org_ventas: 'COOP', canal_distribucion: '10', sector: '00', clase_documento: 'ZPOB', descripcion: 'Venta Boleta', tipo_documento: 'ZPOB', tipo_documento_desc: 'Venta Boleta', api_relacionada: '' },
      ],
    })
  }),

  // Simulación de pedido (API_SALES_ORDER_SIMULATION_SRV vía backend) — ver ADR
  // pendiente "Grabar Pedido". No crea documento real en SAP.
  http.post(`${BASE}/api/sap-pedidos/simular`, async ({ request }) => {
    const body = await request.json() as { cliente?: string; items?: unknown[] }

    if (!body.cliente || !body.items || body.items.length === 0) {
      return HttpResponse.json(
        { success: false, message: 'Faltan datos del pedido (cliente, items)' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        simulacion: {
          NetAmount: '10000.00',
          TaxAmount: '1900.00',
          TotalAmount: '11900.00',
        },
      },
    })
  }),

  // Consulta automática de precios de la grilla (simulación con to_Pricing vía
  // backend). Precio fijo de mock: $10.000 por unidad, IVA 19%. El material
  // 'FALLA' simula una línea que SAP no puede calcular (respuesta parcial).
  http.post(`${BASE}/api/sap-pedidos/precios`, async ({ request }) => {
    const body = await request.json() as { cliente?: string; items?: { posicion: string; codigoMaterial: string; cantidad: number }[] }

    if (!body.cliente || !Array.isArray(body.items)) {
      return HttpResponse.json(
        { success: false, message: 'Faltan datos para consultar precios (cliente, items)' },
        { status: 400 }
      )
    }

    const validos = body.items.filter((i) => i.cantidad > 0)
    const posiciones = validos.map((i) =>
      i.codigoMaterial === 'FALLA'
        ? { posicion: i.posicion, error: 'Tipo de posición Z001 no está definido para la posición' }
        : { posicion: i.posicion, precioUnitario: 10000, neto: 10000 * i.cantidad, iva: Math.round(10000 * i.cantidad * 0.19) }
    )
    return HttpResponse.json({ success: true, posiciones, parcial: posiciones.some((p) => 'error' in p) })
  }),

  // Validación de series (PE-23) — mismo contrato que el backend de prueba:
  // las series terminadas en 7 vienen "no disponible".
  // Stock SAP (ZUI_STOCK_SRV vía backend) — mismo contrato que el backend:
  // exige al menos un filtro, filtra "solo con stock" y recorta a `top`.
  http.get(`${BASE}/api/sap-stock/material/:matnr`, ({ params, request }) => {
    const plant = new URL(request.url).searchParams.get('plant') ?? 'D190'
    return HttpResponse.json({
      success: true,
      data: {
        material: String(params.matnr).replace(/^0+(?=\d)/, ''), plant, nombreCentro: 'Osorno', totalCentro: 183, unidad: 'ST',
        almacenes: [{ almacen: 'B000', libre: 183, inspeccion: 0, bloqueado: 0, unidad: 'ST' }],
        otrosCentros: [{ centro: 'D150', nombre: 'Valdivia', libre: 40 }],
      },
    })
  }),

  http.get(`${BASE}/api/sap-stock`, ({ request }) => {
    const q = new URL(request.url).searchParams
    if (!q.get('material') && !q.get('plant') && !q.get('storageLocation') && q.get('soloConStock') !== 'true') {
      return HttpResponse.json({ success: false, message: 'Ingrese al menos un filtro (material, centro, almacén o solo con stock)' }, { status: 400 })
    }
    const registros = [
      { Material: '000000000014700006', Plant: 'D190', StorageLocation: 'B000', MaterialDescription: 'PRUEBA DENTAL TREAT PERRO M 134 g', PlantName: 'Osorno', UnrestrictedStock: '183.000', QualityInspectionStock: '0.000', BlockedStock: '0.000', BaseUnit: 'ST' },
      { Material: '000000000014700007', Plant: 'D190', StorageLocation: 'B000', MaterialDescription: 'PRUEBA CONC PERRO TOQUI 25 KILOS', PlantName: 'Osorno', UnrestrictedStock: '0.000', QualityInspectionStock: '0.000', BlockedStock: '0.000', BaseUnit: 'ST' },
    ]
    const filtrados = q.get('soloConStock') === 'true' ? registros.filter((r) => Number(r.UnrestrictedStock) > 0) : registros
    const top = Number(q.get('top') ?? 200)
    return HttpResponse.json({ success: true, total: filtrados.length, truncado: filtrados.length > top, data: filtrados.slice(0, top) })
  }),

  // Maestro local de clientes SAP (Sap_cliente). Igual que el backend: busca
  // con "contains" y el RUT se guarda con guion (un RUT completo sin guion no
  // matchea — ver PagoCtaCtePanel).
  http.get(`${BASE}/api/sap-cliente-tabla`, ({ request }) => {
    const search = (new URL(request.url).searchParams.get('search') ?? '').toLowerCase()
    const clientes = [
      { kunnr: '10000003', nombre: 'Sergio Cutiño', rut: '16029421-3', condicion_pago: '', sucursal: 'D190' },
      { kunnr: '10042446', nombre: 'AGRICOLA G.M. LIMITADA', rut: '96719960-5', condicion_pago: '', sucursal: 'D170' },
      { kunnr: '1', nombre: 'CUTIÑO OBANDO SERGIO DAVID', rut: '16029421-3', condicion_pago: '', sucursal: '' },
    ]
    const results = clientes.filter((c) => c.kunnr.includes(search) || c.nombre.toLowerCase().includes(search) || c.rut.includes(search.replace(/[.-]/g, '')))
    return HttpResponse.json({ d: { results } })
  }),

  // Maestro SAP de centros (Sap_centro)
  http.get(`${BASE}/api/sap-maestro/centros`, () => HttpResponse.json({
    d: { results: [
      { id: 1, Plant: 'D170', PlantName: 'Futrono', SalesOrganization: 'COOP', Language: 'ES', IsMarkedForArchiving: false },
      { id: 2, Plant: 'D190', PlantName: 'Osorno', SalesOrganization: 'COOP', Language: 'ES', IsMarkedForArchiving: false },
    ] },
  })),

  // Caja > Pago Cta. Cte.: partidas abiertas (FAR_CUSTOMER_LINE_ITEMS vía backend).
  // Mismo contrato que server/src/routes/sapCtaCte.ts; filtra "vence hasta".
  http.get(`${BASE}/api/sap-cta-cte/partidas`, ({ request }) => {
    const q = new URL(request.url).searchParams
    const cliente = q.get('cliente') ?? ''
    if (!cliente) return HttpResponse.json({ success: false, message: 'Falta el cliente' }, { status: 400 })
    const partida = (documento: string, monto: number, fechaVencimiento: string, diasMora: number, tipo = 'D1') => ({
      documento, posicion: '001', ejercicio: '2026', tipoDocumento: tipo, tipoDocumentoNombre: 'Factura', folio: '',
      documentoFacturacion: '90000011', debeHaber: monto < 0 ? 'H' : 'S', moneda: 'CLP', monto, monedaDocumento: 'CLP',
      montoDocumento: monto, fechaDocumento: '2026-09-01', fechaVencimiento, diasMora, bloqueoPago: '', sucursal: '',
    })
    const todas = cliente.replace(/^0+/, '') === '10000003'
      ? [partida('1800000001', 19040, '2026-08-26', 40), partida('1800000009', 76160, '2026-10-12', -5), partida('1800000011', 6490, '2026-12-31', -60, 'D6')]
      : []
    const venceHasta = q.get('venceHasta')
    const data = venceHasta ? todas.filter((p) => p.fechaVencimiento <= venceHasta) : todas
    return HttpResponse.json({ success: true, total: data.length, truncado: false, data })
  }),

  // Tablas SAP > Perfiles Usuario (Perfiles_usuarios, solo lectura)
  http.get(`${BASE}/api/sap-maestro/perfiles`, ({ request }) => {
    const search = new URL(request.url).searchParams.get('search')?.toLowerCase() ?? ''
    const perfiles = [
      { id: 1, IdRol: 'CAJA_OSORNO D190', Vkorg: 'COOP', Vtweg: 'VM', Spart: '00', Vkbur: 'D190', Vkgrp: 'G00', Werks: 'D190', Lgort: '', Bukrs: 'COOP', Kkber: 'CP01', CierreCaja: '' },
      { id: 2, IdRol: 'ESTACION_FUTRONO E120', Vkorg: 'COOP', Vtweg: 'VM', Spart: '00', Vkbur: 'E120', Vkgrp: 'G16', Werks: 'E120', Lgort: '', Bukrs: 'COOP', Kkber: 'CP01', CierreCaja: 'X' },
    ]
    const results = search ? perfiles.filter((p) => p.IdRol.toLowerCase().includes(search) || p.Vkbur.toLowerCase().includes(search)) : perfiles
    return HttpResponse.json({ d: { results } })
  }),

  http.post(`${BASE}/api/sap-series/validar`, async ({ request }) => {
    const body = await request.json() as { material?: string; centro?: string; desde?: string; hasta?: string }
    if (!body.material || !body.desde || !body.hasta) {
      return HttpResponse.json({ success: false, message: 'Faltan datos: material, desde y hasta son obligatorios' }, { status: 400 })
    }
    const inicio = Number(body.desde)
    const fin = Number(body.hasta)
    if (fin < inicio) {
      return HttpResponse.json({ success: false, message: 'Hasta debe ser mayor o igual que Desde' }, { status: 400 })
    }
    const series = Array.from({ length: fin - inicio + 1 }, (_, i) => {
      const numeroSerie = String(inicio + i)
      const disponible = !numeroSerie.endsWith('7')
      return { numeroSerie, material: body.material, lote: 'GENERICO', centro: body.centro ?? 'D190', almacen: 'B000', disponible }
    })
    return HttpResponse.json({ success: true, datosDePrueba: true, series })
  }),

  http.post(`${BASE}/api/sap-pedidos/crear`, async ({ request }) => {
    const body = await request.json() as { cliente?: string; items?: unknown[] }

    if (!body.cliente || !body.items || body.items.length === 0) {
      return HttpResponse.json(
        { success: false, message: 'Faltan datos del pedido (cliente, items)' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: { creacion: { SalesOrder: '0000012345' } },
    })
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
  // GET /api/anticipos/cliente/:kunnr → listar anticipos pendientes
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/anticipos/cliente/:kunnr`, ({ params }) => {
    const kunnr = String(params['kunnr'])
    const results = ANTICIPOS_MOCK.filter(
      (a) => a.kunnr === kunnr && a.estado === 'PENDIENTE'
    )
    return HttpResponse.json({ d: { results } })
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
