import { describe, it, expect, beforeAll } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { ListPagaresPanel } from './ListPagaresPanel'
import { renderWithProviders } from '@/test/helpers'
import { server } from '@/services/mock/server'

// Polyfill: jsdom no tiene checkVisibility (usado por UI5 Table internamente)
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

const BASE = 'http://localhost:3001'

describe('ListPagaresPanel', () => {
  it('muestra spinner mientras carga', () => {
    renderWithProviders(<ListPagaresPanel />)
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
  })

  it('renderiza la tabla con los pagarés mock', async () => {
    renderWithProviders(<ListPagaresPanel />)

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    // Verificar que aparece al menos el nombre del primer cliente
    expect(screen.getAllByText('Agricola Los Boldos Ltda.').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra el valor del pagaré formateado en CLP', async () => {
    renderWithProviders(<ListPagaresPanel />)

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    // $850.000 aparece en los pagarés del primer cliente
    expect(screen.getAllByText('$850.000').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra mensaje vacío si la API retorna array vacío', async () => {
    server.use(
      http.get(`${BASE}/api/pagares`, () => {
        return HttpResponse.json({ d: { results: [] } })
      })
    )

    renderWithProviders(<ListPagaresPanel />)

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    expect(screen.getByText('No hay pagarés registrados')).toBeInTheDocument()
  })

  it('muestra mensaje de error si la API falla', async () => {
    server.use(
      http.get(`${BASE}/api/pagares`, () => {
        return HttpResponse.json(
          { error: 'Error interno del servidor' },
          { status: 500 }
        )
      })
    )

    renderWithProviders(<ListPagaresPanel />)

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Error interno del servidor')).toBeInTheDocument()
  })

  it('botón "Actualizar" recarga los datos', async () => {
    const user = userEvent.setup()

    // Primera carga: vacío
    server.use(
      http.get(`${BASE}/api/pagares`, () => {
        return HttpResponse.json({ d: { results: [] } })
      })
    )

    renderWithProviders(<ListPagaresPanel />)

    await waitFor(() => {
      expect(screen.getByText('No hay pagarés registrados')).toBeInTheDocument()
    })

    // Restaurar handler original (con datos)
    server.resetHandlers()

    // Clic en Actualizar
    const actualizarBtn = screen.getByText('Actualizar').closest('ui5-button') as HTMLElement
    await user.click(actualizarBtn)

    await waitFor(() => {
      expect(screen.getAllByText('Agricola Los Boldos Ltda.').length).toBeGreaterThanOrEqual(1)
    })
  })
})
