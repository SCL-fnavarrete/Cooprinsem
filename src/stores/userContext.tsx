import { createContext, useContext, useState, type ReactNode } from 'react'
import type { IUsuario } from '@/types/common'

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

export function UserProvider({ children, initialUser = null }: UserProviderProps) {
  const [usuario, setUsuario] = useState<IUsuario | null>(initialUser)
  return (
    <UserContext.Provider value={{ usuario, setUsuario }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): IUserContextValue {
  return useContext(UserContext)
}
