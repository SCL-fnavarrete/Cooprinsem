import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { ClienteSearch } from './ClienteSearch'
import { renderWithProviders } from '@/test/helpers'

describe('ClienteSearch', () => {
  const defaultProps = {
    onClienteSeleccionado: vi.fn(),
    onClienteDeseleccionado: vi.fn(),
    sucursal: 'D190',
  }

  it('renderiza el input de búsqueda', () => {
    renderWithProviders(<ClienteSearch {...defaultProps} />)
    expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument()
  })

  it('muestra el botón Cliente Boleta', () => {
    renderWithProviders(<ClienteSearch {...defaultProps} />)
    expect(screen.getByText('Cliente Boleta')).toBeInTheDocument()
  })

  it('renderiza con disabled=true sin errores', () => {
    renderWithProviders(<ClienteSearch {...defaultProps} disabled />)
    expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument()
  })
})
