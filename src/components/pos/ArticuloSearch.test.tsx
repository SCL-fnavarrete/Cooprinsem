import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { ArticuloSearch } from './ArticuloSearch'
import { renderWithProviders } from '@/test/helpers'

describe('ArticuloSearch', () => {
  it('renderiza el input de búsqueda', () => {
    renderWithProviders(
      <ArticuloSearch onArticuloSeleccionado={vi.fn()} />
    )
    expect(screen.getByPlaceholderText(/buscar artículo/i)).toBeInTheDocument()
  })

  it('renderiza con disabled=true sin errores', () => {
    renderWithProviders(
      <ArticuloSearch onArticuloSeleccionado={vi.fn()} disabled />
    )
    expect(screen.getByPlaceholderText(/buscar artículo/i)).toBeInTheDocument()
  })
})
