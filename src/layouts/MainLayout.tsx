import { useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom'
import {
  ShellBar,
  ShellBarItem,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/cart.js'
import '@ui5/webcomponents-icons/dist/money-bills.js'
import '@ui5/webcomponents-icons/dist/settings.js'
import '@ui5/webcomponents-icons/dist/log.js'
import { useUser } from '@/stores/userContext'
import { ROLES } from '@/config/sap'

export function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, setUsuario } = useUser()

  // Si no hay usuario, redirigir a login
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  const isActive = (path: string) => location.pathname.startsWith(path)

  // Rol 3 (Caja) solo ve Caja; Rol 2 (Ventas) solo ve Pedidos; Admin ve ambos
  const showPedidos = usuario.rolCod !== ROLES.CAJA
  const showCaja = usuario.rolCod !== ROLES.VENTAS
  const showAdmin = usuario.rolCod === ROLES.ADMINISTRADOR

  function handleLogout() {
    setUsuario(null)
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ShellBar
        logo={<img slot="logo" src="/logo-cooprinsem.png" alt="Cooprinsem POS" style={{ height: '32px', width: 'auto', cursor: 'pointer', objectFit: 'contain' }} />}
        onLogoClick={() => navigate('/home')}
      >
        {showPedidos && (
          <ShellBarItem
            icon="cart"
            text="Pedidos"
            data-path="/pedidos"
            style={isActive('/pedidos') ? { fontWeight: 'bold' } : undefined}
            onClick={() => navigate('/pedidos')}
          />
        )}
        {showCaja && (
          <ShellBarItem
            icon="money-bills"
            text="Caja"
            data-path="/caja"
            style={isActive('/caja') ? { fontWeight: 'bold' } : undefined}
            onClick={() => navigate('/caja')}
          />
        )}
        {showAdmin && (
          <ShellBarItem
            icon="settings"
            text="Administración"
            data-path="/admin"
            style={isActive('/admin') ? { fontWeight: 'bold' } : undefined}
            onClick={() => navigate('/admin')}
          />
        )}
        <ShellBarItem
          icon="log"
          text="Cerrar Sesión"
          onClick={handleLogout}
        />
      </ShellBar>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
