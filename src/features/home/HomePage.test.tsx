import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HomePage } from './HomePage'
import { renderWithProviders } from '@/test/helpers'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('HomePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  describe('Rol 1 (Administrador)', () => {
    it('muestra 3 tiles: Administracion, Pedidos, Caja', () => {
      renderWithProviders(<HomePage />, {
        user: { id: 'admin', nombre: 'Admin', rolCod: 1, sucursal: 'D190' },
      })
      const text = document.body.textContent ?? ''
      expect(text).toContain('Administracion')
      expect(text).toContain('Pedidos')
      expect(text).toContain('Caja')
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Rol 2 (Ventas)', () => {
    it('muestra solo tile Pedidos sin auto-redirección', () => {
      renderWithProviders(<HomePage />, {
        user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' },
      })
      const text = document.body.textContent ?? ''
      expect(text).toContain('Pedidos')
      expect(text).not.toContain('Administracion')
      expect(text).not.toContain('Cobros, pagos y arqueo')
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Rol 3 (Caja)', () => {
    it('muestra solo tile Caja sin auto-redirección', () => {
      renderWithProviders(<HomePage />, {
        user: { id: 'cajero', nombre: 'Cajero', rolCod: 3, sucursal: 'D190' },
      })
      const text = document.body.textContent ?? ''
      expect(text).toContain('Caja')
      expect(text).not.toContain('Administracion')
      expect(text).not.toContain('Crear y consultar ventas')
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Rol 4 (Consultas)', () => {
    it('muestra solo tile Pedidos sin auto-redirección', () => {
      renderWithProviders(<HomePage />, {
        user: { id: 'consulta', nombre: 'Consulta', rolCod: 4, sucursal: 'D190' },
      })
      const text = document.body.textContent ?? ''
      expect(text).toContain('Pedidos')
      expect(text).not.toContain('Administracion')
      expect(text).not.toContain('Cobros, pagos y arqueo')
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  it('muestra sucursal del usuario', () => {
    renderWithProviders(<HomePage />, {
      user: { id: 'admin', nombre: 'Admin', rolCod: 1, sucursal: 'D190' },
    })
    const text = document.body.textContent ?? ''
    expect(text).toContain('D190')
    expect(text).toContain('Osorno')
  })
})
