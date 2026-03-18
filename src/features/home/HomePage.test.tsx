import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
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
    it('muestra 3 tiles sin auto-redirección', () => {
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
    it('redirige automáticamente a /pedidos (solo 1 tile)', async () => {
      renderWithProviders(<HomePage />, {
        user: { id: 'vendedor', nombre: 'Vendedor', rolCod: 2, sucursal: 'D190' },
      })
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/pedidos', { replace: true })
      })
    })
  })

  describe('Rol 3 (Caja)', () => {
    it('redirige automáticamente a /caja (solo 1 tile)', async () => {
      renderWithProviders(<HomePage />, {
        user: { id: 'cajero', nombre: 'Cajero', rolCod: 3, sucursal: 'D190' },
      })
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/caja', { replace: true })
      })
    })
  })

  describe('Rol 4 (Consultas)', () => {
    it('redirige automáticamente a /pedidos (solo 1 tile)', async () => {
      renderWithProviders(<HomePage />, {
        user: { id: 'consulta', nombre: 'Consulta', rolCod: 4, sucursal: 'D190' },
      })
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/pedidos', { replace: true })
      })
    })
  })

  it('muestra sucursal del usuario', () => {
    renderWithProviders(<HomePage />, {
      user: { id: 'admin', nombre: 'Admin', rolCod: 1, sucursal: 'D190' },
    })
    // Sucursal info is rendered as text "Sucursal D190 — Osorno"
    const text = document.body.textContent ?? ''
    expect(text).toContain('D190')
    expect(text).toContain('Osorno')
  })
})
