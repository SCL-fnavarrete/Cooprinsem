import { describe, it, expect } from 'vitest'
import { buscarClientes, getCliente } from './clientes'

describe('buscarClientes', () => {
  it('retorna clientes que coinciden con la búsqueda', async () => {
    const results = await buscarClientes('Boldos')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].nombre).toContain('Boldos')
  })

  it('retorna array vacío cuando no hay coincidencias', async () => {
    const results = await buscarClientes('XXXXXXNOEXISTE')
    expect(results).toHaveLength(0)
  })

  it('mapea correctamente los campos del cliente', async () => {
    const results = await buscarClientes('Boldos')
    const cliente = results[0]
    expect(cliente).toHaveProperty('codigoCliente')
    expect(cliente).toHaveProperty('nombre')
    expect(cliente).toHaveProperty('rut')
    expect(cliente).toHaveProperty('condicionPago')
    expect(cliente).toHaveProperty('estadoCredito')
    expect(cliente).toHaveProperty('creditoAsignado')
    expect(typeof cliente.creditoAsignado).toBe('number')
  })
})

describe('getCliente', () => {
  it('retorna el cliente por código', async () => {
    const cliente = await getCliente('0001000001')
    expect(cliente.codigoCliente).toBe('0001000001')
    expect(cliente.nombre).toBeTruthy()
  })

  it('lanza error si el cliente no existe', async () => {
    await expect(getCliente('9999999999')).rejects.toThrow()
  })
})
