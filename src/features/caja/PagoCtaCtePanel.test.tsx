import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { renderWithProviders } from '@/test/helpers'
import { formatFecha } from '@/utils/format'
import { PagoCtaCtePanel } from './PagoCtaCtePanel'

const BASE = 'http://localhost:3001'

// Partida SAP mínima para sobrescribir el handler de partidas.
function partida(documento: string, posicion: string, monto: number) {
  return {
    documento, posicion, ejercicio: '2026', tipoDocumento: 'D1', tipoDocumentoNombre: 'Factura Elect', folio: '',
    documentoFacturacion: '', debeHaber: 'S', moneda: 'CLP', monto, monedaDocumento: 'CLP', montoDocumento: monto,
    fechaDocumento: '2026-09-01', fechaVencimiento: '2026-10-30', diasMora: -17, bloqueoPago: '', sucursal: '',
  }
}

function escribir(label: string, valor: string) {
  const input = screen.getByLabelText(label) as HTMLInputElement
  input.value = valor
  fireEvent.input(input, { target: { value: valor } })
}

describe('PagoCtaCtePanel', () => {
  it('debería exigir RUT o Cliente para identificar al cliente', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    expect(await screen.findByText('Ingrese el RUT o el código de Cliente')).toBeInTheDocument()
  })

  it('debería rechazar un RUT inválido', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '96.719.960-0')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    expect(await screen.findByText('El RUT ingresado no es válido')).toBeInTheDocument()
  })

  it('debería identificar al cliente por RUT completo y completar Cliente y Nombre', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '96.719.960-5')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('10042446')
  })

  it('debería identificar al cliente por código', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10042446')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
  })

  it('debería pedir elegir cuando hay varios clientes con el mismo RUT', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '16.029.421-3')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    expect(await screen.findByText(/Hay 2 clientes con este RUT/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('10000003 — Sergio Cutiño'))
    expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('Sergio Cutiño')
  })

  it('debería cargar el nombre automáticamente al salir del campo RUT', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '96.719.960-5')
    fireEvent.change(screen.getByLabelText('Rut'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('10042446')
  })

  it('debería cargar el nombre automáticamente al salir del campo Cliente, aunque el RUT tenga un valor anterior', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Rut', '16.029.421-3')
    escribir('Cliente', '10042446')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
  })

  it('debería listar las partidas abiertas del cliente identificado con estado y total', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    expect(await screen.findByText('1800000009')).toBeInTheDocument()
    expect(screen.getByTestId('ctacte-total')).toHaveTextContent('4 partidas abiertas — Total: $108.180')
    expect(screen.getByText('Vencida (40 d)')).toBeInTheDocument()
    expect(screen.getByText('Por vencer')).toBeInTheDocument()
    expect(screen.getByText('Vigente')).toBeInTheDocument()
    expect(screen.getAllByText('No informado')).toHaveLength(4)
    // Tipo documento: solo la descripción de tipo_documento (José, 14-10-2026)
    expect(screen.getAllByText('Boleta Electronica')).toHaveLength(2)
    expect(screen.getAllByText('Factura Elect')).toHaveLength(2)
  })

  it('debería mostrar la fecha del documento (DocumentDate) además de la de vencimiento', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await screen.findByText('1800000009')
    expect(screen.getByTestId('ctacte-orden-fechaDocumento')).toHaveTextContent('Fecha documento')
    // Las 4 partidas del mock tienen fechaDocumento 2026-09-01
    expect(screen.getAllByText(formatFecha('2026-09-01'))).toHaveLength(4)
  })

  it('debería ordenar por vencimiento más próximo por defecto y por la columna al hacer clic en su cabecera', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await screen.findByText('1800000009')
    const documentos = () => screen.getAllByText(/^18000000\d\d$/).map((el) => el.textContent)

    expect(documentos()).toEqual(['1800000001', '1800000009', '1800000011', '1800000012'])

    // Monto ascendente (empates por vencimiento y N° documento), otro clic lo invierte
    fireEvent.click(screen.getByTestId('ctacte-orden-monto'))
    expect(documentos()).toEqual(['1800000011', '1800000012', '1800000001', '1800000009'])
    fireEvent.click(screen.getByTestId('ctacte-orden-monto'))
    expect(documentos()).toEqual(['1800000009', '1800000001', '1800000011', '1800000012'])
  })

  it('debería habilitar Pagos al seleccionar partidas y abrir la pantalla de pago con fuente SAP', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await screen.findByText('1800000009')
    expect(screen.getByTestId('ctacte-pagos')).toHaveAttribute('disabled')

    fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000009'))
    expect(screen.getByTestId('ctacte-total')).toHaveTextContent('Seleccionadas: 1 — $76.160')
    expect(screen.getByTestId('ctacte-pagos')).not.toHaveAttribute('disabled')

    fireEvent.click(screen.getByTestId('ctacte-pagos'))
    expect(window.location.pathname).toBe('/caja/pago')
    expect(window.location.search).toBe('?fuente=sap&kunnr=10000003&docs=1800000009-001-2026')
    window.history.pushState({}, '', '/')
  })

  it('debería marcar la factura ya pagada como pendiente de compensación y no permitir seleccionarla', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    expect(await screen.findByText('Pagada · pend. compensación')).toBeInTheDocument()
    const check = screen.getByLabelText('Seleccionar documento 1800000012') as HTMLInputElement
    expect(check).toBeDisabled()
    fireEvent.click(check)
    expect(screen.getByTestId('ctacte-pagos')).toHaveAttribute('disabled')
  })

  it('debería permitir una sola factura por cobro: elegir otra reemplaza la anterior', async () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await screen.findByText('1800000009')
    expect(screen.getByTestId('ctacte-una-factura')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000009'))
    fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000001'))
    expect(screen.getByTestId('ctacte-total')).toHaveTextContent('Seleccionadas: 1 — $19.040')
    expect((screen.getByLabelText('Seleccionar documento 1800000009') as HTMLInputElement).checked).toBe(false)
  })

  it('debería permitir varias facturas cuando el backend habilita el pago múltiple', async () => {
    server.use(http.get(`${BASE}/api/sap-cta-cte/partidas`, () => HttpResponse.json({
      success: true, total: 2, truncado: false, pagoMultiple: true,
      data: [partida('1800000002', '001', 19040), partida('1800000005', '001', 64903)],
    })))
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await screen.findByText('1800000002')
    expect(screen.queryByTestId('ctacte-una-factura')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000002'))
    fireEvent.click(screen.getByLabelText('Seleccionar documento 1800000005'))
    expect(screen.getByTestId('ctacte-total')).toHaveTextContent('Seleccionadas: 2 — $83.943')
  })

  it('debería mostrar el código del tipo de documento cuando no está en la tabla tipo_documento', async () => {
    server.use(http.get(`${BASE}/api/sap-cta-cte/partidas`, () => HttpResponse.json({
      success: true, total: 1, truncado: false, pagoMultiple: false,
      data: [{ ...partida('1800000030', '001', 50000), tipoDocumento: 'ZZ', tipoDocumentoNombre: '' }],
    })))
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await screen.findByText('1800000030')
    expect(screen.getByText('ZZ')).toBeInTheDocument()
  })

  it('debería bloquear los documentos en cuotas', async () => {
    server.use(http.get(`${BASE}/api/sap-cta-cte/partidas`, () => HttpResponse.json({
      success: true, total: 1, truncado: false, pagoMultiple: false,
      data: [{ ...partida('1800000020', '001', 50000), enCuotas: true }],
    })))
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    const check = await screen.findByLabelText('Seleccionar documento 1800000020') as HTMLInputElement
    expect(check).toBeDisabled()
    fireEvent.click(check)
    expect(screen.getByTestId('ctacte-pagos')).toHaveAttribute('disabled')
  })

  it('debería mostrar el aviso de pendientes de Pago Cta. Cte.', () => {
    renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/Sucursal del documento/)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/partidas CME/)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/Cliente Boleta 999999 \(grupo ZESP\) NO aparece/)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/DÓNDE guardarlo/)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/documento 1400000061/)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/ZCOOP_PAYMENT_SRV/)
    expect(screen.getByTestId('pendientes-ctacte')).toHaveTextContent(/PAGO_MULTIPLE/)
  })

  it('debería volver a Home con el botón Volver', () => {
    const onVolver = vi.fn()
    renderWithProviders(<PagoCtaCtePanel onVolver={onVolver} />)
    fireEvent.click(screen.getByText('Volver'))
    expect(onVolver).toHaveBeenCalled()
  })
})

