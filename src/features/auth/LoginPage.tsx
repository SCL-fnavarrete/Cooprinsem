import { useState, type FormEvent } from 'react'
import {
  MessageStrip,
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
        throw new Error(body.error ?? 'Usuario o contrasena incorrectos')
      }

      const data: IUsuario = await res.json()
      setUserContext(data)

      // Redirigir a HomePage (tiles Fiori por rol)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexion')
    } finally {
      setIsLoading(false)
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    handleLogin()
  }

  return (
    <div style={styles.container}>
      {/* Fondo con imagen */}
      <div style={styles.background} />
      {/* Overlay oscuro sutil en el lado izquierdo */}
      <div style={styles.overlay} />

      {/* Card de login */}
      <div style={styles.cardWrapper}>
        <div style={styles.card}>
          <div style={styles.header}>
            <span style={styles.appTitle}>Cooprinsem POS</span>
            <span style={styles.appSubtitle}>Sistema Punto de Venta</span>
          </div>

          <h2 style={styles.loginTitle}>Iniciar Sesion</h2>

          <form onSubmit={handleFormSubmit} style={styles.form}>
            {error && (
              <MessageStrip design="Negative" hideCloseButton>
                {error}
              </MessageStrip>
            )}

            <div style={styles.fieldGroup}>
              <label htmlFor="login-usuario" style={styles.label}>
                Usuario<span style={styles.required}>*</span>
              </label>
              <input
                id="login-usuario"
                type="text"
                placeholder="Usuario SAP"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                disabled={isLoading}
                style={styles.input}
                autoComplete="username"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="login-password" style={styles.label}>
                Contrasena<span style={styles.required}>*</span>
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="Contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={styles.input}
                autoComplete="current-password"
              />
            </div>

            <BusyIndicator active={isLoading} style={{ width: '100%' }}>
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                style={{
                  ...styles.submitButton,
                  opacity: (!canSubmit || isLoading) ? 0.6 : 1,
                  cursor: (!canSubmit || isLoading) ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </BusyIndicator>
          </form>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url(/Fondo_Login.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 35%, transparent 50%)',
    zIndex: 1,
  },
  cardWrapper: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    paddingLeft: '5vw',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '40px 44px',
    width: '420px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(10px)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    marginBottom: '24px',
  },
  appTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1a2e',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
  },
  appSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
  },
  loginTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1a1a2e',
    textAlign: 'center' as const,
    margin: '0 0 28px 0',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a2e',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
  },
  required: {
    color: '#e74c3c',
    marginLeft: '2px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
    color: '#333',
    background: '#fff',
    transition: 'border-color 0.2s',
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    background: '#0d7377',
    border: 'none',
    borderRadius: '8px',
    fontFamily: "'72', '72full', Arial, Helvetica, sans-serif",
    marginTop: '8px',
    transition: 'background 0.2s, opacity 0.2s',
  },
}
