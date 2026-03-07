import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { PedidoPage } from '@/features/pedidos/PedidoPage'
import { CajaPage } from '@/features/caja/CajaPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/pedidos" element={<PedidoPage />} />
        <Route path="/caja" element={<CajaPage />} />
        <Route path="*" element={<Navigate to="/pedidos" replace />} />
      </Route>
    </Routes>
  )
}