// Resumen flotante (21-10-2026): al bajar por el listado, los datos de la
// búsqueda quedan arriba con el botón Pagos.
describe('PagoCtaCtePanel — resumen flotante', () => {
  it('debería mostrar los datos de la búsqueda cuando el formulario sale de la vista', async () => {
    const { instalarIntersectionObserverMock } = await import('@/test/intersectionObserverMock')
    const mock = instalarIntersectionObserverMock()
    try {
      renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
      escribir('Cliente', '10042446')
      fireEvent.click(screen.getByTestId('ctacte-buscar'))
      await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
      expect(screen.queryByTestId('resumen-ctacte')).not.toBeInTheDocument()

      mock.simular(true)
      const resumen = await screen.findByTestId('resumen-ctacte')
      expect(resumen).toHaveTextContent('10042446')
      expect(resumen).toHaveTextContent('AGRICOLA G.M. LIMITADA')
      expect(resumen).toHaveTextContent('Vence hasta: Sin filtro')
      expect(screen.getByTestId('resumen-ctacte-pagos')).toHaveAttribute('disabled')

      mock.simular(false)
      await waitFor(() => expect(screen.queryByTestId('resumen-ctacte')).not.toBeInTheDocument())
    } finally {
      mock.quitar()
    }
  })

  it('no debería mostrarse sin un cliente identificado', async () => {
    const { instalarIntersectionObserverMock } = await import('@/test/intersectionObserverMock')
    const mock = instalarIntersectionObserverMock()
    try {
      renderWithProviders(<PagoCtaCtePanel onVolver={vi.fn()} />)
      mock.simular(true)
      await new Promise((r) => setTimeout(r, 50))
      expect(screen.queryByTestId('resumen-ctacte')).not.toBeInTheDocument()
    } finally {
      mock.quitar()
    }
  })
})
