import { describe, it, expect, vi, beforeAll } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CajaFacturaList } from './CajaFacturaList'
import { crearFacturaPendienteMock, crearFacturaVencidaMock } from '@/test/factories'
import { renderWithProviders } from '@/test/helpers'

// Polyfill: jsdom no tiene checkVisibility (usado por UI5 Table internamente)
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

describe('CajaFacturaList', () => {
  describe('cuando no hay partidas', () => {
    it('muestra mensaje de estado vacío', () => {
      renderWithProviders(
        <CajaFacturaList
          partidas={[]}
          partidasSeleccionadas={[]}
          onTogglePartida={vi.fn()}
        />
      )
      expect(screen.getByText(/no hay documentos pendientes/i)).toBeInTheDocument()
    })
  })

  describe('cuando está cargando', () => {
    it('muestra mensaje de carga', () => {
      renderWithProviders(
        <CajaFacturaList
          partidas={[]}
          partidasSeleccionadas={[]}
          onTogglePartida={vi.fn()}
          isLoading
        />
      )
      expect(screen.getByText(/cargando partidas/i)).toBeInTheDocument()
    })
  })

  describe('cuando tiene partidas', () => {
    const partidas = [
      crearFacturaPendienteMock({
        belnr: '1900000001',
        kunnr: '0001000001',
        importe: 850000,
        semaforo: 'verde',
      }),
      crearFacturaVencidaMock(15),
    ]

    it('muestra todas las partidas', () => {
      renderWithProviders(
        <CajaFacturaList
          partidas={partidas}
          partidasSeleccionadas={[]}
          onTogglePartida={vi.fn()}
        />
      )
      expect(screen.getByText('1900000001')).toBeInTheDocument()
    })

    it('muestra semáforo verde para partidas vigentes', () => {
      renderWithProviders(
        <CajaFacturaList
          partidas={partidas}
          partidasSeleccionadas={[]}
          onTogglePartida={vi.fn()}
        />
      )
      expect(screen.getByLabelText('Vigente')).toBeInTheDocument()
    })

    it('muestra semáforo rojo para partidas vencidas', () => {
      renderWithProviders(
        <CajaFacturaList
          partidas={partidas}
          partidasSeleccionadas={[]}
          onTogglePartida={vi.fn()}
        />
      )
      expect(screen.getByLabelText('Vencida')).toBeInTheDocument()
    })

    it('llama a onTogglePartida al hacer click en una fila', async () => {
      const onToggle = vi.fn()
      renderWithProviders(
        <CajaFacturaList
          partidas={partidas}
          partidasSeleccionadas={[]}
          onTogglePartida={onToggle}
        />
      )
      await userEvent.click(screen.getByTestId('partida-row-1900000001'))
      expect(onToggle).toHaveBeenCalledWith('1900000001')
    })

    it('muestra el total seleccionado cuando hay partidas marcadas', () => {
      renderWithProviders(
        <CajaFacturaList
          partidas={partidas}
          partidasSeleccionadas={['1900000001']}
          onTogglePartida={vi.fn()}
        />
      )
      expect(screen.getByText('1 documento(s) seleccionado(s)')).toBeInTheDocument()
      expect(screen.getByText('$850.000')).toBeInTheDocument()
    })

    it('muestra la leyenda de estados del semáforo', () => {
      renderWithProviders(
        <CajaFacturaList
          partidas={partidas}
          partidasSeleccionadas={[]}
          onTogglePartida={vi.fn()}
        />
      )
      const leyenda = screen.getByTestId('leyenda-semaforo')
      expect(leyenda).toBeInTheDocument()
      expect(screen.getByText('Vigente')).toBeInTheDocument()
      expect(screen.getByText(/por vencer/i)).toBeInTheDocument()
      expect(screen.getByText('Vencida')).toBeInTheDocument()
    })

    it('muestra importes formateados en CLP', () => {
      renderWithProviders(
        <CajaFacturaList
          partidas={partidas}
          partidasSeleccionadas={[]}
          onTogglePartida={vi.fn()}
        />
      )
      expect(screen.getByText('$850.000')).toBeInTheDocument()
    })
  })
})
