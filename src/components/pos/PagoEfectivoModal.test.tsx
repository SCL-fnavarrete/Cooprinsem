import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PagoEfectivoModal } from './PagoEfectivoModal'
import { crearClienteMock } from '@/test/factories'
import { renderWithProviders } from '@/test/helpers'

const defaultProps = {
  open: true,
  totalACobrar: 150000,
  cliente: crearClienteMock(),
  documentosSeleccionados: ['1900000001'],
  onConfirmar: vi.fn(),
  onCancelar: vi.fn(),
  isCobrando: false,
}

// Helper: simula input de monto en UI5 Input (jsdom no soporta type="Number" bien)
function setMonto(input: HTMLElement, value: string) {
  fireEvent.input(input, { target: { value } })
}

describe('PagoEfectivoModal', () => {
  describe('cuando está abierto', () => {
    it('muestra el total a cobrar', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      expect(screen.getByTestId('total-a-cobrar')).toHaveTextContent('$150.000')
    })

    it('muestra el nombre del cliente', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      expect(screen.getByText(/Agricola Los Boldos/)).toBeInTheDocument()
    })

    it('muestra cantidad de documentos a cancelar', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      expect(screen.getByText(/Documentos a cancelar: 1/)).toBeInTheDocument()
    })
  })

  describe('cálculo de vuelto', () => {
    it('muestra vuelto $0 inicialmente', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      expect(screen.getByTestId('vuelto')).toHaveTextContent('$0')
    })

    it('calcula vuelto positivo cuando recibe más del total', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      const input = screen.getByLabelText(/monto recibido/i)
      setMonto(input, '200000')
      expect(screen.getByTestId('vuelto')).toHaveTextContent('$50.000')
    })

    it('muestra vuelto cero cuando el monto es exacto', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      const input = screen.getByLabelText(/monto recibido/i)
      setMonto(input, '150000')
      expect(screen.getByTestId('vuelto')).toHaveTextContent('$0')
    })

    it('muestra warning cuando monto es insuficiente', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      const input = screen.getByLabelText(/monto recibido/i)
      setMonto(input, '100000')
      expect(screen.getByText(/insuficiente/i)).toBeInTheDocument()
      expect(screen.getByText(/\$50\.000/)).toBeInTheDocument()
    })
  })

  describe('validaciones', () => {
    it('deshabilita Confirmar Cobro si monto es insuficiente', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      const input = screen.getByLabelText(/monto recibido/i)
      setMonto(input, '100000')
      expect(screen.getByText('Confirmar Cobro').closest('ui5-button')).toHaveAttribute('disabled')
    })

    it('habilita Confirmar Cobro con monto suficiente', () => {
      renderWithProviders(<PagoEfectivoModal {...defaultProps} />)
      const input = screen.getByLabelText(/monto recibido/i)
      setMonto(input, '150000')
      expect(screen.getByText('Confirmar Cobro').closest('ui5-button')).not.toHaveAttribute('disabled')
    })
  })

  describe('acciones', () => {
    it('llama a onConfirmar con el monto recibido', async () => {
      const onConfirmar = vi.fn()
      renderWithProviders(
        <PagoEfectivoModal {...defaultProps} onConfirmar={onConfirmar} />
      )
      const input = screen.getByLabelText(/monto recibido/i)
      setMonto(input, '200000')
      await userEvent.click(screen.getByText('Confirmar Cobro'))
      expect(onConfirmar).toHaveBeenCalledWith(200000)
    })

    it('llama a onCancelar al presionar Cancelar', async () => {
      const onCancelar = vi.fn()
      renderWithProviders(
        <PagoEfectivoModal {...defaultProps} onCancelar={onCancelar} />
      )
      await userEvent.click(screen.getByText('Cancelar'))
      expect(onCancelar).toHaveBeenCalledTimes(1)
    })

    it('muestra Procesando... cuando isCobrando es true', () => {
      renderWithProviders(
        <PagoEfectivoModal {...defaultProps} isCobrando />
      )
      expect(screen.getByText('Procesando...')).toBeInTheDocument()
    })
  })
})
