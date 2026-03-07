import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Extraer el origen SAP (sin el path /sap/opu/odata/sap)
  const sapBase = env.VITE_SAP_ODATA_BASE_URL || 'https://sapqas.cooprinsem:44320/sap/opu/odata/sap'
  const sapOrigin = sapBase.replace(/\/sap\/opu\/odata.*/, '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
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
