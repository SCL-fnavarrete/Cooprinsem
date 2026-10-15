import { describe, it, expect, beforeAll, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { CajaPage } from './CajaPage'
import { renderWithProviders } from '@/test/helpers'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Polyfill: jsdom no tiene checkVisibility (usado por UI5 Table internamente)
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
  // jsdom falla con matches(':focus-within') dentro de shadow DOM: la
  // navegación de la tabla UI5 lo usa al hacer clic en una fila.
  const matchesOriginal = Element.prototype.matches
  Element.prototype.matches = function (selector: string) {
    try {
      return matchesOriginal.call(this, selector)
    } catch (err) {
      if (selector === ':focus-within') return false
      throw err
    }
  }
})

const BASE = 'http://localhost:3001'

// Con la caja ya abierta hoy (handler MSW por defecto) el módulo se muestra
// después de consultar apertura_caja.
async function abrirCaja() {
  renderWithProviders(<CajaPage />)
  await screen.findByText('Home')
}

describe('CajaPage', () => {
  describe('apertura de caja (apertura_caja)', () => {
    it('debería entrar directo al módulo si la caja del cajero ya está abierta hoy', async () => {
      await abrirCaja()
      expect(screen.getByText('Pago Cta. Cte.')).toBeInTheDocument()
      expect(screen.queryByText('Apertura Caja Temporal')).not.toBeInTheDocument()
    })

    it('debería pedir la apertura si la caja no está abierta hoy', async () => {
      server.use(http.get(`${BASE}/api/sap-caja/apertura/estado`, () =>
        HttpResponse.json({ success: true, abierta: false, fecha: '2026-10-15', apertura: null })))
      renderWithProviders(<CajaPage />)
      expect(await screen.findByTestId('pendientes-apertura-caja')).toBeInTheDocument()
      expect(screen.queryByText('Home')).not.toBeInTheDocument()
    })

    it('debería mostrar por separado el JSON enviado y la respuesta de SAP si rechaza la apertura', async () => {
      server.use(
        http.get(`${BASE}/api/sap-caja/apertura/estado`, () =>
          HttpResponse.json({ success: true, abierta: false, fecha: '2026-10-15', apertura: null })),
        http.post(`${BASE}/api/sap-caja/apertura`, () =>
          HttpResponse.json({
            success: false,
            message: 'La cta. 1010401000 COOP no es contabilizable directamente',
            body: { to_Items: { results: [{ GlAccount: '1010504000' }, { GlAccount: '1010401000' }] } },
            detalle: { error: { code: 'F5/351', message: { value: 'La cta. 1010401000 COOP no es contabilizable directamente' } } },
            url: 'https://sap/ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet',
          }, { status: 400 })),
      )
      renderWithProviders(<CajaPage />)
      await screen.findByTestId('pendientes-apertura-caja')
      fireEvent.input(screen.getByPlaceholderText('200.000'), { target: { value: '200000' } })
      fireEvent.click(screen.getByText('Aceptar').closest('ui5-button') as HTMLElement)
      expect(await screen.findByTestId('apertura-json-enviado')).toHaveTextContent('1010401000')
      expect(screen.getByTestId('apertura-json-respuesta')).toHaveTextContent('F5/351')
    })

    it('debería mostrar el error y no entrar si no se puede verificar la apertura', async () => {
      server.use(http.get(`${BASE}/api/sap-caja/apertura/estado`, () =>
        HttpResponse.json({ success: false, message: 'Sin conexión a la base de datos' }, { status: 500 })))
      renderWithProviders(<CajaPage />)
      expect(await screen.findByTestId('error-estado-apertura')).toHaveTextContent('Sin conexión a la base de datos')
      expect(screen.queryByText('Home')).not.toBeInTheDocument()
    })
  })


  describe('menú lateral', () => {
    it('muestra los botones del menú de caja, con Home primero y Pago Cta. Cte. debajo', async () => {
      await abrirCaja()
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Pago Cta. Cte.')).toBeInTheDocument()
      expect(screen.getByText('Egr. de Caja')).toBeInTheDocument()
      expect(screen.getByText('List. Pagarés')).toBeInTheDocument()
      expect(screen.getByText('E° de Cuenta')).toBeInTheDocument()
      expect(screen.getByText('Consulta Pago')).toBeInTheDocument()
      expect(screen.getByText('Arqueo Caja')).toBeInTheDocument()
      // "Anticipo" ya no es opción del menú: vive dentro de Ant. Cliente
      expect(screen.queryByText('Anticipo')).not.toBeInTheDocument()
    })

    it('muestra Ant. Cliente habilitado y sigue ocultando Salir de la Caja', async () => {
      await abrirCaja()
      expect(screen.getByText('Ant. Cliente').closest('ui5-button')).not.toHaveAttribute('disabled')
      expect(screen.queryByText('Salir de la Caja')).not.toBeInTheDocument()
    })

    it('abre el panel Ant. Cliente al hacer clic en su botón', async () => {
      await abrirCaja()
      fireEvent.click(screen.getByText('Ant. Cliente').closest('ui5-button') as HTMLElement)
      expect(await screen.findByText('Anticipo de Cliente')).toBeInTheDocument()
    })

    it('abre Ant. Cliente si viene en ?modulo=', async () => {
      window.history.pushState({}, '', '/caja?modulo=ant-cliente')
      renderWithProviders(<CajaPage />)
      expect(await screen.findByText('Anticipo de Cliente')).toBeInTheDocument()
      window.history.pushState({}, '', '/')
    })

    it('Pago Cta. Cte., List. Pagarés y Arqueo Caja están habilitados', async () => {
      await abrirCaja()
      const pagoBtn = screen.getByText('Pago Cta. Cte.').closest('ui5-button')
      expect(pagoBtn).not.toHaveAttribute('disabled')

      const pagaresBtn = screen.getByText('List. Pagarés').closest('ui5-button')
      expect(pagaresBtn).not.toHaveAttribute('disabled')

      const arqueoBtn = screen.getByText('Arqueo Caja').closest('ui5-button')
      expect(arqueoBtn).not.toHaveAttribute('disabled')
    })
  })

  describe('panel de información de sesión', () => {
    it('muestra el id y nombre del usuario', async () => {
      await abrirCaja()
      expect(screen.getByText(/cajero\.test — Cajero Test/)).toBeInTheDocument()
    })

    it('muestra la sucursal con nombre', async () => {
      await abrirCaja()
      expect(screen.getByText(/D190 — Osorno/)).toBeInTheDocument()
    })

    it('muestra la sociedad COOP', async () => {
      await abrirCaja()
      expect(screen.getByText(/COOP — COOPRINSEM LTDA\./)).toBeInTheDocument()
    })
  })

  describe('flujo Listado documentos', () => {
    it('muestra el título "Listado documentos"', async () => {
      await abrirCaja()
      expect(screen.getByText('Listado documentos')).toBeInTheDocument()
    })

    it('muestra solo los filtros que corresponden a columnas de la tabla', async () => {
      await abrirCaja()
      expect(screen.getByTestId('filtro-cliente')).toBeInTheDocument()
      expect(screen.getByTestId('filtro-nombre')).toBeInTheDocument()
      expect(screen.queryByTestId('filtro-documento')).not.toBeInTheDocument()
      expect(screen.queryByTestId('filtro-pedido')).not.toBeInTheDocument()
    })

    it('no muestra botón Cliente Boleta ni búsqueda de cliente', async () => {
      await abrirCaja()
      expect(screen.queryByTestId('btn-cliente-boleta')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/buscar cliente por RUT/i)).not.toBeInTheDocument()
    })

    it('muestra los documentos de SAP y el aviso de pendientes', async () => {
      await abrirCaja()
      expect(await screen.findByTestId('documento-caja-1800000021-001-2026')).toBeInTheDocument()
      expect(screen.getByTestId('rango-documentos-home')).toHaveTextContent('01/10/2026')
      expect(screen.getAllByText('AGRICOLA CORRALITO SPA').length).toBeGreaterThan(0)
      expect(screen.getByTestId('pendientes-home-caja')).toBeInTheDocument()
    })

    it('consulta SAP con el rango Desde/Hasta y pagina el listado', async () => {
      let consulta = ''
      server.use(http.get(`${BASE}/api/sap-cta-cte/documentos-home`, ({ request }) => {
        consulta = new URL(request.url).search
        const data = Array.from({ length: 12 }, (_, i) => ({
          documento: `18000001${String(i).padStart(2, '0')}`, posicion: '001', ejercicio: '2026', tipoDocumento: 'D1',
          tipoDocumentoNombre: 'Factura Elect', folio: '', documentoFacturacion: '', debeHaber: 'S', moneda: 'CLP', monto: 1000,
          monedaDocumento: 'CLP', montoDocumento: 1000, fechaDocumento: '2026-10-05', fechaVencimiento: '2026-11-30', diasMora: -40,
          bloqueoPago: '', sucursal: '', cliente: '10000003', nombreCliente: 'AGRICOLA DE PRUEBA LTDA', rut: '76123456-7',
          fechaContabilizacion: '2026-10-05', compensada: false, codigoCme: '',
        }))
        return HttpResponse.json({ success: true, desde: '2026-10-01', hasta: '2026-10-15', total: 12, truncado: false, pagoMultiple: true, data })
      }))
      await abrirCaja()
      expect(await screen.findByTestId('paginador-documentos-home-rango')).toHaveTextContent('Mostrando 1–10 de 12 documentos')
      expect(consulta).toContain('desde=2026-10-01')
      fireEvent.change(screen.getByTestId('filtro-desde'), { target: { value: '2026-10-05' } })
      await waitFor(() => expect(consulta).toContain('desde=2026-10-05'))
    })

    it('muestra la tabla vacía si SAP no devuelve documentos', async () => {
      server.use(http.get(`${BASE}/api/sap-cta-cte/documentos-home`, () =>
        HttpResponse.json({ success: true, desde: '2026-10-01', hasta: '2026-10-15', total: 0, truncado: false, pagoMultiple: true, data: [] })))
      await abrirCaja()
      expect(await screen.findByText('No hay documentos disponibles para pagar')).toBeInTheDocument()
    })

    it('muestra el error de SAP', async () => {
      server.use(http.get(`${BASE}/api/sap-cta-cte/documentos-home`, () =>
        HttpResponse.json({ success: false, message: 'Error al consultar los documentos en SAP', detail: 'timeout' }, { status: 500 })))
      await abrirCaja()
      expect(await screen.findByTestId('error-documentos-home')).toHaveTextContent('Error al consultar los documentos en SAP: timeout')
    })

    it('no deja seleccionar documentos pagados, CME ni abonos', async () => {
      await abrirCaja()
      await screen.findByTestId('documento-caja-1800000021-001-2026')
      for (const doc of ['1800000024', '1400000080', '1400000081']) {
        expect(screen.getByLabelText(`Seleccionar documento ${doc}`)).toBeDisabled()
      }
      expect(screen.getByText('Pagos (0)')).toBeInTheDocument()
    })

    it('no deja seleccionar documentos de otro cliente y avisa', async () => {
      await abrirCaja()
      fireEvent.click(await screen.findByLabelText('Seleccionar documento 1800000021'))
      fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000022'))
      expect(screen.getByText('Pagos (2)')).toBeInTheDocument()
      fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000023'))
      expect(screen.getByText('Pagos (2)')).toBeInTheDocument()
      expect(screen.getByTestId('aviso-seleccion-home')).toHaveTextContent('mismo cliente')
    })

    it('Pagos lleva a la pantalla de pago SAP con el cliente y los documentos', async () => {
      await abrirCaja()
      fireEvent.click(await screen.findByLabelText('Seleccionar documento 1800000021'))
      fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000022'))
      fireEvent.click(screen.getByText('Pagos (2)').closest('ui5-button') as HTMLElement)
      expect(mockNavigate).toHaveBeenCalledWith(
        `/caja/pago?fuente=sap&kunnr=10000003&docs=${encodeURIComponent('1800000021-001-2026,1800000022-001-2026')}`)
    })

    it('muestra el filtro de estado', async () => {
      await abrirCaja()
      expect(screen.getByTestId('filtro-estado')).toBeInTheDocument()
    })
  })
})
