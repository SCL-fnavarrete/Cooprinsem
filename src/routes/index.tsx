import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { PedidoPage } from '@/features/pedidos/PedidoPage'
import { CajaPage } from '@/features/caja/CajaPage'
import { useUser } from '@/stores/userContext'
import { ROLES } from '@/config/sap'

function RootRedirect() {
  const { usuario } = useUser()

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Redirigir según rol
  if (usuario.rolCod === ROLES.CAJA) {
    return <Navigate to="/caja" replace />
  }
  return <Navigate to="/pedidos" replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route
          path="/pedidos"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.VENTAS, ROLES.CONSULTAS]}>
              <PedidoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caja"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.CAJA]}>
              <CajaPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<RootRedirect />} />
      </Route>
    </Routes>
  )
}
