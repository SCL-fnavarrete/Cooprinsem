import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Title,
  FlexBox,
  Card,
  CardHeader,
  Text,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/sales-order.js'
import '@ui5/webcomponents-icons/dist/money-bills.js'
import '@ui5/webcomponents-icons/dist/settings.js'
import { useUser } from '@/stores/userContext'
import { ROLES, SUCURSALES } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'

interface Tile {
  id: string
  titulo: string
  subtitulo: string
  icon: string
  ruta: string
}

export function HomePage() {
  const { usuario } = useUser()
  const navigate = useNavigate()

  const rolCod = usuario?.rolCod ?? 0
  const sucursalNombre = SUCURSALES[usuario?.sucursal as CodigoSucursal] ?? usuario?.sucursal ?? ''

  const tiles = useMemo(() => {
    const all: (Tile & { roles: number[] })[] = [
      { id: 'admin', titulo: 'Administración', subtitulo: 'Usuarios, roles y sucursales', icon: 'settings', ruta: '/admin', roles: [ROLES.ADMINISTRADOR] },
      { id: 'pedidos', titulo: 'Pedidos', subtitulo: 'Crear y consultar ventas', icon: 'sales-order', ruta: '/pedidos', roles: [ROLES.ADMINISTRADOR, ROLES.VENTAS, ROLES.CONSULTAS] },
      { id: 'caja', titulo: 'Caja', subtitulo: 'Cobros, pagos y arqueo', icon: 'money-bills', ruta: '/caja', roles: [ROLES.ADMINISTRADOR, ROLES.CAJA] },
    ]
    return all.filter((t) => t.roles.includes(rolCod))
  }, [rolCod])

  // Auto-redirección genérica: si solo hay 1 tile visible, ir directamente
  useEffect(() => {
    if (tiles.length === 1) {
      navigate(tiles[0].ruta, { replace: true })
    }
  }, [tiles, navigate])

  // Si auto-redirige, no renderizar nada
  if (tiles.length === 1) {
    return null
  }

  return (
    <div style={{ padding: '2rem' }}>
      <FlexBox direction="Column" style={{ gap: '0.5rem', marginBottom: '2rem' }}>
        <Title level="H2">Cooprinsem POS</Title>
        <Text>Sucursal {usuario?.sucursal} — {sucursalNombre}</Text>
      </FlexBox>

      <FlexBox wrap="Wrap" style={{ gap: '1rem' }}>
        {tiles.map((tile) => (
          <Card
            key={tile.id}
            header={
              <CardHeader
                interactive
                titleText={tile.titulo}
                subtitleText={tile.subtitulo}
                onClick={() => navigate(tile.ruta)}
              />
            }
            style={{ width: '280px', minHeight: '120px' }}
          />
        ))}
      </FlexBox>
    </div>
  )
}
