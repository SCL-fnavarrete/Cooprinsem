import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { PedidoPage } from './PedidoPage'
import { renderWithProviders } from '@/test/helpers'

describe('PedidoPage', () => {
  it('renderiza el título de la página', () => {
    renderWithProviders(<PedidoPage />)
    expect(screen.getByText(/crear venta/i)).toBeInTheDocument()
  })

  it('renderiza el buscador de cliente', () => {
    renderWithProviders(<PedidoPage />)
    expect(screen.getByPlaceholderText(/buscar cliente/i)).toBeInTheDocument()
  })

  it('renderiza el buscador de artículos', () => {
    renderWithProviders(<PedidoPage />)
    expect(screen.getByPlaceholderText(/buscar artículo/i)).toBeInTheDocument()
  })

  it('renderiza el mensaje de grilla vacía', () => {
    renderWithProviders(<PedidoPage />)
    expect(screen.getByText(/busque y agregue artículos al pedido/i)).toBeInTheDocument()
  })

  it('muestra totales en $0 inicialmente', () => {
    renderWithProviders(<PedidoPage />)
    // Al menos un $0 en los totales
    expect(screen.getAllByText(/\$0/).length).toBeGreaterThan(0)
  })

  it('renderiza el botón Grabar', () => {
    renderWithProviders(<PedidoPage />)
    expect(screen.getByText(/grabar/i)).toBeInTheDocument()
  })
})
