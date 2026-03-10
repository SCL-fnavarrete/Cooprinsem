import { describe, it, expect, beforeAll } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { UserProvider } from '@/stores/userContext'
import { PedidoDetallePage } from './PedidoDetallePage'
import type { IUsuario } from '@/types/common'

const USUARIO_TEST: IUsuario = {
  id: 'vendedor',
  nombre: 'Vendedor Test',
  rolCod: 2,
  sucursal: 'D190',
}

// Polyfill: jsdom no tiene checkVisibility
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

function renderDetalle(vbeln: string) {
  return render(
    <MemoryRouter initialEntries={[`/pedidos/${vbeln}`]}>
      <ThemeProvider>
        <UserProvider initialUser={USUARIO_TEST}>
          <Routes>
            <Route path="/pedidos/:vbeln" element={<PedidoDetallePage />} />
            <Route path="/pedidos" element={<div>Listado Pedidos</div>} />
          </Routes>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('PedidoDetallePage', () => {
  it('muestra datos del pedido con vbeln válido', async () => {
    renderDetalle('0080000001')

    await waitFor(() => {
      expect(screen.getByText('0080000001')).toBeInTheDocument()
    })

    // Datos del cliente
    expect(screen.getByText(/Agricola Los Boldos Ltda./)).toBeInTheDocument()
    // Canal y tipo doc
    expect(screen.getByText('Venta Mesón')).toBeInTheDocument()
    expect(screen.getByText('Venta Normal')).toBeInTheDocument()
    // Estado
    expect(screen.getByText('Creado')).toBeInTheDocument()
  })

  it('muestra las líneas del pedido', async () => {
    renderDetalle('0080000001')

    await waitFor(() => {
      expect(screen.getByText('Martillo carpintero 25oz mango fibra')).toBeInTheDocument()
    })

    expect(screen.getByText('Fertilizante NPK 15-15-15 saco 50kg')).toBeInTheDocument()
    expect(screen.getByText('Clavo de acero 3" caja 1kg')).toBeInTheDocument()
  })

  it('muestra totales formateados en CLP', async () => {
    renderDetalle('0080000001')

    // Subtotal de las 3 líneas: 37980 + 128000 + 12450 = 178430
    // IVA 19%: 33902
    // Total: 212332
    await waitFor(() => {
      expect(screen.getByText('$178.430')).toBeInTheDocument()
    })
    expect(screen.getByText('$33.902')).toBeInTheDocument()
    expect(screen.getByText('$212.332')).toBeInTheDocument()
  })

  it('muestra error si vbeln no existe', async () => {
    renderDetalle('9999999999')

    await waitFor(() => {
      expect(screen.getByText(/no encontrado/)).toBeInTheDocument()
    })
  })

  it('botón Volver navega a /pedidos', async () => {
    const user = userEvent.setup()
    renderDetalle('0080000001')

    await waitFor(() => {
      expect(screen.getByText('0080000001')).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText('Volver'))

    await waitFor(() => {
      expect(screen.getByText('Listado Pedidos')).toBeInTheDocument()
    })
  })

  it('muestra error cuando el servicio falla', async () => {
    server.use(
      http.get('http://localhost:3001/api/pedidos/:vbeln', () => {
        return HttpResponse.json({ error: 'Error interno' }, { status: 500 })
      })
    )

    renderDetalle('0080000001')

    await waitFor(() => {
      expect(screen.getByText(/Error interno/)).toBeInTheDocument()
    })
  })
})
