import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { instalarEncabezadoUsuario } from './services/api/encabezadoUsuario'

// Envía el usuario logueado en cada llamada al backend (perfil Visualizador)
instalarEncabezadoUsuario()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
