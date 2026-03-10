import { describe, it, expect, vi, beforeAll } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { PedidoListPage } from './PedidoListPage'
import { renderWithProviders } from '@/test/helpers'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Polyfill: jsdom no tiene checkVisibility
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

describe('PedidoListPage', () => {
  it('carga y muestra lista de pedidos al montar', async () => {
    renderWithProviders(<PedidoListPage />, {
      user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' },
    })

    await waitFor(() => {
      expect(screen.getByText('0080000001')).toBeInTheDocument()
    })

    expect(screen.getByText('Agricola Los Boldos Ltda.')).toBeInTheDocument()
    // Hay 2 pedidos con cliente boleta — verificar que al menos 1 aparece
    expect(screen.getAllByText('Consumidor Final (Boleta)').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra total formateado en CLP', async () => {
    renderWithProviders(<PedidoListPage />, {
      user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' },
    })

    await waitFor(() => {
      expect(screen.getByText('$185.000')).toBeInTheDocument()
    })
    expect(screen.getByText('$2.350.000')).toBeInTheDocument()
  })

  it('muestra boton "Nuevo Pedido" para rol 1 (Administrador)', async () => {
    renderWithProviders(<PedidoListPage />, {
      user: { id: 'admin', nombre: 'Admin', rolCod: 1, sucursal: 'D190' },
    })

    expect(screen.getByText('Nuevo Pedido')).toBeInTheDocument()
  })

  it('muestra boton "Nuevo Pedido" para rol 2 (Ventas)', async () => {
    renderWithProviders(<PedidoListPage />, {
      user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' },
    })

    expect(screen.getByText('Nuevo Pedido')).toBeInTheDocument()
  })

  it('NO muestra boton "Nuevo Pedido" para rol 4 (Consultas)', async () => {
    renderWithProviders(<PedidoListPage />, {
      user: { id: 'consulta', nombre: 'Consulta', rolCod: 4, sucursal: 'D190' },
    })

    expect(screen.queryByText('Nuevo Pedido')).not.toBeInTheDocument()
  })

  it('muestra estado vacio cuando no hay pedidos', async () => {
    server.use(
      http.get('http://localhost:3001/api/pedidos', () => {
        return HttpResponse.json({ d: { results: [] } })
      })
    )

    renderWithProviders(<PedidoListPage />, {
      user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' },
    })

    await waitFor(() => {
      expect(screen.getByText(/No hay pedidos para el período seleccionado/)).toBeInTheDocument()
    })
  })

  it('muestra titulo "Pedidos de Venta"', () => {
    renderWithProviders(<PedidoListPage />, {
      user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' },
    })

    expect(screen.getByText('Pedidos de Venta')).toBeInTheDocument()
  })

  it('click en fila navega a /pedidos/:vbeln (detalle)', async () => {
    renderWithProviders(<PedidoListPage />, {
      user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' },
    })

    await waitFor(() => {
      expect(screen.getByText('0080000001')).toBeInTheDocument()
    })

    // Simular click en la fila — TableRow dispara onClick
    const row = screen.getByText('0080000001').closest('ui5-table-row') as HTMLElement | null
    if (row) row.click()

    expect(mockNavigate).toHaveBeenCalledWith('/pedidos/0080000001')
  })
})
