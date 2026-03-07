import { render, type RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import type { ReactElement } from 'react'
import { UserProvider } from '@/stores/userContext'
import type { IUsuario } from '@/types/common'

// Usuario cajero por defecto para tests
const USUARIO_TEST: IUsuario = {
  id: 'cajero.test',
  nombre: 'Cajero Test',
  rolCod: 3,
  sucursal: 'D190',
}

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider initialUser={USUARIO_TEST}>
          {children}
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}
