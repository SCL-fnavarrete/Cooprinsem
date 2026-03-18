import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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

const TILE_ICONS: Record<string, string> = {
  admin: '/icon-admin.png',
  pedidos: '/icon-pedidos.png',
  caja: '/icon-caja.png',
}

export function HomePage() {
  const { usuario } = useUser()
  const navigate = useNavigate()

  const rolCod = usuario?.rolCod ?? 0
  const sucursalNombre = SUCURSALES[usuario?.sucursal as CodigoSucursal] ?? usuario?.sucursal ?? ''

  const tiles = useMemo(() => {
    const all: (Tile & { roles: number[] })[] = [
      { id: 'admin', titulo: 'Administracion', subtitulo: 'Usuarios, roles y sucursales', icon: 'admin', ruta: '/admin', roles: [ROLES.ADMINISTRADOR] },
      { id: 'pedidos', titulo: 'Pedidos', subtitulo: 'Crear y consultar ventas', icon: 'pedidos', ruta: '/pedidos', roles: [ROLES.ADMINISTRADOR, ROLES.VENTAS, ROLES.CONSULTAS] },
      { id: 'caja', titulo: 'Caja', subtitulo: 'Cobros, pagos y arqueo', icon: 'caja', ruta: '/caja', roles: [ROLES.ADMINISTRADOR, ROLES.CAJA] },
    ]
    return all.filter((t) => t.roles.includes(rolCod))
  }, [rolCod])

  // Auto-redireccion generica: si solo hay 1 tile visible, ir directamente
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
    <div style={styles.container}>
      {/* Fondo con imagen */}
      <div style={styles.background} />
      <div style={styles.overlay} />

      {/* Contenido */}
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Cooprinsem POS</h1>
          <p style={styles.subtitle}>
            Sucursal {usuario?.sucursal} — {sucursalNombre}
          </p>
          <p style={styles.welcome}>
            Bienvenido, <strong>{usuario?.nombre}</strong>
          </p>
        </div>

        {/* Tiles */}
        <div style={styles.tilesGrid}>
          {tiles.map((tile) => (
            <button
              key={tile.id}
              onClick={() => navigate(tile.ruta)}
              style={styles.tile}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.12)'
              }}
            >
              <div style={styles.tileIconWrapper}>
                <img
                  src={TILE_ICONS[tile.icon]}
                  alt={tile.titulo}
                  style={styles.tileIcon}
                />
              </div>
              <div style={styles.tileText}>
                <span style={styles.tileTitle}>{tile.titulo}</span>
                <span style={styles.tileSubtitle}>{tile.subtitulo}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    overflow: 'hidden',
  },
  background: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'url(/Fondo_Login.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 20, 40, 0.55)',
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '3rem',
  },
  title: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 8px 0',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.85)',
    margin: '0 0 4px 0',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
  },
  welcome: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: 0,
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
  },
  tilesGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '24px',
    justifyContent: 'center',
  },
  tile: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    width: '220px',
    height: '220px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    padding: '24px',
    gap: '16px',
    backdropFilter: 'blur(10px)',
  },
  tileIconWrapper: {
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: {
    width: '72px',
    height: '72px',
    objectFit: 'contain' as const,
  },
  tileText: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
  },
  tileTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0a1929',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
  },
  tileSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
    textAlign: 'center' as const,
  },
}
