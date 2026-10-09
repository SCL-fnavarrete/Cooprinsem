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
    onCotizar: vi.fn(),
    isGrabando: false,
    canGrabar: true,
    isCotizando: false,
    canCotizar: false,
  }

  it('muestra los totales formateados en CLP', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} />)
    expect(screen.getByText(/\$100\.000/)).toBeInTheDocument()
    expect(screen.getByText(/\$19\.000/)).toBeInTheDocument()
    expect(screen.getByText(/\$119\.000/)).toBeInTheDocument()
  })

  it('muestra el descuento y el recargo flete de cabecera como líneas de los totales', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} descuentoCabecera={-10000} descuentoPorcentaje={10} recargoFlete={1500} />)
    expect(screen.getByTestId('total-descuento-cabecera')).toHaveTextContent('Descuento (10%): -$10.000')
    expect(screen.getByTestId('total-recargo-flete')).toHaveTextContent('Recargo Flete: $1.500')
  })

  it('no muestra descuento ni recargo flete cuando no hay', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} />)
    expect(screen.queryByTestId('total-descuento-cabecera')).not.toBeInTheDocument()
    expect(screen.queryByTestId('total-recargo-flete')).not.toBeInTheDocument()
  })

  it('agrupa Obs. Nota de Venta y Ubicación Predio como textareas en "Otros Datos" y los montos en "Totales"', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} />)
    const otros = screen.getByTestId('grupo-otros-datos')
    expect(otros).toHaveTextContent('Otros Datos')
    const observaciones = screen.getByLabelText('Observaciones')
    const ubicacion = screen.getByLabelText('Ubicación Predio')
    expect(observaciones.tagName.toLowerCase()).toBe('ui5-textarea')
    expect(ubicacion.tagName.toLowerCase()).toBe('ui5-textarea')
    expect(observaciones).toHaveAttribute('maxlength', '500')
    expect(ubicacion).toHaveAttribute('maxlength', '1000')
    expect(otros).toContainElement(observaciones)
    const totales = screen.getByTestId('grupo-totales')
    expect(totales).toHaveTextContent('Totales')
    expect(totales).toHaveTextContent('Total: $119.000')
  })

  it('muestra los caracteres restantes en español', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} observaciones="Hola" ubicacionPredio="" />)
    expect(screen.getByTestId('restantes-observaciones')).toHaveTextContent('496 caracteres restantes')
    expect(screen.getByTestId('restantes-ubicacion')).toHaveTextContent('1000 caracteres restantes')
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

  it('muestra botón Cotizar deshabilitado cuando canCotizar es false', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} />)
    const btn = screen.getByText('Cotizar').closest('ui5-button')
    expect(btn).toHaveAttribute('disabled')
  })

  it('muestra botón Cotizar habilitado cuando canCotizar es true', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} canCotizar />)
    const btn = screen.getByText('Cotizar').closest('ui5-button')
    expect(btn).not.toHaveAttribute('disabled')
  })

  it('muestra "Cotizando..." durante el proceso', () => {
    renderWithProviders(<PedidoTotals {...defaultProps} isCotizando />)
    expect(screen.getByText(/cotizando/i)).toBeInTheDocument()
  })

  it('muestra el stock por almacén que devuelve SAP y el de otras sucursales', () => {
    const stockMaterial = {
      material: '14700006', plant: 'D190', nombreCentro: 'Osorno', totalCentro: 1183, unidad: 'ST',
      almacenes: [
        { almacen: 'B000', libre: 1000, inspeccion: 0, bloqueado: 0, unidad: 'ST' },
        { almacen: 'CDO', libre: 183, inspeccion: 0, bloqueado: 0, unidad: 'ST' },
      ],
      otrosCentros: [{ centro: 'D150', nombre: 'Valdivia', libre: 340 }],
    }
    renderWithProviders(<PedidoTotals {...defaultProps} stockMaterial={stockMaterial} />)
    expect(screen.getByText('B000')).toBeInTheDocument()
    expect(screen.getByText('CDO')).toBeInTheDocument()
    expect(screen.queryByText('G000')).not.toBeInTheDocument()
    expect(screen.getByText('1.000')).toBeInTheDocument()
    expect(screen.getByText(/Valdivia \(D150\)/)).toBeInTheDocument()
  })

  it('indica cuando el material no tiene stock en la sucursal', () => {
    const stockMaterial = {
      material: '11000074', plant: 'D190', nombreCentro: '', totalCentro: 0, unidad: '',
      almacenes: [], otrosCentros: [],
    }
    renderWithProviders(<PedidoTotals {...defaultProps} stockMaterial={stockMaterial} />)
    expect(screen.getByText(/Sin stock registrado en D190/)).toBeInTheDocument()
  })
})
