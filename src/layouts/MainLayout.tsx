import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  ShellBar,
  ShellBarItem,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/cart.js'
import '@ui5/webcomponents-icons/dist/money-bills.js'

export function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ShellBar
        primaryTitle="Cooprinsem POS"
        secondaryTitle="Sucursal D190 — Osorno"
      >
        <ShellBarItem
          icon="cart"
          text="Pedidos"
          data-path="/pedidos"
          style={isActive('/pedidos') ? { fontWeight: 'bold' } : undefined}
          onClick={() => navigate('/pedidos')}
        />
        <ShellBarItem
          icon="money-bills"
          text="Caja"
          data-path="/caja"
          style={isActive('/caja') ? { fontWeight: 'bold' } : undefined}
          onClick={() => navigate('/caja')}
        />
      </ShellBar>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
