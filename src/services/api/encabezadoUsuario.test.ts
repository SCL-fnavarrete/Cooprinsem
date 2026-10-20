import { describe, it, expect, vi, afterEach } from 'vitest'
import { instalarEncabezadoUsuario, ENCABEZADO_USUARIO } from './encabezadoUsuario'
import { API_BASE_URL } from './config'

describe('instalarEncabezadoUsuario', () => {
  const fetchOriginal = window.fetch
  afterEach(() => {
    window.fetch = fetchOriginal
    sessionStorage.clear()
  })

  it('debería agregar el usuario logueado solo a las llamadas al backend del POS', async () => {
    const espia = vi.fn().mockResolvedValue(new Response('{}'))
    window.fetch = espia
    sessionStorage.setItem('cooprinsem_pos_user', JSON.stringify({ id: 'visor' }))
    instalarEncabezadoUsuario()

    await window.fetch(`${API_BASE_URL}/api/pedidos`)
    expect((espia.mock.calls[0][1].headers as Headers).get(ENCABEZADO_USUARIO)).toBe('visor')

    await window.fetch('https://otro-sitio/api')
    expect(espia.mock.calls[1][1]).toBeUndefined()
  })
})
