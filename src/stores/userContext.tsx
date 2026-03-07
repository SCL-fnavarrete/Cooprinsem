import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { IUsuario } from '@/types/common'

const SESSION_KEY = 'cooprinsem_pos_user'

function loadFromSession(): IUsuario | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as IUsuario) : null
  } catch {
    return null
  }
}

function saveToSession(user: IUsuario | null) {
  if (user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

interface IUserContextValue {
  usuario: IUsuario | null
  setUsuario: (u: IUsuario | null) => void
}

const UserContext = createContext<IUserContextValue>({
  usuario: null,
  setUsuario: () => {},
})

interface UserProviderProps {
  children: ReactNode
  initialUser?: IUsuario | null
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
  const [usuario, setUsuarioState] = useState<IUsuario | null>(
    initialUser ?? loadFromSession()
  )

  const setUsuario = useCallback((u: IUsuario | null) => {
    setUsuarioState(u)
    saveToSession(u)
  }, [])

  return (
    <UserContext.Provider value={{ usuario, setUsuario }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): IUserContextValue {
  return useContext(UserContext)
}
