import { useState, type FormEvent } from 'react'
import {
  Card,
  CardHeader,
  FlexBox,
  Input,
  Button,
  MessageStrip,
  Label,
  Title,
  BusyIndicator,
} from '@ui5/webcomponents-react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/stores/userContext'
import { API_BASE_URL } from '@/services/api/config'
import type { IUsuario } from '@/types/common'

export function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { setUsuario: setUserContext } = useUser()
  const navigate = useNavigate()

  const canSubmit = usuario.trim().length > 0 && password.trim().length > 0

  async function handleLogin() {
    if (!canSubmit || isLoading) return

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario.trim(), password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Usuario o contraseña incorrectos')
      }

      const data: IUsuario = await res.json()
      setUserContext(data)

      // Redirigir a HomePage (tiles Fiori por rol)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    handleLogin()
  }

  return (
    <FlexBox
      justifyContent="Center"
      alignItems="Center"
      style={{ height: '100vh', background: 'var(--sapBackgroundColor, #f5f6f7)' }}
    >
      <Card
        header={<CardHeader titleText="Cooprinsem POS" subtitleText="Sistema Punto de Venta" />}
        style={{ width: '380px' }}
      >
        <form onSubmit={handleFormSubmit} style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
          <Title level="H5" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            Iniciar Sesión
          </Title>

          {error && (
            <MessageStrip design="Negative" hideCloseButton>
              {error}
            </MessageStrip>
          )}

          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <Label for="login-usuario" required>Usuario</Label>
            <Input
              id="login-usuario"
              placeholder="Usuario SAP"
              value={usuario}
              onInput={(e) => setUsuario((e.target as unknown as { value: string }).value)}
              disabled={isLoading}
            />
          </div>

          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <Label for="login-password" required>Contraseña</Label>
            <Input
              id="login-password"
              type="Password"
              placeholder="Contraseña"
              value={password}
              onInput={(e) => setPassword((e.target as unknown as { value: string }).value)}
              disabled={isLoading}
            />
          </div>

          <BusyIndicator active={isLoading} style={{ width: '100%' }}>
            <Button
              design="Emphasized"
              type="Submit"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={!canSubmit || isLoading}
              onClick={() => handleLogin()}
            >
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </BusyIndicator>
        </form>
      </Card>
    </FlexBox>
  )
}
