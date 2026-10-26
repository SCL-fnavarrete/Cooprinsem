import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { renderWithProviders } from '@/test/helpers'
import { BusquedaClienteDialog } from './BusquedaClienteDialog'

// Buscador avanzado con "Búsqueda Local" desmarcada: busca por nombre en SAP en vivo
function renderSapEnVivo() {
  renderWithProviders(<BusquedaClienteDialog open fuente="sap" busquedaLocal={false} onSeleccionar={vi.fn()} onCerrar={vi.fn()} />)
}

function escribirNombre(valor: string) {
  const input = document.querySelector('ui5-input[placeholder*="Razón social"]') as HTMLInputElement
  Object.defineProperty(input, 'value', { value: valor, writable: true, configurable: true })
  fireEvent.input(input, { target: { value: valor } })
}

describe('BusquedaClienteDialog — nombre en SAP en vivo', () => {
  it('debería buscar con comodín en SAP (no en la tabla del POC)', async () => {
    renderSapEnVivo()
    escribirNombre('agricola*verde')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/2 aciertos/)).toBeInTheDocument()
    expect(screen.queryByTestId('aviso-hay-mas-sap')).not.toBeInTheDocument()
  })

  it('debería avisar cuando SAP tiene más clientes que el máximo (20 por defecto)', async () => {
    renderSapEnVivo()
    escribirNombre('agricola')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/20 aciertos/)).toBeInTheDocument()
    expect(screen.getByTestId('aviso-hay-mas-sap')).toHaveTextContent('primeros 20')
  })

  it('debería permitir subir el máximo de resultados', async () => {
    renderSapEnVivo()
    const select = screen.getByTestId('limite-busqueda-sap')
    fireEvent(select, new CustomEvent('change', { detail: { selectedOption: select.querySelector('[data-id="50"]') } }))
    escribirNombre('agricola')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/27 aciertos/)).toBeInTheDocument()
    expect(screen.queryByTestId('aviso-hay-mas-sap')).not.toBeInTheDocument()
  })

  it('si SAP falla debería mostrar el error y no clientes de demostración', async () => {
    server.use(http.get('http://localhost:3001/api/sap-clientes/buscar', () =>
      HttpResponse.json({ success: false, message: 'SAP no responde' }, { status: 500 })))
    renderSapEnVivo()
    escribirNombre('agricola')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/No se pudo buscar en SAP: SAP no responde/)).toBeInTheDocument()
    expect(screen.queryByText(/aciertos/)).not.toBeInTheDocument()
  })

  it('solo "*" en SAP en vivo debería pedir marcar Búsqueda Local', async () => {
    renderSapEnVivo()
    escribirNombre('*')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/marque "Búsqueda Local"/)).toBeInTheDocument()
  })
})
