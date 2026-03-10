import { describe, it, expect, beforeAll } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArqueoCajaPanel } from './ArqueoCajaPanel'
import { renderWithProviders } from '@/test/helpers'

// Polyfill: jsdom no tiene checkVisibility (usado por UI5 Table internamente)
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

// Helper: simula input en UI5 Input (jsdom + web components)
function setInputValue(input: HTMLElement, value: string) {
  fireEvent.input(input, { target: { value } })
}

describe('ArqueoCajaPanel', () => {
  describe('vista cajero (rol 3)', () => {
    it('muestra titulo y mensaje informativo', () => {
      renderWithProviders(<ArqueoCajaPanel />)
      expect(screen.getByText('Arqueo de Caja')).toBeInTheDocument()
      expect(screen.getByText(/Ingrese los montos por tipo de pago/)).toBeInTheDocument()
    })

    it('muestra selector de tipo de pago, input de monto y boton Agregar', () => {
      renderWithProviders(<ArqueoCajaPanel />)
      expect(screen.getByLabelText('Tipo de pago')).toBeInTheDocument()
      expect(screen.getByLabelText('Monto')).toBeInTheDocument()
      expect(screen.getByText('Agregar')).toBeInTheDocument()
    })

    it('muestra mensaje de advertencia cuando no hay detalles', () => {
      renderWithProviders(<ArqueoCajaPanel />)
      expect(screen.getByText(/Agregue al menos un tipo de pago/)).toBeInTheDocument()
    })

    it('agrega un detalle a la tabla al hacer clic en Agregar', async () => {
      renderWithProviders(<ArqueoCajaPanel />)

      setInputValue(screen.getByLabelText('Monto'), '450000')
      await userEvent.click(screen.getByText('Agregar').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByTestId('tabla-arqueo')).toBeInTheDocument()
      })
      expect(screen.getByText('$450.000')).toBeInTheDocument()
    })

    it('calcula el total correctamente', async () => {
      renderWithProviders(<ArqueoCajaPanel />)

      setInputValue(screen.getByLabelText('Monto'), '450000')
      await userEvent.click(screen.getByText('Agregar').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByTestId('total-arqueo')).toHaveTextContent('$450.000')
      })
    })

    it('elimina un detalle al hacer clic en el boton eliminar', async () => {
      renderWithProviders(<ArqueoCajaPanel />)

      setInputValue(screen.getByLabelText('Monto'), '300000')
      await userEvent.click(screen.getByText('Agregar').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByTestId('tabla-arqueo')).toBeInTheDocument()
      })

      const eliminarBtn = screen.getByLabelText(/Eliminar EFECTIVO/).closest('ui5-button') as HTMLElement
      await userEvent.click(eliminarBtn)

      await waitFor(() => {
        expect(screen.queryByTestId('tabla-arqueo')).not.toBeInTheDocument()
      })
    })

    it('graba el arqueo y muestra la vista de confirmacion', async () => {
      renderWithProviders(<ArqueoCajaPanel />)

      setInputValue(screen.getByLabelText('Monto'), '500000')
      await userEvent.click(screen.getByText('Agregar').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByText('Grabar Arqueo')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Grabar Arqueo').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByTestId('arqueo-cerrado')).toBeInTheDocument()
      })
      expect(screen.getByText(/Arqueo grabado exitosamente/)).toBeInTheDocument()
    })

    it('permite iniciar un nuevo arqueo despues de grabar', async () => {
      renderWithProviders(<ArqueoCajaPanel />)

      setInputValue(screen.getByLabelText('Monto'), '200000')
      await userEvent.click(screen.getByText('Agregar').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByText('Grabar Arqueo')).toBeInTheDocument()
      })
      await userEvent.click(screen.getByText('Grabar Arqueo').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByText('Nuevo Arqueo')).toBeInTheDocument()
      })
      await userEvent.click(screen.getByText('Nuevo Arqueo').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByText(/Ingrese los montos por tipo de pago/)).toBeInTheDocument()
      })
    })
  })

  describe('vista admin (rol 1)', () => {
    const adminUser = { id: 'admin', nombre: 'Admin', rolCod: 1 as const, sucursal: 'D190' }

    it('muestra formulario de consulta de arqueo', () => {
      renderWithProviders(<ArqueoCajaPanel />, { user: adminUser })
      expect(screen.getByText('Arqueo de Caja')).toBeInTheDocument()
      expect(screen.getByText(/Consulte el arqueo del cajero/)).toBeInTheDocument()
      expect(screen.getByLabelText('Fecha cierre')).toBeInTheDocument()
      expect(screen.getByLabelText('Sucursal cierre')).toBeInTheDocument()
      expect(screen.getByLabelText('Cajero')).toBeInTheDocument()
    })

    it('boton Consultar Arqueo deshabilitado sin datos completos', () => {
      renderWithProviders(<ArqueoCajaPanel />, { user: adminUser })
      const btn = screen.getByText('Consultar Arqueo').closest('ui5-button') as HTMLElement
      expect(btn).toHaveAttribute('disabled')
    })

    it('consulta el arqueo del dia y muestra resultado', async () => {
      renderWithProviders(<ArqueoCajaPanel />, { user: adminUser })

      setInputValue(screen.getByLabelText('Fecha cierre'), '09/03/2026')
      setInputValue(screen.getByLabelText('Cajero'), 'cajero')

      const btn = screen.getByText('Consultar Arqueo').closest('ui5-button') as HTMLElement
      await userEvent.click(btn)

      await waitFor(() => {
        expect(screen.getByTestId('tabla-arqueo-admin')).toBeInTheDocument()
      })
      expect(screen.getByText('Generar Borrador de Cierre')).toBeInTheDocument()
    })

    it('genera borrador de cierre con tabla comparativa', async () => {
      renderWithProviders(<ArqueoCajaPanel />, { user: adminUser })

      setInputValue(screen.getByLabelText('Fecha cierre'), '09/03/2026')
      setInputValue(screen.getByLabelText('Cajero'), 'cajero')

      await userEvent.click(screen.getByText('Consultar Arqueo').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByText('Generar Borrador de Cierre')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Generar Borrador de Cierre').closest('ui5-button') as HTMLElement)

      await waitFor(() => {
        expect(screen.getByTestId('tabla-cierre-borrador')).toBeInTheDocument()
      })
      expect(screen.getByText('Confirmar Cierre Definitivo')).toBeInTheDocument()
    })

    it('muestra diferencias en la tabla comparativa del borrador', async () => {
      renderWithProviders(<ArqueoCajaPanel />, { user: adminUser })

      setInputValue(screen.getByLabelText('Fecha cierre'), '09/03/2026')
      setInputValue(screen.getByLabelText('Cajero'), 'cajero')

      await userEvent.click(screen.getByText('Consultar Arqueo').closest('ui5-button') as HTMLElement)
      await waitFor(() => { expect(screen.getByText('Generar Borrador de Cierre')).toBeInTheDocument() })

      await userEvent.click(screen.getByText('Generar Borrador de Cierre').closest('ui5-button') as HTMLElement)
      await waitFor(() => { expect(screen.getByTestId('tabla-cierre-borrador')).toBeInTheDocument() })

      // Diferencia de efectivo: $5.000 (mock retorna diferencia 5000 para EF)
      expect(screen.getByTestId('diferencia-EF')).toHaveTextContent('$5.000')
      // Diferencia de tarjeta: $0
      expect(screen.getByTestId('diferencia-TD')).toHaveTextContent('$0')
    })

    it('muestra boton Confirmar Cierre Definitivo en el borrador', async () => {
      renderWithProviders(<ArqueoCajaPanel />, { user: adminUser })

      setInputValue(screen.getByLabelText('Fecha cierre'), '09/03/2026')
      setInputValue(screen.getByLabelText('Cajero'), 'cajero')

      await userEvent.click(screen.getByText('Consultar Arqueo').closest('ui5-button') as HTMLElement)
      await waitFor(() => { expect(screen.getByText('Generar Borrador de Cierre')).toBeInTheDocument() })

      await userEvent.click(screen.getByText('Generar Borrador de Cierre').closest('ui5-button') as HTMLElement)
      await waitFor(() => { expect(screen.getByText('Confirmar Cierre Definitivo')).toBeInTheDocument() })

      // El botón de cierre definitivo está presente y habilitado
      const btn = screen.getByText('Confirmar Cierre Definitivo').closest('ui5-button') as HTMLElement
      expect(btn).toBeTruthy()
      expect(btn).not.toHaveAttribute('disabled')
    })

    it('permite cancelar el cierre desde el borrador', async () => {
      renderWithProviders(<ArqueoCajaPanel />, { user: adminUser })

      setInputValue(screen.getByLabelText('Fecha cierre'), '09/03/2026')
      setInputValue(screen.getByLabelText('Cajero'), 'cajero')

      await userEvent.click(screen.getByText('Consultar Arqueo').closest('ui5-button') as HTMLElement)
      await waitFor(() => { expect(screen.getByText('Generar Borrador de Cierre')).toBeInTheDocument() })

      await userEvent.click(screen.getByText('Generar Borrador de Cierre').closest('ui5-button') as HTMLElement)
      await waitFor(() => { expect(screen.getByText('Cancelar')).toBeInTheDocument() })

      await userEvent.click(screen.getByText('Cancelar').closest('ui5-button') as HTMLElement)

      // Debe volver al formulario de consulta
      await waitFor(() => {
        expect(screen.getByText(/Consulte el arqueo del cajero/)).toBeInTheDocument()
      })
    })
  })
})
