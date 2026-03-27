import { useState } from 'react'
import { Button, MessageStrip } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/cart.js'
import '@ui5/webcomponents-icons/dist/document-text.js'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/customer.js'
import '@ui5/webcomponents-icons/dist/receipt.js'
import '@ui5/webcomponents-icons/dist/bar-chart.js'
import { PedidoListPage } from './PedidoListPage'
import { BusquedaDocPanel } from './BusquedaDocPanel'
import { ClientesPanel } from './ClientesPanel'

// Menú lateral del módulo Pedidos (replica patrón CajaPage)
const MENU_PEDIDOS = [
  { id: 'pedidos',       label: 'Pedidos',        icon: 'cart',          habilitado: true },
  { id: 'cotizacion',    label: 'Cotización',     icon: 'document-text', habilitado: false },
  { id: 'busqueda-doc',  label: 'Busqueda Doc',   icon: 'search',        habilitado: true },
  { id: 'clientes',      label: 'Clientes',       icon: 'customer',      habilitado: true },
  { id: 'nota-creditos', label: 'Nota Creditos',  icon: 'receipt',       habilitado: false },
  { id: 'reporte-diio',  label: 'Reporte DIIO',   icon: 'bar-chart',     habilitado: false },
] as const

export function PedidosPage() {
  const [moduloActivo, setModuloActivo] = useState('pedidos')

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
        {moduloActivo === 'busqueda-doc' && <BusquedaDocPanel />}
        {moduloActivo === 'clientes' && <ClientesPanel />}
        {!['pedidos', 'busqueda-doc', 'clientes'].includes(moduloActivo) && (
          <MessageStrip design="Information" hideCloseButton>
            Módulo en desarrollo — próximamente disponible.
          </MessageStrip>
        )}
      </main>
    </div>
  )
}
