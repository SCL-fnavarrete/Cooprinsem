import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { HomePage } from '@/features/home/HomePage'
import { PedidosPage } from '@/features/pedidos/PedidosPage'
import { PedidoPage } from '@/features/pedidos/PedidoPage'
import { PedidoDetallePage } from '@/features/pedidos/PedidoDetallePage'
import { CajaPage } from '@/features/caja/CajaPage'
import { PagoDetallePage } from '@/features/caja/PagoDetallePage'
import { AdminPage } from '@/features/admin/AdminPage'
import { useUser } from '@/stores/userContext'
import { ROLES } from '@/config/sap'

function RootRedirect() {
  const { usuario } = useUser()

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/home" replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route
          path="/home"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.VENTAS, ROLES.CAJA, ROLES.CONSULTAS, ROLES.VISUALIZADOR]}>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedidos"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.VENTAS, ROLES.CONSULTAS, ROLES.VISUALIZADOR]}>
              <PedidosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedidos/nuevo"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.VENTAS, ROLES.VISUALIZADOR]}>
              <PedidoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedidos/:vbeln"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.VENTAS, ROLES.CONSULTAS, ROLES.VISUALIZADOR]}>
              <PedidoDetallePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caja"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.CAJA, ROLES.VISUALIZADOR]}>
              <CajaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caja/pago/:belnr?"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.CAJA, ROLES.VISUALIZADOR]}>
              <PagoDetallePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.VISUALIZADOR]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<RootRedirect />} />
      </Route>
    </Routes>
  )
}
