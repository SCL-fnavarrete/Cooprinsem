import { http, HttpResponse } from 'msw'
import { CLIENTES_MOCK, ARTICULOS_MOCK, PARTIDAS_MOCK } from '@/test/factories'

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
  // GET /api/partidas/:kunnr
  // ------------------------------------------------------------------
  http.get(`${BASE}/api/partidas/:kunnr`, ({ params }) => {
    const kunnr = String(params['kunnr'])
    const partidas = PARTIDAS_MOCK.filter((p) => p.kunnr === kunnr)
    return HttpResponse.json({ d: { results: partidas } })
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
]
