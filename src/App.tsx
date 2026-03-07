import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import { UserProvider } from '@/stores/userContext'
import { AppRoutes } from '@/routes/index'
import type { IUsuario } from '@/types/common'

// Usuario hardcodeado para el POC — en Fase 1 vendrá del login SAP
const USUARIO_POC: IUsuario = {
  id: 'vendedor.poc',
  nombre: 'Vendedor POC',
  rolCod: 2,
  sucursal: 'D190',
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider initialUser={USUARIO_POC}>
          <AppRoutes />
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
