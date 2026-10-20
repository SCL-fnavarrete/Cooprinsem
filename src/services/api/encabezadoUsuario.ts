import { API_BASE_URL } from './config'

// Agrega el usuario logueado (encabezado X-POS-Usuario) a cada llamada al
// backend del POS, en un solo lugar en vez de en cada fetch. El backend lo usa
// para aplicar el perfil Visualizador (solo lectura): ver
// server/src/middleware/soloLectura.ts. Se instala una vez en main.tsx.

export const ENCABEZADO_USUARIO = 'X-POS-Usuario'
const SESSION_KEY = 'cooprinsem_pos_user'  // misma clave que stores/userContext.tsx

function usuarioEnSesion(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? String((JSON.parse(raw) as { id?: string }).id ?? '') : ''
  } catch {
    return ''
  }
}

function urlDe(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

export function instalarEncabezadoUsuario(): void {
  const fetchOriginal = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const usuario = usuarioEnSesion()
    if (!usuario || !urlDe(input).startsWith(API_BASE_URL)) return fetchOriginal(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.set(ENCABEZADO_USUARIO, usuario)
    return fetchOriginal(input, { ...init, headers })
  }
}
