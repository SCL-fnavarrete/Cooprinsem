import { describe, it, expect, beforeAll } from 'vitest'
import { screen } from '@testing-library/react'
import { CajaPage } from './CajaPage'
import { renderWithProviders } from '@/test/helpers'

// Polyfill: jsdom no tiene checkVisibility (usado por UI5 Table internamente)
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

describe('CajaPage', () => {
  describe('menú lateral', () => {
    it('muestra los 8 botones del menú de caja', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText('Pago Cta. Cte.')).toBeInTheDocument()
      expect(screen.getByText('Egr. de Caja')).toBeInTheDocument()
      expect(screen.getByText('List. Pagarés')).toBeInTheDocument()
      expect(screen.getByText('Ant. Cliente')).toBeInTheDocument()
      expect(screen.getByText('E° de Cuenta')).toBeInTheDocument()
      expect(screen.getByText('Consulta Pago')).toBeInTheDocument()
      expect(screen.getByText('Arqueo Caja')).toBeInTheDocument()
      expect(screen.getByText('Salir de la Caja')).toBeInTheDocument()
    })

    it('solo Pago Cta. Cte. está habilitado', () => {
      renderWithProviders(<CajaPage />)
      const pagoBtn = screen.getByText('Pago Cta. Cte.').closest('ui5-button')
      expect(pagoBtn).not.toHaveAttribute('disabled')

      // Los demás deshabilitados
      const egresoBtn = screen.getByText('Egr. de Caja').closest('ui5-button')
      expect(egresoBtn).toHaveAttribute('disabled')

      const pagaresBtn = screen.getByText('List. Pagarés').closest('ui5-button')
      expect(pagaresBtn).toHaveAttribute('disabled')

      const anticipoBtn = screen.getByText('Ant. Cliente').closest('ui5-button')
      expect(anticipoBtn).toHaveAttribute('disabled')

      const edoCuentaBtn = screen.getByText('E° de Cuenta').closest('ui5-button')
      expect(edoCuentaBtn).toHaveAttribute('disabled')

      const consultaBtn = screen.getByText('Consulta Pago').closest('ui5-button')
      expect(consultaBtn).toHaveAttribute('disabled')

      const arqueoBtn = screen.getByText('Arqueo Caja').closest('ui5-button')
      expect(arqueoBtn).toHaveAttribute('disabled')

      const salirBtn = screen.getByText('Salir de la Caja').closest('ui5-button')
      expect(salirBtn).toHaveAttribute('disabled')
    })
  })

  describe('flujo Pago Cuenta Corriente', () => {
    it('muestra el título del módulo', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/Pago Cuenta Corriente/)).toBeInTheDocument()
    })

    it('muestra búsqueda de cliente', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument()
    })

    it('muestra botón Cliente Boleta', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText('Cliente Boleta')).toBeInTheDocument()
    })
  })
})
