import { describe, it, expect, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
import { screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ClientesPanel } from './ClientesPanel'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

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

    it('debería ocultar el Giro cuando el tipo de socio es Persona', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProviders(<ClientesPanel />)
      await user.click(screen.getByText('Crear'))

      const selectTipo = container.querySelector('ui5-select') as HTMLElement
      act(() => {
        selectTipo.dispatchEvent(new CustomEvent('change', { detail: { selectedOption: { value: '1' } } }))
      })
      expect(screen.queryByText('* Giro:')).not.toBeInTheDocument()

      act(() => {
        selectTipo.dispatchEvent(new CustomEvent('change', { detail: { selectedOption: { value: '2' } } }))
      })
      expect(screen.getByText('* Giro:')).toBeInTheDocument()
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

  describe('teclado en las sugerencias (27-10-2026)', () => {
    async function escribir(valor: string) {
      renderWithProviders(<ClientesPanel />)
      const input = document.querySelector('ui5-input[placeholder*="comodín"]') as HTMLInputElement
      Object.defineProperty(input, 'value', { value: valor, writable: true, configurable: true })
      fireEvent.input(input, { target: { value: valor } })
      await screen.findByTestId('sugerencias-buscar', {}, { timeout: 3000 })
      return input
    }
    const marcadas = () => screen.getAllByRole('option').map((o) => o.getAttribute('aria-selected'))

    it('↓/↑ deberían marcar los clientes y Enter elegir el marcado', async () => {
      const input = await escribir('cutiño')
      expect(marcadas()).toEqual(['false', 'false'])
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      expect(marcadas()).toEqual(['false', 'true'])
      fireEvent.keyDown(input, { key: 'ArrowDown' }) // no pasa del último
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      expect(marcadas()).toEqual(['true', 'false'])
      const elegido = screen.getAllByRole('option')[0].textContent ?? ''
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(screen.queryByTestId('sugerencias-buscar')).not.toBeInTheDocument()
      // Queda el cliente elegido (sus datos generales)
      expect(screen.getAllByText(elegido.split(' — ')[1].split(/\d/)[0].trim()).length).toBeGreaterThan(0)
    })

    it('Esc debería cerrar la lista sin elegir', async () => {
      const input = await escribir('cutiño')
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(screen.queryByTestId('sugerencias-buscar')).not.toBeInTheDocument()
      expect(screen.queryByText('Datos generales')).not.toBeInTheDocument()
    })
  })

  describe('Crear Pedido e interlocutores reales (29-10-2026)', () => {
    function buscar(valor: string) {
      const input = document.querySelector('ui5-input[placeholder*="comodín"]') as HTMLInputElement
      Object.defineProperty(input, 'value', { value: valor, writable: true, configurable: true })
      fireEvent.input(input, { target: { value: valor } })
    }

    it('Buscar: "Crear Pedido" debería llevar el cliente y solo el destinatario elegido con clic', async () => {
      mockNavigate.mockClear()
      renderWithProviders(<ClientesPanel />, { user: { id: 'venta', nombre: 'Venta', rolCod: 2, sucursal: 'D190' } })
      buscar('10000003')
      fireEvent.click(screen.getByText('Buscar cliente'))
      const fila = await screen.findByTestId('destinatario-80000344', {}, { timeout: 3000 })

      fireEvent.click(screen.getByTestId('crear-pedido-buscar'))
      expect(mockNavigate).toHaveBeenLastCalledWith('/pedidos/nuevo?cliente=10000003')

      fireEvent.click(fila)
      fireEvent.click(screen.getByTestId('crear-pedido-buscar'))
      expect(mockNavigate).toHaveBeenLastCalledWith('/pedidos/nuevo?cliente=10000003&destinatario=80000344')
    })

    it('Ficha: debería mostrar los interlocutores reales y "Crear Pedido"', async () => {
      mockNavigate.mockClear()
      server.use(http.get('http://localhost:3001/api/sap-clientes/ficha/:bp', () =>
        HttpResponse.json({ data: { BusinessPartner: '10000003', BusinessPartnerFullName: 'Sergio Cutiño', to_Customer: {} } })))
      const user = userEvent.setup()
      renderWithProviders(<ClientesPanel />, { user: { id: 'venta', nombre: 'Venta', rolCod: 2, sucursal: 'D190' } })
      await user.click(screen.getByText('Ficha'))
      const input = screen.getByLabelText('Cliente de la ficha') as HTMLInputElement
      Object.defineProperty(input, 'value', { value: '10000003', writable: true, configurable: true })
      fireEvent.input(input, { target: { value: '10000003' } })
      fireEvent.click(screen.getByText('Ver Ficha'))

      expect(await screen.findByTestId('interlocutor-ZB-90001429', {}, { timeout: 3000 })).toHaveTextContent('Persona retira (dest. 80000344)')
      expect(screen.getByTestId('interlocutor-SH-80000344')).toHaveTextContent('WERNER SCHEEL OTTO')
      expect(screen.getByTestId('interlocutor-SP-10000003')).toHaveTextContent('Solicitante')
      expect(screen.getAllByText('Pendiente: fuente de datos por definir con SAP.')).toHaveLength(2)

      fireEvent.click(screen.getByTestId('crear-pedido-ficha'))
      expect(mockNavigate).toHaveBeenLastCalledWith('/pedidos/nuevo?cliente=10000003')
    })

    it('el rol Consultas no debería ver "Crear Pedido"', async () => {
      renderWithProviders(<ClientesPanel />, { user: { id: 'consulta', nombre: 'Consulta', rolCod: 4, sucursal: 'D190' } })
      buscar('10000003')
      fireEvent.click(screen.getByText('Buscar cliente'))
      await screen.findByTestId('destinatario-80000344', {}, { timeout: 3000 })
      expect(screen.queryByTestId('crear-pedido-buscar')).not.toBeInTheDocument()
    })
  })
})
