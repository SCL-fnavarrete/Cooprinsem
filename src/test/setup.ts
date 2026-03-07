import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Limpia el DOM después de cada test
afterEach(() => {
  cleanup()
})

// MSW server lifecycle se agrega en Sprint 1 cuando se creen los handlers
// Ver: src/services/mock/server.ts
