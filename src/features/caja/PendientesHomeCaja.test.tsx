import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { PendientesHomeCaja } from './PendientesHomeCaja'

describe('PendientesHomeCaja', () => {
  beforeEach(() => localStorage.clear())

  it('debería mostrarse abierto la primera vez con los filtros aplicados', () => {
    renderWithProviders(<PendientesHomeCaja />)
    expect(screen.getByTestId('pendientes-home-caja-detalle')).toHaveTextContent('BusinessPlace eq <sucursal del usuario>')
  })

  it('debería contraerse al hacer clic en el título y recordarlo', () => {
    const { unmount } = renderWithProviders(<PendientesHomeCaja />)
    fireEvent.click(screen.getByText('Pendientes — Caja: Listado documentos'))
    expect(screen.queryByTestId('pendientes-home-caja-detalle')).not.toBeInTheDocument()
    unmount()
    renderWithProviders(<PendientesHomeCaja />)
    expect(screen.queryByTestId('pendientes-home-caja-detalle')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Pendientes — Caja: Listado documentos'))
    expect(screen.getByTestId('pendientes-home-caja-detalle')).toBeInTheDocument()
  })
})
