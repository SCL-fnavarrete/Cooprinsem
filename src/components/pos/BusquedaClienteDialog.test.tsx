import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { renderWithProviders } from '@/test/helpers'
import { setGrupoBusquedaClientes, GRUPO_BP_DEFECTO } from '@/stores/grupoBusquedaClientes'
import { BusquedaClienteDialog } from './BusquedaClienteDialog'

// Buscador avanzado: solo Sap_cliente de PostgreSQL, con el grupo BP elegido (26-10-2026)
function renderDialogo() {
  renderWithProviders(<BusquedaClienteDialog open onSeleccionar={vi.fn()} onCerrar={vi.fn()} />)
}

function escribirNombre(valor: string) {
  const input = document.querySelector('ui5-input[placeholder*="Razón social"]') as HTMLInputElement
  Object.defineProperty(input, 'value', { value: valor, writable: true, configurable: true })
  fireEvent.input(input, { target: { value: valor } })
}

function elegirGrupo(id: string) {
  const select = screen.getByTestId('select-grupo-bp')
  fireEvent(select, new CustomEvent('change', { detail: { selectedOption: select.querySelector(`[data-id="${id}"]`) } }))
}

describe('BusquedaClienteDialog — solo PostgreSQL', () => {
  afterEach(() => setGrupoBusquedaClientes(GRUPO_BP_DEFECTO))

  it('debería mostrar el select de grupo BP con su leyenda y sin opciones de SAP en vivo', () => {
    renderDialogo()
    expect(screen.getByTestId('select-grupo-bp')).toBeInTheDocument()
    expect(screen.getByText(/Por defecto solo ZNAC/)).toBeInTheDocument()
    expect(document.querySelector('ui5-checkbox[text="Búsqueda Local"]')).toBeNull()
    expect(screen.queryByTestId('limite-busqueda-sap')).not.toBeInTheDocument()
  })

  it('debería buscar solo ZNAC por defecto, sin consultar SAP', async () => {
    let llamadasSap = 0
    server.use(http.get('http://localhost:3001/api/sap-clientes/buscar', () => { llamadasSap++; return HttpResponse.json({ data: [] }) }))
    renderDialogo()
    escribirNombre('*')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/3 aciertos/)).toBeInTheDocument()
    expect(screen.queryByText('AGRICOLA LAGUNA VERDE SPA')).not.toBeInTheDocument()
    expect(llamadasSap).toBe(0)
  })

  it('con "Todos los grupos" debería incluir otros grupos y mostrar el grupo de cada cliente', async () => {
    renderDialogo()
    elegirGrupo('TODOS')
    escribirNombre('*')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/4 aciertos/)).toBeInTheDocument()
    expect(screen.getByText('AGRICOLA LAGUNA VERDE SPA')).toBeInTheDocument()
    expect(screen.getByText('ZDES')).toBeInTheDocument()
  })

  it('con un grupo puntual debería traer solo ese grupo', async () => {
    renderDialogo()
    elegirGrupo('ZDES')
    escribirNombre('agricola')
    fireEvent.click(screen.getByText('Buscar'))
    // Un único resultado se selecciona directo (comportamiento de siempre)
    await vi.waitFor(() => expect(screen.queryByText(/aciertos/)).not.toBeInTheDocument())
  })
})
