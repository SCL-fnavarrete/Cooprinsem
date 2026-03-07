import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Servidor MSW para tests unitarios (Node.js)
export const server = setupServer(...handlers)
