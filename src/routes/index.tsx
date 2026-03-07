import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { PedidoPage } from '@/features/pedidos/PedidoPage'

function CajaPlaceholder() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Modulo Caja</h2>
      <p>Proximamente</p>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/pedidos" element={<PedidoPage />} />
        <Route path="/caja" element={<CajaPlaceholder />} />
        <Route path="*" element={<Navigate to="/pedidos" replace />} />
      </Route>
    </Routes>
  )
}
