import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { JsonCopiable } from './JsonCopiable'

describe('JsonCopiable', () => {
  it('debería mostrar el JSON formateado y copiarlo al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderWithProviders(<JsonCopiable titulo="JSON enviado a SAP" valor={{ GlAccount: '1010401000' }} />)
    expect(screen.getByText(/"GlAccount": "1010401000"/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('json-copiable-copiar'))
    await waitFor(() => expect(screen.getByTestId('json-copiable-estado')).toHaveTextContent('Copiado'))
    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ GlAccount: '1010401000' }, null, 2))
  })

  it('debería avisar si no se puede copiar', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) } })
    renderWithProviders(<JsonCopiable titulo="Respuesta de SAP" valor={undefined} />)
    expect(screen.getByText('(sin datos)')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('json-copiable-copiar'))
    await waitFor(() => expect(screen.getByTestId('json-copiable-estado')).toHaveTextContent('No se pudo copiar'))
  })
})
