// Versión visible en el login: modo (desarrollo / preprod), commit y fecha del build.
// Los valores los fija vite.config.ts al compilar; en desarrollo y en tests no existen.
export const APP_VERSION = '1.0.0'

const env = import.meta.env
export const VERSION_COMMIT: string = env.VITE_BUILD_COMMIT ?? ''
export const VERSION_FECHA: string = env.VITE_BUILD_FECHA ?? ''
export const VERSION_MODO: string = env.MODE === 'preprod' ? 'preprod' : env.MODE === 'development' ? 'desarrollo' : env.MODE

/** Ej. "v1.0.0 · preprod · 946a063" (sin commit en desarrollo). */
export function textoVersion(): string {
  return [`v${APP_VERSION}`, VERSION_MODO, VERSION_COMMIT].filter(Boolean).join(' · ')
}
