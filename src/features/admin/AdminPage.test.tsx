import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import { UserProvider } from '@/stores/userContext'
import { AdminPage } from './AdminPage'
import type { IUsuario } from '@/types/common'

// Polyfill: jsdom no tiene checkVisibility (usado por UI5 Table internamente)
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

// Helper para renderizar con rol admin (rol 1)
const ADMIN_USER: IUsuario = {
  id: 'admin.test',
  nombre: 'Admin Test',
  rolCod: 1,
  sucursal: 'D190',
}

function renderAsAdmin(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <ThemeProvider>
          <UserProvider initialUser={ADMIN_USER}>
            {children}
          </UserProvider>
        </ThemeProvider>
      </BrowserRouter>
    ),
  })
}

describe('AdminPage', () => {
  describe('acceso por rol', () => {
    it('usuario rol 1 (admin) ve la página de administración', async () => {
      renderAsAdmin(<AdminPage />)

      expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument()
      expect(screen.getByText('Usuarios')).toBeInTheDocument()
      expect(screen.getByText('Roles')).toBeInTheDocument()
      expect(screen.getByText('Sucursales')).toBeInTheDocument()
    })
  })

  describe('tab Usuarios', () => {
    it('carga y muestra los 6 usuarios mock', async () => {
      renderAsAdmin(<AdminPage />)

      await waitFor(() => {
        expect(screen.getByText('Admin Sistema')).toBeInTheDocument()
      })

      expect(screen.getByText('Juan Vendedor López')).toBeInTheDocument()
      expect(screen.getByText('María Cajero Soto')).toBeInTheDocument()
      expect(screen.getByText('Pedro Consultas Muñoz')).toBeInTheDocument()
      expect(screen.getByText('Ana Vendedor Ríos')).toBeInTheDocument()
      expect(screen.getByText('Luis Cajero Vera')).toBeInTheDocument()
    })

    it('muestra badges de estado Activo e Inactivo correctamente', async () => {
      renderAsAdmin(<AdminPage />)

      await waitFor(() => {
        expect(screen.getByText('Admin Sistema')).toBeInTheDocument()
      })

      // Verificar que hay al menos un badge Activo y un Inactivo
      const activoBadges = screen.getAllByText('Activo')
      const inactivoBadges = screen.getAllByText('Inactivo')
      // 5 usuarios activos + posibles duplicados del Select dropdown
      expect(activoBadges.length).toBeGreaterThanOrEqual(5)
      expect(inactivoBadges.length).toBeGreaterThanOrEqual(1)
    })

    it('botón "Nuevo Usuario" abre el modal de creación', async () => {
      renderAsAdmin(<AdminPage />)

      await waitFor(() => {
        expect(screen.getByText('Admin Sistema')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Nuevo Usuario'))

      await waitFor(() => {
        expect(screen.getByText('Nombre Completo *')).toBeInTheDocument()
      })
      expect(screen.getByText('Usuario SAP (login) *')).toBeInTheDocument()
      expect(screen.getByText('Usuario SAP (vendedor / cajero)')).toBeInTheDocument()
      expect(screen.getByText('Contraseña *')).toBeInTheDocument()
      expect(screen.getByText('Guardar')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    it('validación impide guardar sin nombre completo', async () => {
      renderAsAdmin(<AdminPage />)

      await waitFor(() => {
        expect(screen.getByText('Admin Sistema')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Nuevo Usuario'))

      await waitFor(() => {
        expect(screen.getByText('Guardar')).toBeInTheDocument()
      })

      // Intentar guardar sin llenar campos obligatorios
      await userEvent.click(screen.getByText('Guardar'))

      await waitFor(() => {
        expect(screen.getByText('El nombre completo es obligatorio')).toBeInTheDocument()
      })
    })
  })

  describe('tab Roles', () => {
    it('muestra los 4 roles con sus permisos', async () => {
      renderAsAdmin(<AdminPage />)

      // Navegar a tab Roles
      await userEvent.click(screen.getByText('Roles'))

      await waitFor(() => {
        expect(screen.getByText('Roles del Sistema')).toBeInTheDocument()
      })

      // Verificar los 4 roles por sus descripciones únicas
      expect(screen.getByText(/Jefe de sucursal/)).toBeInTheDocument()
      expect(screen.getByText(/Vendedor de mesón/)).toBeInTheDocument()
      expect(screen.getByText(/Cajero. Cobros/)).toBeInTheDocument()
      expect(screen.getByText(/Reportes y consultas/)).toBeInTheDocument()

      // Verificar mensaje informativo
      expect(screen.getByText(/Los roles son fijos del sistema/)).toBeInTheDocument()
    })
  })

  describe('tab Sucursales', () => {
    it('muestra D190, D052, D014 con sus nombres', async () => {
      renderAsAdmin(<AdminPage />)

      // Navegar a tab Sucursales
      await userEvent.click(screen.getByText('Sucursales'))

      await waitFor(() => {
        expect(screen.getByText('Osorno')).toBeInTheDocument()
      })

      // D190 aparece en código y oficinaVentas, verificar que existe
      expect(screen.getAllByText('D190').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Puerto Montt')).toBeInTheDocument()
      expect(screen.getAllByText('D052').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Temuco')).toBeInTheDocument()
      expect(screen.getAllByText('D014').length).toBeGreaterThanOrEqual(1)

      // Verificar mensaje informativo
      expect(screen.getByText(/Las sucursales se gestionan desde SAP/)).toBeInTheDocument()
    })
  })

  describe('vincular usuario SAP al crear', () => {
    it('al elegir un usuario SAP completa el login y muestra su perfil', async () => {
      renderAsAdmin(<AdminPage />)
      await waitFor(() => expect(screen.getByText('Admin Sistema')).toBeInTheDocument())
      await userEvent.click(screen.getByText('Nuevo Usuario'))

      await waitFor(() => expect(screen.getByText(/DVIANA — DIEGO VIANA GUERRERO/)).toBeInTheDocument())
      const option = screen.getByText(/DVIANA — DIEGO VIANA GUERRERO/).closest('ui5-option')
      fireEvent(screen.getByTestId('select-usuario-sap'), new CustomEvent('change', { detail: { selectedOption: option } }))

      await waitFor(() => expect(screen.getByTestId('info-usuario-sap')).toHaveTextContent('CAJA_OSORNO D190'))
      expect(screen.getByTestId('info-usuario-sap')).toHaveTextContent('Cliente CME 10128704')
      expect(screen.getByPlaceholderText('nombre de usuario')).toHaveValue('DVIANA')
      expect(screen.getByPlaceholderText('Nombre y apellido')).toHaveValue('DIEGO VIANA GUERRERO')
    })
  })

  describe('Tablas SAP > Perfiles Usuario', () => {
    async function abrirPerfiles() {
      renderAsAdmin(<AdminPage />)
      await userEvent.click(screen.getByText('Tablas SAP'))
      await userEvent.click(await screen.findByText('Perfiles Usuario'))
      await waitFor(() => expect(screen.getByText('CAJA_OSORNO D190')).toBeInTheDocument())
    }

    function clicPerfil(idRol: string) {
      const row = screen.getByText(idRol).closest('ui5-table-row') as HTMLElement
      fireEvent(screen.getByTestId('tabla-perfiles'), new CustomEvent('row-click', { detail: { row } }))
    }

    it('sin selección no muestra la grilla de usuarios y sí el aviso de pendientes', async () => {
      await abrirPerfiles()
      expect(screen.queryByTestId('usuarios-perfil-arriba')).not.toBeInTheDocument()
      expect(screen.queryByTestId('usuarios-perfil-abajo')).not.toBeInTheDocument()
      expect(screen.getByTestId('perfiles-resumen')).toHaveTextContent('Mostrando 2 perfiles')
      expect(screen.getByTestId('pendientes-usuarios-sap')).toHaveTextContent(/TipoUsuario FI \/ CO/)
    })

    it('al hacer clic en un perfil muestra sus usuarios asignados', async () => {
      await abrirPerfiles()
      clicPerfil('CAJA_OSORNO D190')

      // El panel se muestra encima y debajo de la tabla de perfiles
      await waitFor(() => expect(screen.getByTestId('usuarios-perfil-total-arriba')).toHaveTextContent('1 usuario'))
      expect(screen.getByTestId('usuarios-perfil-total-abajo')).toHaveTextContent('1 usuario')
      expect(screen.getAllByText('DVIANA')).toHaveLength(2)
      expect(screen.getAllByText('10128704')).toHaveLength(2)
      expect(screen.getAllByText('FI · Caja (por confirmar)')).toHaveLength(2)
      expect(screen.getByTestId('perfiles-resumen')).toHaveTextContent('Perfil seleccionado: CAJA_OSORNO D190')
    })

    it('un perfil sin usuarios muestra el mensaje y "Quitar selección" oculta la grilla', async () => {
      await abrirPerfiles()
      clicPerfil('ESTACION_FUTRONO E120')

      await waitFor(() => expect(screen.getByTestId('usuarios-perfil-total-arriba')).toHaveTextContent('0 usuarios'))
      expect(screen.getAllByText('Este perfil no tiene usuarios asignados')).toHaveLength(2)

      // "Quitar selección" desde el panel de abajo oculta ambos
      await userEvent.click(screen.getByTestId('btn-quitar-perfil-abajo'))
      expect(screen.queryByTestId('usuarios-perfil-arriba')).not.toBeInTheDocument()
      expect(screen.queryByTestId('usuarios-perfil-abajo')).not.toBeInTheDocument()
    })
  })
})
