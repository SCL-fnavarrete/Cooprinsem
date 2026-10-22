import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { renderWithProviders } from '@/test/helpers'
import { EstadoCuentaPanel } from './EstadoCuentaPanel'

const BASE = 'http://localhost:3001'

function escribir(label: string, valor: string) {
  const input = screen.getByLabelText(label) as HTMLInputElement
  input.value = valor
  fireEvent.input(input, { target: { value: valor } })
}

// E° de Cuenta (22-10-2026): mismo buscador, servicio y columnas que Pago Cta. Cte., solo consulta
describe('EstadoCuentaPanel', () => {
  it('debería mostrar el formulario de Pago Cta. Cte. con título "E° de Cuenta" y sin la maqueta anterior', () => {
    renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
    expect(document.querySelector('ui5-card-header[title-text="E° de Cuenta"]')).not.toBeNull()
    expect(screen.getByLabelText('Rut')).toBeInTheDocument()
    expect(screen.getByLabelText('Cliente')).toBeInTheDocument()
    expect(screen.getByLabelText('Sucursal')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha vencimiento')).toBeInTheDocument()
    expect(screen.getByText('Identifique al cliente para ver sus partidas abiertas.')).toBeInTheDocument()
    // Datos de ejemplo de la maqueta y aviso "pendiente de API" eliminados
    expect(screen.queryByText('1800449465')).not.toBeInTheDocument()
    expect(screen.queryByText(/pendiente de API/)).not.toBeInTheDocument()
  })

  it('debería exigir RUT o Cliente y rechazar un RUT inválido', async () => {
    renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    expect(await screen.findByText('Ingrese el RUT o el código de Cliente')).toBeInTheDocument()
    escribir('Rut', '96.719.960-0')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    expect(await screen.findByText('El RUT ingresado no es válido')).toBeInTheDocument()
  })

  it('debería identificar al cliente por RUT y cargar su nombre', async () => {
    renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
    escribir('Rut', '96.719.960-5')
    fireEvent.click(screen.getByTestId('ctacte-buscar'))
    await waitFor(() => expect(screen.getByTestId('ctacte-nombre')).toHaveTextContent('AGRICOLA G.M. LIMITADA'))
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('10042446')
  })

  it('debería listar las partidas del cliente con las columnas de Pago Cta. Cte., sin selección ni Pagos', async () => {
    renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    expect(await screen.findByText('1800000009', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByTestId('estado-cuenta-total')).toHaveTextContent('4 partidas abiertas — Total: $108.180')
    expect(screen.getByText('Vencida (40 d)')).toBeInTheDocument()
    expect(screen.getAllByText('Boleta Electronica')).toHaveLength(2)
    // Mismas columnas (ordenables), sin "Sel." ni checkboxes ni botón Pagos
    expect(screen.getByTestId('ctacte-orden-fechaVencimiento')).toHaveTextContent('Fecha de vencimiento')
    expect(screen.queryByText('Sel.')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Seleccionar documento 1800000009')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ctacte-pagos')).not.toBeInTheDocument()
    expect(screen.getByTestId('exportar-estado-cuenta')).toBeInTheDocument()
  })

  it('debería ordenar por la columna al hacer clic en su cabecera', async () => {
    renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    await screen.findByText('1800000009', {}, { timeout: 5000 })
    const documentos = () => screen.getAllByText(/^18000000\d\d$/).map((el) => el.textContent)
    expect(documentos()).toEqual(['1800000001', '1800000009', '1800000011', '1800000012'])
    fireEvent.click(screen.getByTestId('ctacte-orden-monto'))
    expect(documentos()).toEqual(['1800000011', '1800000012', '1800000001', '1800000009'])
  })

  it('debería avisar cuando el cliente no tiene partidas abiertas', async () => {
    renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
    escribir('Cliente', '10042446')
    fireEvent.change(screen.getByLabelText('Cliente'))
    expect(await screen.findByText('El cliente 10042446 no tiene partidas abiertas.')).toBeInTheDocument()
  })

  it('debería mostrar el error de SAP al consultar las partidas', async () => {
    server.use(http.get(`${BASE}/api/sap-cta-cte/partidas`, () =>
      HttpResponse.json({ success: false, message: 'Error al consultar las partidas abiertas en SAP' }, { status: 500 })))
    renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
    escribir('Cliente', '10000003')
    fireEvent.change(screen.getByLabelText('Cliente'))
    expect(await screen.findByText('Error al consultar las partidas abiertas en SAP')).toBeInTheDocument()
  })

  describe('PDF del estado de cuenta', () => {
    beforeEach(() => {
      // jsdom no implementa URL.createObjectURL
      URL.createObjectURL = vi.fn(() => 'blob:estado-cuenta')
      URL.revokeObjectURL = vi.fn()
    })

    it('"Generar PDF" debería estar deshabilitado hasta identificar al cliente', () => {
      renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
      expect(screen.getByTestId('estado-cuenta-generar-pdf')).toHaveAttribute('disabled')
      expect(screen.getByText('Identifique al cliente y presione "Generar PDF".')).toBeInTheDocument()
    })

    it('debería generar el PDF y mostrarlo con Descargar e Imprimir', async () => {
      renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
      escribir('Cliente', '10000003')
      fireEvent.change(screen.getByLabelText('Cliente'))
      await screen.findByText('1800000009', {}, { timeout: 5000 })
      await waitFor(() => expect(screen.getByTestId('estado-cuenta-generar-pdf')).not.toHaveAttribute('disabled'))
      fireEvent.click(screen.getByTestId('estado-cuenta-generar-pdf'))
      const visor = await screen.findByTestId('estado-cuenta-visor', {}, { timeout: 5000 })
      expect(visor).toHaveAttribute('src', 'blob:estado-cuenta')
      expect(screen.getByTestId('estado-cuenta-descargar')).toBeInTheDocument()
      expect(screen.getByTestId('estado-cuenta-imprimir')).toBeInTheDocument()
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    })

    it('debería mostrar el error si no se pueden obtener los datos del encabezado', async () => {
      server.use(http.get(`${BASE}/api/sap-cta-cte/estado-cuenta/encabezado`, () =>
        HttpResponse.json({ success: false, message: 'Error al consultar los datos del estado de cuenta' }, { status: 500 })))
      renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
      escribir('Cliente', '10000003')
      fireEvent.change(screen.getByLabelText('Cliente'))
      await screen.findByText('1800000009', {}, { timeout: 5000 })
      await waitFor(() => expect(screen.getByTestId('estado-cuenta-generar-pdf')).not.toHaveAttribute('disabled'))
      fireEvent.click(screen.getByTestId('estado-cuenta-generar-pdf'))
      expect(await screen.findByTestId('estado-cuenta-error-pdf', {}, { timeout: 5000 })).toHaveTextContent('Error al consultar los datos del estado de cuenta')
      expect(screen.queryByTestId('estado-cuenta-visor')).not.toBeInTheDocument()
    })
  })

  it('debería mostrar la caja de pendientes en modo técnico', () => {
    renderWithProviders(<EstadoCuentaPanel onVolver={vi.fn()} />)
    expect(screen.getByTestId('pendientes-estado-cuenta')).toBeInTheDocument()
  })

  it('"Volver" debería avisar al módulo Caja', () => {
    const onVolver = vi.fn()
    renderWithProviders(<EstadoCuentaPanel onVolver={onVolver} />)
    fireEvent.click(screen.getByTestId('estado-cuenta-volver'))
    expect(onVolver).toHaveBeenCalled()
  })
})
