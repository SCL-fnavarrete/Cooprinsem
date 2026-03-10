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
import { ROLES, SUCURSALES } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'

export function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, setUsuario } = useUser()

  // Si no hay usuario, redirigir a login
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  const isActive = (path: string) => location.pathname.startsWith(path)
  const sucursalNombre = SUCURSALES[usuario.sucursal as CodigoSucursal] ?? usuario.sucursal

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
        primaryTitle="Cooprinsem POS"
        secondaryTitle={`${usuario.nombre} — ${sucursalNombre}`}
        logo={<img slot="logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23346187'%3E%3Cpath d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/%3E%3C/svg%3E" alt="Inicio" style={{ width: '28px', height: '28px', cursor: 'pointer' }} />}
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
