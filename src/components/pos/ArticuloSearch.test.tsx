import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
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

  describe('teclado en las sugerencias (27-10-2026)', () => {
    const material = { Material: '14700006', MaterialDescription: 'Fertilizante NPK', Plant: 'D190', StorageLocation: 'B000', UnrestrictedStock: '10', BaseUnit: 'UN' }

    async function buscarConSugerencias() {
      server.use(http.get('http://localhost:3001/api/sap-stock/buscar', () => HttpResponse.json({ success: true, data: [material] })))
      const onSel = vi.fn()
      renderWithProviders(<ArticuloSearch onArticuloSeleccionado={onSel} centro="D190" />)
      const input = screen.getByPlaceholderText(/buscar artículo/i) as HTMLElement & { value: string }
      input.value = 'npk'
      fireEvent.input(input)
      await waitFor(() => expect(document.querySelector('ui5-suggestion-item')).not.toBeNull(), { timeout: 3000 })
      return { input, onSel }
    }

    it('moverse con las flechas (vista previa) no debería agregar el artículo', async () => {
      const { input, onSel } = await buscarConSugerencias()
      const item = document.querySelector('ui5-suggestion-item')
      fireEvent(input, new CustomEvent('selection-change', { detail: { item } }))
      expect(onSel).not.toHaveBeenCalled()
    })

    it('Enter o clic (change con el texto de la sugerencia) debería agregarlo', async () => {
      const { input, onSel } = await buscarConSugerencias()
      input.value = '14700006 - Fertilizante NPK'
      fireEvent.change(input)
      expect(onSel).toHaveBeenCalledWith(expect.objectContaining({ codigoMaterial: '14700006' }))
    })

    it('un texto que no es una sugerencia no debería agregar nada', async () => {
      const { input, onSel } = await buscarConSugerencias()
      input.value = 'npk'
      fireEvent.change(input)
      expect(onSel).not.toHaveBeenCalled()
    })
  })
})
