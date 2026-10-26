import { describe, it, expect } from 'vitest'
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

  describe('Buscar cliente sin "Búsqueda Local" (SAP en vivo)', () => {
    it('debería buscar el nombre con comodín en SAP y listar las coincidencias', async () => {
      renderWithProviders(<ClientesPanel />)
      const casilla = document.querySelector('ui5-checkbox[text="Búsqueda Local"]') as HTMLElement & { checked: boolean }
      casilla.checked = false
      fireEvent(casilla, new Event('change'))
      const input = document.querySelector('ui5-input[placeholder*="comodín"]') as HTMLInputElement
      Object.defineProperty(input, 'value', { value: 'agricola*verde', writable: true, configurable: true })
      fireEvent.input(input, { target: { value: 'agricola*verde' } })
      fireEvent.click(screen.getByText('Buscar cliente'))
      expect(await screen.findByText('10033153 — AGRICOLA CAMPO VERDE LTDA.', {}, { timeout: 3000 })).toBeInTheDocument()
      expect(screen.getByText('80033732 — AGRICOLA CAMPO VERDE LTDA.')).toBeInTheDocument()
    })
  })
})

