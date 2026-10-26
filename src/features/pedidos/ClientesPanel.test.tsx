import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ClientesPanel } from './ClientesPanel'

// Polyfill checkVisibility para jsdom
if (!Element.prototype.checkVisibility) {
  Element.prototype.checkVisibility = () => true
}

describe('ClientesPanel', () => {
  describe('sub-tabs', () => {
    it('muestra 3 sub-tabs: Buscar, Crear, Ficha', () => {
      renderWithProviders(<ClientesPanel />)

      expect(screen.getByText('Buscar')).toBeInTheDocument()
      expect(screen.getByText('Crear')).toBeInTheDocument()
      expect(screen.getByText('Ficha')).toBeInTheDocument()
    })

    it('muestra Buscar como sub-tab activo por defecto', () => {
      renderWithProviders(<ClientesPanel />)

      expect(screen.getByText('Buscar cliente')).toBeInTheDocument()
    })
  })

  describe('sub-tab Crear', () => {
    it('muestra formulario de creación al hacer clic en Crear', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientesPanel />)

      await user.click(screen.getByText('Crear'))

      expect(screen.getByText('Creación de clientes')).toBeInTheDocument()
      expect(screen.getByText('* Tratamiento:')).toBeInTheDocument()
      expect(screen.getByText('* Rut:')).toBeInTheDocument()
      expect(screen.getByText('* Nombre 1:')).toBeInTheDocument()
      expect(screen.getByText('* Giro:')).toBeInTheDocument()
      expect(screen.getByText('* Dirección:')).toBeInTheDocument()
      expect(screen.getByText('* Región:')).toBeInTheDocument()
    })

    it('muestra botones Guardar y Cancelar', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientesPanel />)

      await user.click(screen.getByText('Crear'))

      expect(screen.getByText('Guardar')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })
  })

  describe('sub-tab Ficha', () => {
    it('muestra campo Cliente y botón Ver Ficha al hacer clic en Ficha', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientesPanel />)

      await user.click(screen.getByText('Ficha'))

      expect(screen.getByText('Ver Ficha')).toBeInTheDocument()
      expect(screen.getByText('Grupo control crédito')).toBeInTheDocument()
    })
  })

  describe('buscador con comodín', () => {
    function escribirBusqueda(valor: string) {
      const input = document.querySelector('ui5-input[placeholder*="comodín"]') as HTMLInputElement
      Object.defineProperty(input, 'value', { value: valor, writable: true, configurable: true })
      fireEvent.input(input, { target: { value: valor } })
    }

    it('debería sugerir clientes con "*" entre medio respetando el orden', async () => {
      renderWithProviders(<ClientesPanel />)
      escribirBusqueda('agri*limit')
      expect(await screen.findByText(/AGRICOLA G\.M\. LIMITADA/, {}, { timeout: 3000 })).toBeInTheDocument()
    })

    it('no debería buscar con menos de 3 caracteres sin contar los "*"', async () => {
      renderWithProviders(<ClientesPanel />)
      escribirBusqueda('a**g')
      await new Promise((r) => setTimeout(r, 600))
      expect(screen.queryByText(/AGRICOLA G\.M\. LIMITADA/)).not.toBeInTheDocument()
    })
  })

  describe('Buscar cliente: solo PostgreSQL (Sap_cliente), grupo ZNAC', () => {
    function buscar(valor: string) {
      const input = document.querySelector('ui5-input[placeholder*="comodín"]') as HTMLInputElement
      Object.defineProperty(input, 'value', { value: valor, writable: true, configurable: true })
      fireEvent.input(input, { target: { value: valor } })
      fireEvent.click(screen.getByText('Buscar cliente'))
    }

    it('no debería ofrecer la casilla "Búsqueda Local" ni consultar SAP en vivo', async () => {
      let llamadasSap = 0
      server.use(http.get('http://localhost:3001/api/sap-clientes/buscar', () => { llamadasSap++; return HttpResponse.json({ data: [] }) }))
      renderWithProviders(<ClientesPanel />)
      expect(document.querySelector('ui5-checkbox[text="Búsqueda Local"]')).toBeNull()
      buscar('agricola*verde')
      expect(await screen.findByText(/Cliente agricola\*verde no encontrado/, {}, { timeout: 3000 })).toBeInTheDocument()
      expect(llamadasSap).toBe(0)
    })
  })

  describe('Buscar cliente: destinatarios y personas que retiran reales', () => {
    it('debería listar los destinatarios y cambiar Persona retira al hacer clic, sin volver a consultar', async () => {
      let consultas = 0
      server.events.on('request:start', ({ request }) => {
        if (request.url.includes('/interlocutores/arbol')) consultas++
      })
      renderWithProviders(<ClientesPanel />)
      const input = document.querySelector('ui5-input[placeholder*="comodín"]') as HTMLInputElement
      Object.defineProperty(input, 'value', { value: '10000003', writable: true, configurable: true })
      fireEvent.input(input, { target: { value: '10000003' } })
      fireEvent.click(screen.getByText('Buscar cliente'))

      // El primero (el propio cliente) queda elegido y no tiene personas que retiran
      const fila = await screen.findByTestId('destinatario-80000344', {}, { timeout: 3000 })
      expect(screen.getByTestId('destinatario-10000003')).toHaveAttribute('data-elegido', 'si')
      expect(screen.getByText('Sin personas que retiran para este destinatario.')).toBeInTheDocument()

      fireEvent.click(fila)
      expect(screen.getByTestId('destinatario-80000344')).toHaveAttribute('data-elegido', 'si')
      expect(screen.getByText('BASTIAS BILBAO CARLOS')).toBeInTheDocument()
      expect(screen.getByText('WELLMANN WERNER MARTIN')).toBeInTheDocument()
      expect(consultas).toBe(1)
      server.events.removeAllListeners()
    })
  })
})
