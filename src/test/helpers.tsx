import { render, type RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import type { ReactElement } from 'react'
import { UserProvider } from '@/stores/userContext'
import type { IUsuario } from '@/types/common'

// Usuario cajero por defecto para tests (rolCod 3 = Caja)
const USUARIO_TEST: IUsuario = {
  id: 'cajero.test',
  nombre: 'Cajero Test',
  rolCod: 3,
  sucursal: 'D190',
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: IUsuario
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
) {
  const { user, ...renderOptions } = options ?? {}
  const currentUser = user ?? USUARIO_TEST

  function AllProviders({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <UserProvider initialUser={currentUser}>
            {children}
          </UserProvider>
        </ThemeProvider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: AllProviders, ...renderOptions })
}
