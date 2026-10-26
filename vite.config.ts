import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

// Commit del build (se muestra en el login). Sin git disponible queda vacío.
function commitActual(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Extraer el origen SAP (sin el path /sap/opu/odata/sap)
  const sapBase = env.VITE_SAP_ODATA_BASE_URL || 'https://sapqas.cooprinsem:44320/sap/opu/odata/sap'
  const sapOrigin = sapBase.replace(/\/sap\/opu\/odata.*/, '')

  // Backend del POS: vite preview (pre_prod) reenvía /api y /health al backend,
  // así el frontend compilado usa rutas relativas (VNC o red, sin IP fija).
  const backend = env.POS_BACKEND_URL || 'http://localhost:3001'
  const proxyBackend = {
    '/api': { target: backend, changeOrigin: true },
    '/health': { target: backend, changeOrigin: true },
  }
  const fechaBuild = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }).format(new Date())

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_BUILD_COMMIT': JSON.stringify(commitActual()),
      'import.meta.env.VITE_BUILD_FECHA': JSON.stringify(mode === 'preprod' ? fechaBuild : ''),
    },
    preview: {
      port: 5173,
      strictPort: true,
      // El navegador siempre revisa si hay versión nueva: sin esto, tras actualizar la VM
      // seguía mostrando la versión anterior desde su caché (hasta un Ctrl+F5)
      headers: { 'Cache-Control': 'no-cache' },
      proxy: proxyBackend,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // VigilaPOS.bat compila en dist_nuevo y deja logs: no vigilarlos (Windows no
      // deja renombrar una carpeta vigilada)
      watch: { ignored: ['**/dist_nuevo/**', '**/dist_anterior/**', '**/logs/**'] },
      // Proxy para desarrollo sin MSW (conectar directamente a SAP QAS)
      // En desarrollo normal se usa VITE_USE_MOCK=true y MSW intercepta las llamadas
      proxy: {
        '/sap/opu/odata': {
          target: sapOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
