import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
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

  describe('teclado, cantidad decimal y fecha de entrega (27-10-2026)', () => {
    const lineas: ILineaPedido[] = lineasMock.map((l) => ({
      ...l, centroSuministrador: '', almacen: '', recargo: 0, descuentoLinea: 0, fechaEntrega: '',
    }))
    const cantidad = (desc: string) => screen.getByLabelText(`Cantidad ${desc}`) as HTMLElement & { value: string }

    function renderGrid(props: Partial<Parameters<typeof ArticuloGrid>[0]> = {}) {
      const handlers = { onCantidadChange: vi.fn(), onLineaChange: vi.fn(), onEliminarLinea: vi.fn(), onVolverAlBuscador: vi.fn() }
      renderWithProviders(<ArticuloGrid lineas={lineas} {...handlers} onSeries={vi.fn()} {...props} />)
      return handlers
    }

    it('Enter en un campo de la línea debería volver al buscador de artículos', () => {
      const h = renderGrid()
      fireEvent.keyDown(cantidad('Martillo Carpintero'), { key: 'Enter' })
      fireEvent.keyDown(screen.getAllByLabelText('Almacén')[1], { key: 'Enter' })
      expect(h.onVolverAlBuscador).toHaveBeenCalledTimes(2)
    })

    it('↓ y ↑ deberían mover al mismo campo de la otra línea', () => {
      renderGrid()
      const focos: string[] = []
      for (const el of [cantidad('Martillo Carpintero'), cantidad('Clavo de acero 3"')]) {
        el.focus = () => { focos.push(el.getAttribute('aria-label') ?? '') }
      }
      fireEvent.keyDown(cantidad('Martillo Carpintero'), { key: 'ArrowDown' })
      fireEvent.keyDown(cantidad('Clavo de acero 3"'), { key: 'ArrowUp' })
      expect(focos).toEqual(['Cantidad Clavo de acero 3"', 'Cantidad Martillo Carpintero'])
    })

    it('Tab debería pasar al siguiente campo editable', () => {
      renderGrid()
      const centro = screen.getAllByLabelText('Centro suministrador')[0]
      const foco = vi.fn()
      centro.focus = foco
      fireEvent.keyDown(cantidad('Martillo Carpintero'), { key: 'Tab' })
      expect(foco).toHaveBeenCalled()
    })

    it('debería aceptar cantidad con coma y hasta 2 decimales', () => {
      const h = renderGrid()
      const input = cantidad('Martillo Carpintero')
      input.value = '1,567'
      fireEvent.input(input)
      expect(input.value).toBe('1,56')
      expect(h.onCantidadChange).toHaveBeenLastCalledWith('10', 1.56)
    })

    it('debería aceptar el punto como separador decimal y mostrarlo con coma', () => {
      const h = renderGrid()
      const input = cantidad('Martillo Carpintero')
      input.value = '0.5'
      fireEvent.input(input)
      expect(input.value).toBe('0,5')
      expect(h.onCantidadChange).toHaveBeenLastCalledWith('10', 0.5)
    })

    it('con series asignadas no debería aceptar decimales', () => {
      const conSeries = [{ ...lineas[0], series: [{ numeroSerie: '2008', lote: '', centro: 'D190', almacen: '' }] }]
      const h = renderGrid({ lineas: conSeries as ILineaPedido[] })
      const input = cantidad('Martillo Carpintero')
      input.value = '1,5'
      fireEvent.input(input)
      expect(input.value).toBe('1')
      expect(h.onCantidadChange).toHaveBeenLastCalledWith('10', 1)
    })

    it('con cantidad decimal el botón Series debería quedar deshabilitado', () => {
      renderGrid({ lineas: [{ ...lineas[0], cantidad: 1.5 }] })
      expect(screen.getByLabelText('Series Martillo Carpintero')).toHaveAttribute('disabled')
      expect(cantidad('Martillo Carpintero').value).toBe('1,5')
    })

    it('debería marcar una fecha de entrega pasada', () => {
      renderGrid({ lineas: [{ ...lineas[0], fechaEntrega: '01-01-2020' }] })
      expect(screen.getByTestId('fecha-entrega-10')).toHaveAttribute('value-state', 'Negative')
    })

    it('debería mostrar el precio unitario con 2 decimales', () => {
      renderGrid({ lineas: [{ ...lineas[0], precioUnitario: 5454, cantidad: 1.5, subtotal: 8181 }] })
      expect(screen.getByText('$5.454')).toBeInTheDocument()
      expect(screen.getByText('$8.181')).toBeInTheDocument()
    })
  })
})

// Texto de la unidad desde el maestro sap_unidad_medida (30-10-2026)
describe('ArticuloGrid — unidad de medida', () => {
  it('debería mostrar el texto corto con el texto largo y el código en el tooltip', async () => {
    const lineas = [{ ...lineasMock[0], unidadMedida: 'ST' }, { ...lineasMock[1], unidadMedida: 'TON' }, { ...lineasMock[1], posicion: '30', unidadMedida: 'XX' }]
    renderWithProviders(<ArticuloGrid lineas={lineas} onCantidadChange={vi.fn()} onEliminarLinea={vi.fn()} />)
    await waitFor(() => expect(screen.getByTestId('unidad-10')).toHaveTextContent('Unidad'))
    expect(screen.getByTestId('unidad-10')).toHaveAttribute('title', 'Unidad (ST)')
    expect(screen.getByTestId('unidad-20')).toHaveTextContent('Tonelada')
    // Código sin dato en el maestro: se muestra tal cual
    expect(screen.getByTestId('unidad-30')).toHaveTextContent('XX')
  })
})
