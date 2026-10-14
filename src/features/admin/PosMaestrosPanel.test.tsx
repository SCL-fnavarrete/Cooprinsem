import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { PosMaestrosPanel } from './PosMaestrosPanel'

function abrirTiposDocumento() {
  renderWithProviders(<PosMaestrosPanel />)
  fireEvent.click(screen.getByText('Tipo Documento'))
}

function escribir(placeholder: string, valor: string) {
  const input = screen.getByPlaceholderText(placeholder) as HTMLInputElement
  input.value = valor
  fireEvent.input(input, { target: { value: valor } })
}

describe('PosMaestrosPanel — Tipo Documento', () => {
  it('debería listar los tipos de documento con su descripción', async () => {
    abrirTiposDocumento()
    expect(await screen.findByText('Boleta Electronica')).toBeInTheDocument()
    expect(screen.getByText('Factura Elect')).toBeInTheDocument()
    expect(screen.getByText(/proceso de Arquitectura SAP/)).toBeInTheDocument()
  })

  it('debería filtrar por código o descripción', async () => {
    abrirTiposDocumento()
    await screen.findByText('Boleta Electronica')
    escribir('Buscar por código o descripción', 'boleta')
    expect(screen.getByText('Boleta Electronica')).toBeInTheDocument()
    expect(screen.queryByText('Factura Elect')).not.toBeInTheDocument()
  })

  it('debería validar el código antes de crear', async () => {
    abrirTiposDocumento()
    await screen.findByText('Boleta Electronica')
    fireEvent.click(screen.getByText('Nuevo'))
    escribir('D6', 'ABC')
    escribir('Boleta Electronica', 'Prueba')
    fireEvent.click(screen.getByText('Guardar'))
    expect(await screen.findByText('El código debe tener 1 o 2 caracteres (letras o números)')).toBeInTheDocument()
  })

  it('debería mostrar el error del backend si el código ya existe', async () => {
    abrirTiposDocumento()
    await screen.findByText('Boleta Electronica')
    fireEvent.click(screen.getByText('Nuevo'))
    escribir('D6', 'd1')
    escribir('Boleta Electronica', 'Otra factura')
    fireEvent.click(screen.getByText('Guardar'))
    expect(await screen.findByText('El tipo de documento D1 ya existe')).toBeInTheDocument()
  })
})
