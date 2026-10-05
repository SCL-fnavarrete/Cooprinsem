import { describe, it, expect } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { renderWithProviders } from '@/test/helpers'
import { StockPage } from './StockPage'

const BASE = 'http://localhost:3001'

function escribirCentro(valor: string) {
  const input = screen.getByPlaceholderText('Ej: D190') as HTMLInputElement
  input.value = valor
  fireEvent.input(input, { target: { value: valor } })
}

describe('StockPage', () => {
  it('debería pedir al menos un filtro antes de consultar SAP', async () => {
    renderWithProviders(<StockPage />)
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText(/Ingrese al menos un filtro/)).toBeInTheDocument()
  })

  it('debería mostrar el material sin ceros a la izquierda', async () => {
    renderWithProviders(<StockPage />)
    escribirCentro('D190')
    fireEvent.click(screen.getByText('Buscar'))
    expect(await screen.findByText('14700006')).toBeInTheDocument()
    expect(screen.queryByText('000000000014700006')).not.toBeInTheDocument()
  })

  it('debería avisar cuando el resultado viene recortado', async () => {
    server.use(
      http.get(`${BASE}/api/sap-stock`, () => HttpResponse.json({
        success: true, total: 318, truncado: true,
        data: [{ Material: '000000000014700006', Plant: 'D190', StorageLocation: 'B000', MaterialDescription: 'PRUEBA', PlantName: 'Osorno', UnrestrictedStock: '183.000', QualityInspectionStock: '0.000', BlockedStock: '0.000', BaseUnit: 'ST' }],
      }))
    )
    renderWithProviders(<StockPage />)
    escribirCentro('D190')
    fireEvent.click(screen.getByText('Buscar'))
    await waitFor(() => expect(screen.getByText(/Se muestran los primeros 1 de 318 registros/)).toBeInTheDocument())
  })
})
