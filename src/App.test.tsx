import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renderiza sin errores', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
