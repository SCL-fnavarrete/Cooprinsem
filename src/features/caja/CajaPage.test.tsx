import { describe, it, expect, beforeAll, vi } from 'vitest'
import { screen } from '@testing-library/react'
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
})

describe('CajaPage', () => {
  describe('menú lateral', () => {
    it('muestra los botones del menú de caja, con Home primero y Pago Cta. Cte. debajo', () => {
      renderWithProviders(<CajaPage />)
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

    it('no muestra Ant. Cliente ni Salir de la Caja (deshabilitados y ocultos)', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.queryByText('Ant. Cliente')).not.toBeInTheDocument()
      expect(screen.queryByText('Salir de la Caja')).not.toBeInTheDocument()
    })

    it('no abre Ant. Cliente aunque venga en ?modulo=', () => {
      window.history.pushState({}, '', '/caja?modulo=ant-cliente')
      renderWithProviders(<CajaPage />)
      expect(screen.queryByText('Anticipo de Cliente')).not.toBeInTheDocument()
      window.history.pushState({}, '', '/')
    })

    it('Pago Cta. Cte., List. Pagarés y Arqueo Caja están habilitados', () => {
      renderWithProviders(<CajaPage />)
      const pagoBtn = screen.getByText('Pago Cta. Cte.').closest('ui5-button')
      expect(pagoBtn).not.toHaveAttribute('disabled')

      const pagaresBtn = screen.getByText('List. Pagarés').closest('ui5-button')
      expect(pagaresBtn).not.toHaveAttribute('disabled')

      const arqueoBtn = screen.getByText('Arqueo Caja').closest('ui5-button')
      expect(arqueoBtn).not.toHaveAttribute('disabled')
    })
  })

  describe('panel de información de sesión', () => {
    it('muestra el id y nombre del usuario', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/cajero\.test — Cajero Test/)).toBeInTheDocument()
    })

    it('muestra la sucursal con nombre', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/D190 — Osorno/)).toBeInTheDocument()
    })

    it('muestra la sociedad COOP', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/COOP — COOPRINSEM LTDA\./)).toBeInTheDocument()
    })
  })

  describe('flujo Listado documentos', () => {
    it('muestra el título "Listado documentos"', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByText(/Listado documentos/)).toBeInTheDocument()
    })

    it('muestra solo los filtros que corresponden a columnas de la tabla', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('filtro-cliente')).toBeInTheDocument()
      expect(screen.getByTestId('filtro-nombre')).toBeInTheDocument()
      expect(screen.queryByTestId('filtro-documento')).not.toBeInTheDocument()
      expect(screen.queryByTestId('filtro-pedido')).not.toBeInTheDocument()
    })

    it('no muestra botón Cliente Boleta ni búsqueda de cliente', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.queryByTestId('btn-cliente-boleta')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/buscar cliente por RUT/i)).not.toBeInTheDocument()
    })

    it('muestra la tabla vacía con las columnas del WebDynpro y el aviso de pendientes', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('listado-documentos-caja')).toBeInTheDocument()
      expect(screen.getByText('No hay documentos disponibles para pagar')).toBeInTheDocument()
      expect(screen.getByTestId('pendientes-home-caja')).toBeInTheDocument()
    })

    it('muestra el filtro de estado', () => {
      renderWithProviders(<CajaPage />)
      expect(screen.getByTestId('filtro-estado')).toBeInTheDocument()
    })
  })
})
