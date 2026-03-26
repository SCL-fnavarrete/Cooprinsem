import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { PedidoTotals } from './PedidoTotals'
import { renderWithProviders } from '@/test/helpers'

describe('PedidoTotals', () => {
  const defaultProps = {
    subtotal: 100000,
    totalIVA: 19000,
    total: 119000,
    observaciones: '',
    onObservacionesChange: vi.fn(),
    ubicacionPredio: '',
    onUbicacionPredioChange: vi.fn(),
    onGrabar: vi.fn(),
    onLimpiar: vi.fn(),
    isGrabando: false,
    canGrabar: true,
  }

  it('muestra los totales formateados en CLP', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} />)
    expect(screen.getByText(/\$100\.000/)).toBeInTheDocument()
    expect(screen.getByText(/\$19\.000/)).toBeInTheDocument()
    expect(screen.getByText(/\$119\.000/)).toBeInTheDocument()
  })

  it('muestra botón Grabar habilitado cuando canGrabar es true', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} />)
    const btn = screen.getByText(/grabar/i)
    expect(btn).toBeInTheDocument()
  })

  it('muestra botón Grabar deshabilitado cuando canGrabar es false', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} canGrabar={false} />)
    const btn = screen.getByText(/grabar/i).closest('ui5-button')
    expect(btn).toHaveAttribute('disabled')
  })

  it('muestra "Grabando..." durante el proceso', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} isGrabando />)
    expect(screen.getByText(/grabando/i)).toBeInTheDocument()
  })

  it('muestra el campo de observaciones', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} />)
    expect(screen.getByPlaceholderText(/observaciones/i)).toBeInTheDocument()
  })

  it('muestra botón Limpiar', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} />)
    expect(screen.getByText('Limpiar')).toBeInTheDocument()
  })

  it('muestra stock por almacén cuando se proporciona', () => {
    const stock = { B000: 20, B001: 10, B002: 5, G000: 0 }
    renderWithProviders(<PedidoTotals {...defaultProps} stockPorCentro={stock} />)
    expect(screen.getByText('B000')).toBeInTheDocument()
    expect(screen.getByText('G000')).toBeInTheDocument()
  })
})
