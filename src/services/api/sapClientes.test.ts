import { describe, it, expect } from 'vitest'
import {
  crearSapCliente, crearSapDestinatario, vincularSapDestinatario, crearSapPersonaRetira, vincularSapPersonaRetira,
  type SapCrearClienteParams,
} from './sapClientes'

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

describe('crearSapDestinatario / crearSapPersonaRetira', () => {
  const DEST = { rut: '76.111.111-1', nombre1: 'AGRICOLA PRUEBA SPA', region: '10', comuna: 'OSORNO', ciudad: 'OSORNO' }
  const PER = { rut: '12.345.678-5', nombre: 'Pedro', apellido: 'Retira', direccion: 'ave testing', region: '13', comuna: 'SANTIAGO', ciudad: 'santiago' }

  it('debería devolver el destinatario creado y vinculado', async () => {
    const r = await crearSapDestinatario('10000046', DEST)
    expect(r).toMatchObject({ success: true, numero: '80000400', vinculado: true })
    expect(r.llamadas.map((ll) => ll.paso)).toEqual(['Crear destinatario', 'Vincular WE 80000400 a 10000046'])
  })

  it('debería avisar cuando el destinatario se creó pero quedó sin vincular, y reintentar solo el vínculo', async () => {
    const r = await crearSapDestinatario('10000046', { ...DEST, nombre1: 'SIN VINCULO' })
    expect(r).toMatchObject({ success: true, numero: '80000400', vinculado: false })
    const v = await vincularSapDestinatario('10000046', '80000400')
    expect(v).toMatchObject({ success: true, vinculado: true })
  })

  it('debería devolver success:false con el detalle cuando SAP rechaza el destinatario (sin lanzar)', async () => {
    const r = await crearSapDestinatario('10000046', { ...DEST, nombre1: 'ERROR SAP' })
    expect(r).toMatchObject({ success: false, vinculado: false, detail: 'RUT duplicado' })
    expect(r.numero).toBeUndefined()
  })

  it('debería crear la persona que retira y reintentar su vínculo con el destinatario', async () => {
    const r = await crearSapPersonaRetira('10000046', PER, '80000400')
    expect(r).toMatchObject({ success: true, numero: '90001500', vinculado: true })
    const v = await vincularSapPersonaRetira('10000046', '90001500', '80000400')
    expect(v.message).toBe('Persona que retira 90001500 creada y vinculada en SAP')
  })
})
