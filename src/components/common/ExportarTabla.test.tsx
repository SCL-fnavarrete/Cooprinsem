import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { ExportarTabla } from './ExportarTabla'
import * as exportacion from '@/utils/exportarTabla'

const columnas = [{ titulo: 'Cliente', valor: (f: { c: string }) => f.c }]

describe('ExportarTabla', () => {
  afterEach(() => vi.restoreAllMocks())

  it('debería ofrecer texto plano, CSV y Excel y exportar todas las filas recibidas', () => {
    const espia = vi.spyOn(exportacion, 'exportarTabla').mockImplementation(() => {})
    const filas = [{ c: 'Peñaflor' }, { c: 'Ñuble' }]
    renderWithProviders(<ExportarTabla filas={filas} columnas={columnas} nombreArchivo="Caja listado documentos" />)

    fireEvent.click(screen.getByTestId('exportar-tabla-boton'))
    expect(screen.getByText('Texto plano (.txt)')).toBeInTheDocument()
    expect(screen.getByText('CSV (.csv)')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('exportar-tabla-xlsx'))

    expect(espia).toHaveBeenCalledWith('xlsx', filas, columnas, 'Caja listado documentos', undefined)
    expect(screen.queryByText('CSV (.csv)')).not.toBeInTheDocument()
  })

  it('debería quedar deshabilitado sin filas', () => {
    renderWithProviders(<ExportarTabla filas={[]} columnas={columnas} nombreArchivo="x" />)
    expect(screen.getByTestId('exportar-tabla-boton')).toHaveAttribute('disabled')
  })
})
