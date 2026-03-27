import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
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
})
