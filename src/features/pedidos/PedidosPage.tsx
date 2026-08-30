import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, MessageStrip } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/cart.js'
import '@ui5/webcomponents-icons/dist/customer.js'
import '@ui5/webcomponents-icons/dist/inventory.js'
import { PedidoListPage } from './PedidoListPage'
import { ClientesPanel } from './ClientesPanel'
import { StockPage } from '@/features/stock/StockPage'

// Menú lateral del módulo Pedidos (replica patrón CajaPage)
const MENU_PEDIDOS = [
  { id: 'clientes', label: 'Clientes', icon: 'customer', habilitado: true },
  { id: 'stock', label: 'Stock', icon: 'inventory', habilitado: true },
  { id: 'pedidos', label: 'Pedidos', icon: 'cart', habilitado: true },
] as const

export function PedidosPage() {
  const location = useLocation()
  const [moduloActivo, setModuloActivo] = useState(location.state?.modulo || 'clientes')

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Menú lateral izquierdo */}
      <nav
        style={{
          width: '200px',
          borderRight: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)',
          padding: '1rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
        aria-label="Menú de Pedidos"
      >
        {MENU_PEDIDOS.map((item) => (
          <Button
            key={item.id}
            icon={item.icon}
            design={moduloActivo === item.id && item.habilitado ? 'Emphasized' : 'Default'}
            disabled={!item.habilitado}
            onClick={() => setModuloActivo(item.id)}
            style={{ width: '100%', justifyContent: 'flex-start' }}
            tooltip={item.habilitado ? undefined : 'Próximamente'}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Contenido principal */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
        {moduloActivo === 'pedidos' && <PedidoListPage />}
        {moduloActivo === 'clientes' && <ClientesPanel />}
        {moduloActivo === 'stock' && <StockPage />}
        {!['pedidos', 'clientes', 'stock'].includes(moduloActivo) && (
          <MessageStrip design="Information" hideCloseButton>
            Módulo en desarrollo — próximamente disponible.
          </MessageStrip>
        )}
      </main>
    </div>
  )
}
