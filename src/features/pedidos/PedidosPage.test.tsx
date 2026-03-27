import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { PedidosPage } from './PedidosPage'

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

// Polyfill checkVisibility para jsdom
if (!Element.prototype.checkVisibility) {
  Element.prototype.checkVisibility = () => true
}

describe('PedidosPage', () => {
  describe('menú lateral', () => {
    it('muestra los 6 botones del menú', () => {
      renderWithProviders(<PedidosPage />, { user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' } })

      expect(screen.getByText('Pedidos')).toBeInTheDocument()
      expect(screen.getByText('Cotización')).toBeInTheDocument()
      expect(screen.getByText('Busqueda Doc')).toBeInTheDocument()
      expect(screen.getByText('Clientes')).toBeInTheDocument()
      expect(screen.getByText('Nota Creditos')).toBeInTheDocument()
      expect(screen.getByText('Reporte DIIO')).toBeInTheDocument()
    })

    it('tiene 3 botones habilitados y 3 deshabilitados', () => {
      renderWithProviders(<PedidosPage />, { user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' } })

      const nav = screen.getByRole('navigation', { name: /menú de pedidos/i })
      const buttons = nav.querySelectorAll('ui5-button')

      // Pedidos, Busqueda Doc, Clientes → habilitados
      // Cotización, Nota Creditos, Reporte DIIO → deshabilitados
      const habilitados = Array.from(buttons).filter(b => !b.hasAttribute('disabled'))
      const deshabilitados = Array.from(buttons).filter(b => b.hasAttribute('disabled'))

      expect(habilitados).toHaveLength(3)
      expect(deshabilitados).toHaveLength(3)
    })
  })

  describe('contenido por defecto', () => {
    it('muestra PedidoListPage como contenido al montar', () => {
      renderWithProviders(<PedidosPage />, { user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' } })

      // PedidoListPage tiene el título "Pedidos de Venta"
      expect(screen.getByText('Pedidos de Venta')).toBeInTheDocument()
    })
  })

  describe('navegación entre módulos', () => {
    it('muestra BusquedaDocPanel al hacer clic en Busqueda Doc', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PedidosPage />, { user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' } })

      await user.click(screen.getByText('Busqueda Doc'))

      expect(screen.getByText('Búsqueda de documentos')).toBeInTheDocument()
    })

    it('muestra ClientesPanel al hacer clic en Clientes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PedidosPage />, { user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' } })

      await user.click(screen.getByText('Clientes'))

      // ClientesPanel muestra sub-tabs Buscar, Crear, Ficha
      expect(screen.getByText('Buscar')).toBeInTheDocument()
      expect(screen.getByText('Crear')).toBeInTheDocument()
      expect(screen.getByText('Ficha')).toBeInTheDocument()
    })
  })
})
