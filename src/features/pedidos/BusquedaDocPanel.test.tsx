import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { BusquedaDocPanel } from './BusquedaDocPanel'

// Polyfill checkVisibility para jsdom
if (!Element.prototype.checkVisibility) {
  Element.prototype.checkVisibility = () => true
}

describe('BusquedaDocPanel', () => {
  it('muestra el formulario de búsqueda con título y radio buttons', () => {
    renderWithProviders(<BusquedaDocPanel />)

    expect(screen.getByText('Búsqueda de documentos')).toBeInTheDocument()
    // RadioButton renderiza el texto como atributo text en UI5 v2
    const radios = document.querySelectorAll('ui5-radio-button')
    expect(radios).toHaveLength(2)
  })

  it('muestra campo Doc. comercial y botones Buscar/Imprimir', () => {
    renderWithProviders(<BusquedaDocPanel />)

    expect(screen.getByText('Doc. comercial:')).toBeInTheDocument()
    expect(screen.getByText('Buscar')).toBeInTheDocument()
    expect(screen.getByText('Imprimir')).toBeInTheDocument()
  })

  it('botón Buscar está deshabilitado si campo vacío', () => {
    renderWithProviders(<BusquedaDocPanel />)

    const buscarBtn = screen.getByText('Buscar').closest('ui5-button')
    expect(buscarBtn).toHaveAttribute('disabled')
  })

  it('botón Imprimir está deshabilitado (próximamente)', () => {
    renderWithProviders(<BusquedaDocPanel />)

    const imprimirBtn = screen.getByText('Imprimir').closest('ui5-button')
    expect(imprimirBtn).toHaveAttribute('disabled')
  })
})
