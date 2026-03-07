import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { ArticuloGrid } from './ArticuloGrid'
import { renderWithProviders } from '@/test/helpers'
import type { ILineaPedido } from '@/types/pedido'

const lineasMock: ILineaPedido[] = [
  {
    posicion: '10',
    codigoMaterial: 'MAT000005',
    descripcion: 'Martillo Carpintero',
    cantidad: 2,
    unidadMedida: 'UN',
    precioUnitario: 18990,
    subtotal: 37980,
  },
  {
    posicion: '20',
    codigoMaterial: 'MAT000001',
    descripcion: 'Clavo de acero 3"',
    cantidad: 10,
    unidadMedida: 'UN',
    precioUnitario: 2490,
    subtotal: 24900,
  },
]

describe('ArticuloGrid', () => {
  describe('cuando la grilla está vacía', () => {
    it('muestra mensaje de estado vacío', () => {
      renderWithProviders(
        <ArticuloGrid lineas={[]} onCantidadChange={vi.fn()} onEliminarLinea={vi.fn()} />
      )
      expect(screen.getByText(/busque y agregue artículos al pedido/i)).toBeInTheDocument()
    })
  })

  describe('cuando tiene artículos', () => {
    it('muestra todas las líneas de artículos', () => {
      renderWithProviders(
        <ArticuloGrid lineas={lineasMock} onCantidadChange={vi.fn()} onEliminarLinea={vi.fn()} />
      )
      expect(screen.getByText('Martillo Carpintero')).toBeInTheDocument()
      expect(screen.getByText('Clavo de acero 3"')).toBeInTheDocument()
    })

    it('muestra las posiciones 10 y 20', () => {
      renderWithProviders(
        <ArticuloGrid lineas={lineasMock} onCantidadChange={vi.fn()} onEliminarLinea={vi.fn()} />
      )
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
    })

    it('muestra subtotales formateados en CLP', () => {
      renderWithProviders(
        <ArticuloGrid lineas={lineasMock} onCantidadChange={vi.fn()} onEliminarLinea={vi.fn()} />
      )
      expect(screen.getByText('$37.980')).toBeInTheDocument()
      expect(screen.getByText('$24.900')).toBeInTheDocument()
    })

    it('muestra precios unitarios formateados', () => {
      renderWithProviders(
        <ArticuloGrid lineas={lineasMock} onCantidadChange={vi.fn()} onEliminarLinea={vi.fn()} />
      )
      expect(screen.getByText('$18.990')).toBeInTheDocument()
      expect(screen.getByText('$2.490')).toBeInTheDocument()
    })
  })
})
