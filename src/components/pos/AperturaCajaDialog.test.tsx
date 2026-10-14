import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { AperturaCajaDialog } from './AperturaCajaDialog'

const PROPS = {
  open: true,
  usuario: 'cajero.test',
  sociedad: 'COOP',
  nombreSociedad: 'COOPRINSEM LTDA.',
  sucursal: 'D190',
  nombreSucursal: 'Osorno',
  montoSugerido: 200000,
  onAceptar: vi.fn(),
  onCancelar: vi.fn(),
  isGrabando: false,
  error: null,
}

describe('AperturaCajaDialog', () => {
  it('debería mostrar el aviso de pendientes con lo hardcodeado y el centro de beneficio quitado', () => {
    renderWithProviders(<AperturaCajaDialog {...PROPS} />)
    const aviso = screen.getByTestId('pendientes-apertura-caja')
    expect(aviso).toHaveTextContent('Pendientes — Apertura de Caja')
    expect(aviso).toHaveTextContent(/Centro de beneficio \(ProfitCtr\): QUITADO/)
    expect(aviso).toHaveTextContent(/1010504000/)
    expect(aviso).toHaveTextContent(/monto_apertura/)
  })
})
