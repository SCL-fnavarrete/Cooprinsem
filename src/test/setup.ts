import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { server } from '@/services/mock/server'

// MSW lifecycle — intercepta llamadas a http://localhost:3001 durante tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()  // Limpiar overrides de handlers por test
})
afterAll(() => server.close())
