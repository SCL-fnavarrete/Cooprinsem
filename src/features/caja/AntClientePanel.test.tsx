import { describe, it, expect } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { AntClientePanel } from './AntClientePanel'
import { renderWithProviders } from '@/test/helpers'
import { server } from '@/services/mock/server'

const BASE = 'http://localhost:3001'

// Helper: simula input en UI5 Input (jsdom + web components)
function setInputValue(input: HTMLElement, value: string) {
  fireEvent.input(input, { target: { value } })
}

describe('AntClientePanel', () => {
  it('renderiza el formulario de búsqueda inicial', () => {
    renderWithProviders(<AntClientePanel />)

    expect(screen.getByText('Anticipo de Cliente')).toBeInTheDocument()
    expect(screen.getByLabelText('Código cliente')).toBeInTheDocument()
    expect(screen.getByLabelText('Nº comprobante')).toBeInTheDocument()
    expect(screen.getByText('Buscar')).toBeInTheDocument()
  })

  it('botón "Buscar" deshabilitado si algún campo vacío', () => {
    renderWithProviders(<AntClientePanel />)

    const buscarBtn = screen.getByText('Buscar').closest('ui5-button') as HTMLElement
    expect(buscarBtn).toHaveAttribute('disabled')

    // Solo llenar uno
    setInputValue(screen.getByLabelText('Código cliente'), '0001000001')

    // Aún deshabilitado (falta comprobante)
    expect(buscarBtn).toHaveAttribute('disabled')
  })

  it('muestra loading mientras busca', async () => {
    server.use(
      http.post(`${BASE}/api/anticipos/buscar`, async () => {
        await new Promise((r) => setTimeout(r, 200))
        return HttpResponse.json({
          d: {
            nroComprobante: '1400000015',
            kunnr: '0001000001',
            nombre: 'Test',
            rut: '12.345.678-9',
            importe: 100000,
            fechaDoc: '07/03/2026',
            glosa: 'Test',
            estado: 'PENDIENTE',
          },
        })
      })
    )

    renderWithProviders(<AntClientePanel />)

    setInputValue(screen.getByLabelText('Código cliente'), '0001000001')
    setInputValue(screen.getByLabelText('Nº comprobante'), '1400000015')

    const buscarBtn = screen.getByText('Buscar').closest('ui5-button') as HTMLElement
    await userEvent.click(buscarBtn)

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
  })

  it('con datos válidos muestra panel de confirmación con importe formateado', async () => {
    renderWithProviders(<AntClientePanel />)

    setInputValue(screen.getByLabelText('Código cliente'), '0001000001')
    setInputValue(screen.getByLabelText('Nº comprobante'), '1400000015')

    const buscarBtn = screen.getByText('Buscar').closest('ui5-button') as HTMLElement
    await userEvent.click(buscarBtn)

    // Esperar que aparezca el importe del anticipo (indica que la Card se renderizó)
    await waitFor(() => {
      expect(screen.getByTestId('importe-anticipo')).toBeInTheDocument()
    })

    expect(screen.getByTestId('importe-anticipo')).toHaveTextContent('$350.000')
    expect(screen.getByText('Procesar Pago')).toBeInTheDocument()
    // Verificar que el formulario de búsqueda ya no está visible
    expect(screen.queryByLabelText('Código cliente')).not.toBeInTheDocument()
  })

  it('con datos inválidos muestra mensaje de error inline', async () => {
    renderWithProviders(<AntClientePanel />)

    setInputValue(screen.getByLabelText('Código cliente'), '9999999999')
    setInputValue(screen.getByLabelText('Nº comprobante'), '0000000000')

    const buscarBtn = screen.getByText('Buscar').closest('ui5-button') as HTMLElement
    await userEvent.click(buscarBtn)

    await waitFor(() => {
      expect(screen.getByText('Comprobante no encontrado para el cliente indicado')).toBeInTheDocument()
    })
  })

  it('botón "Cancelar" en confirmación vuelve al formulario', async () => {
    renderWithProviders(<AntClientePanel />)

    setInputValue(screen.getByLabelText('Código cliente'), '0001000001')
    setInputValue(screen.getByLabelText('Nº comprobante'), '1400000015')
    await userEvent.click(screen.getByText('Buscar').closest('ui5-button') as HTMLElement)

    await waitFor(() => {
      expect(screen.getByTestId('importe-anticipo')).toBeInTheDocument()
    })

    // El botón Cancelar del Card tiene design="Default", el del Dialog tiene design="Transparent"
    const cancelBtns = screen.getAllByText('Cancelar')
    const cancelBtn = cancelBtns.find((el) => {
      const btn = el.closest('ui5-button')
      return btn?.getAttribute('design') === 'Default'
    }) as HTMLElement
    await userEvent.click(cancelBtn.closest('ui5-button') as HTMLElement)

    // Vuelve al formulario
    expect(screen.getByLabelText('Código cliente')).toBeInTheDocument()
    expect(screen.queryByTestId('importe-anticipo')).not.toBeInTheDocument()
  })

  it('al confirmar pago exitoso muestra comprobante con BELNR', async () => {
    renderWithProviders(<AntClientePanel />)

    // Buscar anticipo
    setInputValue(screen.getByLabelText('Código cliente'), '0001000001')
    setInputValue(screen.getByLabelText('Nº comprobante'), '1400000015')
    await userEvent.click(screen.getByText('Buscar').closest('ui5-button') as HTMLElement)

    await waitFor(() => {
      expect(screen.getByTestId('importe-anticipo')).toBeInTheDocument()
    })

    // Abrir modal de pago
    await userEvent.click(screen.getByText('Procesar Pago').closest('ui5-button') as HTMLElement)

    // Esperar que el modal se abra (Dialog headerText es atributo, buscar contenido visible)
    await waitFor(() => {
      expect(screen.getByLabelText('Monto recibido')).toBeInTheDocument()
    })

    // Ingresar monto y confirmar
    setInputValue(screen.getByLabelText('Monto recibido'), '400000')

    const confirmarBtn = screen.getByText('Confirmar Cobro').closest('ui5-button') as HTMLElement
    await userEvent.click(confirmarBtn)

    // Comprobante mostrado
    await waitFor(() => {
      expect(screen.getByTestId('comprobante-anticipo')).toBeInTheDocument()
    })

    expect(screen.getByText('Anticipo cobrado exitosamente')).toBeInTheDocument()
    expect(screen.getByText('1500099999')).toBeInTheDocument()
    expect(screen.getByText('Nuevo Anticipo')).toBeInTheDocument()
  })
})
