import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
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

  describe('teclado en las sugerencias (27-10-2026)', () => {
    async function buscar() {
      const onSel = vi.fn()
      renderWithProviders(<ClienteSearch {...defaultProps} onClienteSeleccionado={onSel} />)
      const input = screen.getByPlaceholderText(/buscar cliente/i) as HTMLElement & { value: string }
      input.value = 'cutiño'
      fireEvent.input(input)
      await waitFor(() => expect(document.querySelectorAll('ui5-suggestion-item').length).toBe(2), { timeout: 3000 })
      return { input, onSel }
    }

    it('moverse con las flechas (vista previa) no debería elegir el cliente', async () => {
      const { input, onSel } = await buscar()
      fireEvent(input, new CustomEvent('selection-change', { detail: { item: document.querySelector('ui5-suggestion-item') } }))
      expect(onSel).not.toHaveBeenCalled()
      expect(input).not.toHaveAttribute('disabled')
    })

    it('Enter o clic (change con el texto de la sugerencia) debería elegirlo', async () => {
      const { input, onSel } = await buscar()
      input.value = '1 - CUTIÑO OBANDO SERGIO DAVID (16029421-3)'
      fireEvent.change(input)
      expect(onSel).toHaveBeenCalledWith(expect.objectContaining({ codigoCliente: '1' }))
    })
  })
})
