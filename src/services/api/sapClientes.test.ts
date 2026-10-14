import { describe, it, expect } from 'vitest'
import { crearSapCliente, type SapCrearClienteParams } from './sapClientes'

const PARAMS: SapCrearClienteParams = {
  tratamiento: 'Empresa', rut: '76.123.456-0', nombre: 'AGRICOLA PRUEBA LTDA', conceptoBusqueda: 'AGRICOLA',
  giro: 'AGRICULTURA', direccion: 'CAMINO A PUYEHUE KM 5', region: '10', ciudad: 'OSORNO', comuna: 'OSORNO',
  zonaTransporte: '0000000001',
}

describe('crearSapCliente', () => {
  it('debería devolver el cliente creado con las llamadas a SAP (JSON enviado y respuesta)', async () => {
    const r = await crearSapCliente({ ...PARAMS, telefono: '642123456' })
    expect(r.success).toBe(true)
    expect(r.businessPartner).toBe('10000025')
    expect(r.llamadas.map((ll) => ll.paso)).toEqual(['Crear cliente', 'Teléfono'])
    expect(r.llamadas[0].body).toMatchObject({ BusinessPartnerGrouping: 'ZNAC', OrganizationBPName1: 'AGRICOLA PRUEBA LTDA' })
    expect(r.llamadas[0].respuesta).toMatchObject({ BusinessPartner: '10000025' })
  })

  it('debería devolver success:false con el detalle y el JSON enviado cuando SAP rechaza (sin lanzar)', async () => {
    const r = await crearSapCliente({ ...PARAMS, nombre: 'ERROR SAP' })
    expect(r.success).toBe(false)
    expect(r.detail).toBe('El número de interlocutor 10000025 ya existe')
    expect(r.llamadas).toHaveLength(1)
    expect(r.llamadas[0].ok).toBe(false)
    expect(r.llamadas[0].body).toMatchObject({ BusinessPartner: '10000025' })
  })
})
