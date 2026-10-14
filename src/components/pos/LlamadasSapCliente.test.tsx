import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { LlamadasSapCliente } from './LlamadasSapCliente'
import type { ILlamadaSapCliente } from '@/services/api/sapClientes'

const CREAR_OK: ILlamadaSapCliente = {
  paso: 'Crear cliente', metodo: 'POST', url: 'https://sap/API_BUSINESS_PARTNER/A_BusinessPartner',
  body: { BusinessPartner: '10000025', BusinessPartnerGrouping: 'ZNAC' }, ok: true, status: 201,
  respuesta: { BusinessPartner: '10000025' },
}
const TELEFONO_ERROR: ILlamadaSapCliente = {
  paso: 'Teléfono', metodo: 'POST', url: 'https://sap/API_BUSINESS_PARTNER/A_AddressPhoneNumber',
  body: { PhoneNumber: '642123456' }, ok: false, status: 400,
  error: { error: { message: { value: 'Número de teléfono inválido' } } },
}

describe('LlamadasSapCliente', () => {
  it('no debería mostrar nada sin llamadas', () => {
    renderWithProviders(<LlamadasSapCliente llamadas={[]} />)
    expect(screen.queryByTestId('llamadas-sap-cliente')).not.toBeInTheDocument()
  })

  it('debería mostrar cada llamada con su URL, el JSON enviado y la respuesta de SAP', () => {
    renderWithProviders(<LlamadasSapCliente llamadas={[CREAR_OK, TELEFONO_ERROR]} />)
    expect(screen.getByText('Llamadas a SAP (2)')).toBeInTheDocument()
    expect(screen.getByText('1. Crear cliente')).toBeInTheDocument()
    expect(screen.getByText('OK (201)')).toBeInTheDocument()
    expect(screen.getByText('POST https://sap/API_BUSINESS_PARTNER/A_BusinessPartner')).toBeInTheDocument()
    expect(screen.getByTestId('json-enviado-0')).toHaveTextContent('"BusinessPartnerGrouping": "ZNAC"')
    expect(screen.getByTestId('json-respuesta-0')).toHaveTextContent('JSON de respuesta de SAP')
  })

  it('debería mostrar el error de SAP abierto cuando la llamada falla', () => {
    renderWithProviders(<LlamadasSapCliente llamadas={[TELEFONO_ERROR]} />)
    expect(screen.getByText('Error (400)')).toBeInTheDocument()
    const error = screen.getByTestId('json-respuesta-0')
    expect(error).toHaveAttribute('open')
    expect(error).toHaveTextContent('Número de teléfono inválido')
  })
})
