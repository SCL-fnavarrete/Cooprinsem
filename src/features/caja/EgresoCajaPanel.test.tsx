import { describe, it, expect, beforeAll } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { EgresoCajaPanel } from './EgresoCajaPanel'

// Polyfill: jsdom no tiene checkVisibility (usado por UI5 Table internamente)
beforeAll(() => {
  if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = () => true
  }
})

function setUI5InputValue(element: Element, value: string) {
  Object.defineProperty(element, 'value', { value, writable: true, configurable: true })
  fireEvent.input(element, { target: { value } })
}

describe('EgresoCajaPanel', () => {
  it('debería listar los egresos de egreso_caja de la sucursal', async () => {
    renderWithProviders(<EgresoCajaPanel />)
    expect(await screen.findByText('DVIANA')).toBeInTheDocument()
    expect(screen.getByText('CAJERO2')).toBeInTheDocument()
    // Columnas agregadas a egreso_caja: N° documento SAP, ejercicio, motivo y hora
    expect(screen.getByText('1400000080')).toBeInTheDocument()
    expect(screen.getAllByText('EGRESO')).toHaveLength(2)
    expect(screen.getByTestId('paginador-egresos')).toHaveTextContent(/de 2/)
    expect(screen.getByTestId('pendientes-egreso-caja')).toHaveTextContent(/BLOQUEANTE/)
  })

  it('debería abrir el formulario sin RUT, cliente ni N° de documento', async () => {
    renderWithProviders(<EgresoCajaPanel />)
    await screen.findByText('DVIANA')
    fireEvent.click(screen.getByTestId('btn-nuevo-egreso'))
    const dialog = screen.getByTestId('egreso-caja-dialog')
    expect(dialog).toHaveTextContent('Usuario')
    expect(dialog).toHaveTextContent('Sucursal')
    expect(dialog).toHaveTextContent('Monto')
    expect(dialog).not.toHaveTextContent('Rut')
    expect(dialog).not.toHaveTextContent('Cliente')
    expect(dialog).not.toHaveTextContent('documento')
  })

  it('debería mostrar el JSON propuesto sin contabilizar mientras el asiento está pendiente', async () => {
    renderWithProviders(<EgresoCajaPanel />)
    await screen.findByText('DVIANA')
    fireEvent.click(screen.getByTestId('btn-nuevo-egreso'))
    setUI5InputValue(screen.getByTestId('egreso-monto'), '70000')
    fireEvent.click(screen.getByTestId('btn-aceptar-egreso'))
    expect(await screen.findByTestId('egreso-resultado-mensaje')).toHaveTextContent(/NO contabilizado/)
    expect(screen.getByText('JSON propuesto (no enviado)')).toBeInTheDocument()
    expect(screen.getByTestId('egreso-resultado')).toHaveTextContent('EGRESO CAJA D190')
  })
})
