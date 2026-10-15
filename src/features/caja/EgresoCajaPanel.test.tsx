import { describe, it, expect, beforeAll } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/services/mock/server'
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
    expect(screen.getByText('Devolución a cliente por NC')).toBeInTheDocument()
    expect(screen.getByTestId('paginador-egresos')).toHaveTextContent(/de 2/)
    expect(screen.getByTestId('pendientes-egreso-caja')).toHaveTextContent(/CONTABILIZACIÓN REAL ACTIVA/)
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

  it('debería contabilizar el egreso y mostrar documento SAP, usuario y descripción', async () => {
    renderWithProviders(<EgresoCajaPanel />)
    await screen.findByText('DVIANA')
    fireEvent.click(screen.getByTestId('btn-nuevo-egreso'))
    expect(screen.getByTestId('egreso-usuario')).toHaveValue('cajero.test — Cajero Test')
    setUI5InputValue(screen.getByTestId('egreso-monto'), '1000')
    setUI5InputValue(screen.getByTestId('egreso-descripcion'), 'Devolución por NC')
    expect(screen.getByTestId('egreso-descripcion-restantes')).toHaveTextContent('483 caracteres restantes')
    fireEvent.click(screen.getByTestId('btn-aceptar-egreso'))
    expect(await screen.findByTestId('egreso-resultado-mensaje')).toHaveTextContent('Documento N° 1400000085')
    expect(screen.getByTestId('egreso-resultado-usuario')).toHaveTextContent('cajero.test — Cajero Test')
    expect(screen.getByTestId('egreso-resultado-registro')).toHaveTextContent('Devolución por NC')
  })

  it('debería mostrar el JSON propuesto sin contabilizar si la contabilización está desactivada', async () => {
    server.use(http.post('http://localhost:3001/api/sap-caja/egreso', () => HttpResponse.json({
      success: false, pendiente: true, message: 'Egreso NO contabilizado ni registrado: el asiento está pendiente de confirmar con Arquitectura.',
      body: { RefDocNo: 'EGRESO CAJA D190' }, url: 'https://sap/ZCOOP_JOURNALENTRY_SRV/JournalEntryHeaderSet',
    })))
    renderWithProviders(<EgresoCajaPanel />)
    await screen.findByText('DVIANA')
    fireEvent.click(screen.getByTestId('btn-nuevo-egreso'))
    setUI5InputValue(screen.getByTestId('egreso-monto'), '70000')
    fireEvent.click(screen.getByTestId('btn-aceptar-egreso'))
    expect(await screen.findByTestId('egreso-resultado-mensaje')).toHaveTextContent(/NO contabilizado/)
    expect(screen.getByText('JSON propuesto (no enviado)')).toBeInTheDocument()
  })
})
