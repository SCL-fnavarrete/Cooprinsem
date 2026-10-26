import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { renderWithProviders } from '@/test/helpers'
import { BusquedaClienteDialog } from './BusquedaClienteDialog'

// Buscador avanzado: solo Sap_cliente de PostgreSQL, grupo BP ZNAC (26-10-2026)
function renderDialogo() {
  renderWithProviders(<BusquedaClienteDialog open onSeleccionar={vi.fn()} onCerrar={vi.fn()} />)
}

function escribirNombre(valor: string) {
  const input = document.querySelector('ui5-input[placeholder*="Razón social"]') as HTMLInputElement
  Object.defineProperty(input, 'value', { value: valor, writable: true, configurable: true })
  fireEvent.input(input, { target: { value: valor } })
}

describe('BusquedaClienteDialog — solo PostgreSQL, grupo ZNAC', () => {
  it('no debería ofrecer opciones de SAP en vivo ni de grupo', () => {
    renderDialogo()
    expect(document.querySelector('ui5-checkbox[text="Búsqueda Local"]')).toBeNull()
    expect(screen.queryByTestId('limite-busqueda-sap')).not.toBeInTheDocument()
    expect(screen.queryByTestId('select-grupo-bp')).not.toBeInTheDocument()
  })

  it('debería listar solo clientes ZNAC, sin consultar SAP', async () => {
    let llamadasSap = 0
    server.use(http.get('http://localhost:3001/api/sap-clientes/buscar', () => { llamadasSap++; return HttpResponse.json({ data: [] }) }))
    renderDialogo()
    escribirNombre('*')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/3 aciertos/)).toBeInTheDocument()
    expect(screen.queryByText('AGRICOLA LAGUNA VERDE SPA')).not.toBeInTheDocument()
    expect(llamadasSap).toBe(0)
  })

  it('debería buscar con comodín respetando el orden', async () => {
    renderDialogo()
    escribirNombre('cutiño*sergio')
    fireEvent.click(screen.getByText('Buscar'))
    // Un único resultado se selecciona directo
    await vi.waitFor(() => expect(screen.queryByText(/No se encontraron clientes/)).not.toBeInTheDocument())
  })
})
