import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Service Worker MSW para desarrollo en navegador (cuando VITE_USE_MOCK=true)
export const worker = setupWorker(...handlers)
