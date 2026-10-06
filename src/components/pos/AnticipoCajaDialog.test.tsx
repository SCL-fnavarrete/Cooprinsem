import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { AnticipoCajaDialog } from './AnticipoCajaDialog'
import { renderWithProviders } from '@/test/helpers'

describe('AnticipoCajaDialog', () => {
  it('precarga el cliente recibido al abrir', () => {
    renderWithProviders(<AnticipoCajaDialog open clienteInicial="0001000001" onCancelar={vi.fn()} />)
    expect(screen.getByLabelText('Cliente')).toHaveValue('0001000001')
  })

  it('sin cliente inicial, el campo Cliente queda vacío', () => {
    renderWithProviders(<AnticipoCajaDialog open onCancelar={vi.fn()} />)
    expect(screen.getByLabelText('Cliente')).toHaveValue('')
  })
})
