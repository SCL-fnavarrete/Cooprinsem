import { describe, it, expect, vi, beforeAll } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { ListadoDocumentosCaja } from './ListadoDocumentosCaja'
import type { IDocumentoCaja } from '@/types/caja'

beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

const documento: IDocumentoCaja = {
  id: '1800000001', kunnr: '10000003', estado: 'rojo', tipoDocumento: 'Factura', folio: '12345',
  rut: '76.123.456-7', cliente: 'AGRICOLA DE PRUEBA LTDA', monedaDocumento: 'CLP', montoDocumento: 19040,
  moneda: 'CLP', monto: 19040, fecha: '2026-08-26', bloqueoPago: '',
}

describe('ListadoDocumentosCaja', () => {
  it('debería mostrar Sel., Estado y las columnas del WebDynpro en orden', () => {
    renderWithProviders(<ListadoDocumentosCaja documentos={[]} seleccionados={[]} onToggle={vi.fn()} />)
    const cabeceras = Array.from(document.querySelectorAll('ui5-table-header-cell')).map((c) => c.textContent)
    expect(cabeceras).toEqual([
      'Sel.', 'Estado', 'Tipo documento', 'Folio', 'Rut', 'Cliente',
      'Moneda Doc.', 'Monto Doc.', 'Moneda', 'Monto', 'Fecha', 'Bloqueo pago',
    ])
  })

  it('debería mostrar el mensaje de tabla vacía sin documentos', () => {
    renderWithProviders(<ListadoDocumentosCaja documentos={[]} seleccionados={[]} onToggle={vi.fn()} />)
    expect(screen.getByText('No hay documentos disponibles para pagar')).toBeInTheDocument()
  })

  it('debería mostrar los datos del documento y seleccionarlo al hacer clic en la fila', () => {
    const onToggle = vi.fn()
    renderWithProviders(<ListadoDocumentosCaja documentos={[documento]} seleccionados={['1800000001']} onToggle={onToggle} />)
    expect(screen.getByText('Vencida')).toBeInTheDocument()
    expect(screen.getByText('76.123.456-7')).toBeInTheDocument()
    expect(screen.getByText('AGRICOLA DE PRUEBA LTDA')).toBeInTheDocument()
    expect(screen.getByText('Autorizado el pago')).toBeInTheDocument()
    expect(screen.getByLabelText('Seleccionar documento 12345')).toBeChecked()

    fireEvent.click(screen.getByTestId('documento-caja-1800000001'))
    expect(onToggle).toHaveBeenCalledWith('1800000001')
  })
})
