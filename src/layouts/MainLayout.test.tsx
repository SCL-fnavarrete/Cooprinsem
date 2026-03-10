import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import { UserProvider } from '@/stores/userContext'
import { MainLayout } from './MainLayout'
import type { IUsuario } from '@/types/common'

const ADMIN_USER: IUsuario = {
  id: 'admin.test',
  nombre: 'Admin Test',
  rolCod: 1,
  sucursal: 'D190',
}

function renderWithRoutes(initialPath: string, user: IUsuario = ADMIN_USER) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <UserProvider initialUser={user}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/home" element={<div>Pagina Home</div>} />
              <Route path="/pedidos" element={<div>Pagina Pedidos</div>} />
              <Route path="/caja" element={<div>Pagina Caja</div>} />
              <Route path="/admin" element={<div>Pagina Admin</div>} />
            </Route>
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('MainLayout', () => {
  it('navega a /home al hacer clic en el logo', () => {
    renderWithRoutes('/pedidos')

    // Verificar que estamos en Pedidos
    expect(screen.getByText('Pagina Pedidos')).toBeInTheDocument()

    // ShellBar renderiza como <ui5-shellbar> en jsdom — disparar logo-click
    const shellbar = document.querySelector('ui5-shellbar')!
    fireEvent(shellbar, new CustomEvent('logo-click'))

    // Debe navegar a /home
    expect(screen.getByText('Pagina Home')).toBeInTheDocument()
  })
})
