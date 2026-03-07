import { Navigate } from 'react-router-dom'
import { useUser } from '@/stores/userContext'
import { MessageStrip, Title, FlexBox } from '@ui5/webcomponents-react'
import type { RolCod } from '@/config/sap'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: RolCod[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { usuario } = useUser()

  // Sin sesión → login
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Sin permiso → 403
  if (!allowedRoles.includes(usuario.rolCod)) {
    return (
      <FlexBox
        direction="Column"
        alignItems="Center"
        justifyContent="Center"
        style={{ height: '100%', gap: '1rem', padding: '2rem' }}
      >
        <Title level="H2">Acceso Denegado</Title>
        <MessageStrip design="Negative" hideCloseButton>
          No tiene permisos para acceder a este módulo. Contacte al administrador.
        </MessageStrip>
      </FlexBox>
    )
  }

  return <>{children}</>
}
