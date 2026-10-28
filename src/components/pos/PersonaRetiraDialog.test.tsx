import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, act, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { PersonaRetiraDialog } from './PersonaRetiraDialog'
import { DestinatarioDialog } from './DestinatarioDialog'

const REGIONES = [{ Codigo: '10', Descripcion: 'X- De los Lagos' }, { Codigo: '13', Descripcion: 'RM- Metropolitana' }]
const DESTINATARIOS = [{ codigo: '10000046', nombre: 'CLIENTE (el cliente)' }, { codigo: '80000400', nombre: 'AGRICOLA PRUEBA' }]

function escribir(input: Element, valor: string) {
  Object.defineProperty(input, 'value', { value: valor, writable: true, configurable: true })
  fireEvent.input(input, { target: { value: valor } })
}

function elegir(select: Element, valor: string) {
  act(() => {
    select.dispatchEvent(new CustomEvent('change', { detail: { selectedOption: { dataset: { value: valor } } } }))
  })
}

const inputs = () => Array.from(document.querySelectorAll('ui5-input'))
const selects = () => Array.from(document.querySelectorAll('ui5-select'))

describe('PersonaRetiraDialog', () => {
  // Orden de los campos: RUT, Nombre, Apellido, Celular, Correo, Dirección, Comuna, Ciudad
  function llenar(rut = '12.345.678-5') {
    const [iRut, iNombre, iApellido, iCelular, , iDireccion, iComuna, iCiudad] = inputs()
    escribir(iRut, rut); escribir(iNombre, 'Pedro'); escribir(iApellido, 'Retira'); escribir(iCelular, '912345678')
    escribir(iDireccion, 'ave testing'); escribir(iComuna, 'SANTIAGO'); escribir(iCiudad, 'santiago')
    elegir(selects()[2], '13')
  }

  it('debería exigir apellido y dirección (además de RUT y nombre) sin llamar a SAP', () => {
    const onGuardar = vi.fn()
    renderWithProviders(<PersonaRetiraDialog open onGuardar={onGuardar} onCancelar={vi.fn()} regiones={REGIONES} destinatarios={DESTINATARIOS} />)
    escribir(inputs()[0], '12.345.678-5')
    escribir(inputs()[1], 'Pedro')
    fireEvent.click(screen.getByText('Crear'))
    expect(screen.getByText('Complete los campos obligatorios (*)')).toBeInTheDocument()
    expect(onGuardar).not.toHaveBeenCalled()
  })

  it('debería rechazar un RUT con dígito verificador incorrecto', () => {
    const onGuardar = vi.fn()
    renderWithProviders(<PersonaRetiraDialog open onGuardar={onGuardar} onCancelar={vi.fn()} regiones={REGIONES} destinatarios={DESTINATARIOS} />)
    llenar('12.345.678-0')
    fireEvent.click(screen.getByText('Crear'))
    expect(screen.getByText('RUT inválido. Verifique el dígito verificador.')).toBeInTheDocument()
    expect(onGuardar).not.toHaveBeenCalled()
  })

  it('debería enviar la persona con el destinatario elegido y mostrar el error de SAP', async () => {
    const onGuardar = vi.fn().mockResolvedValue('Error de SAP: crear persona que retira')
    renderWithProviders(<PersonaRetiraDialog open onGuardar={onGuardar} onCancelar={vi.fn()} regiones={REGIONES} destinatarios={DESTINATARIOS} />)
    llenar()
    elegir(selects()[0], '80000400')
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1))
    expect(onGuardar.mock.calls[0][0]).toMatchObject({
      rut: '12.345.678-5', nombre: 'Pedro', apellido: 'Retira', celular: '912345678', region: '13', destinatario: '80000400',
    })
    expect(await screen.findByText('Error de SAP: crear persona que retira')).toBeInTheDocument()
  })

  it('debería usar el cliente como destinatario por defecto', async () => {
    const onGuardar = vi.fn().mockResolvedValue(null)
    renderWithProviders(<PersonaRetiraDialog open onGuardar={onGuardar} onCancelar={vi.fn()} regiones={REGIONES} destinatarios={DESTINATARIOS} />)
    llenar()
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1))
    expect(onGuardar.mock.calls[0][0].destinatario).toBe('10000046')
  })
})

describe('DestinatarioDialog', () => {
  it('no debería pedir tratamiento ni exigir la zona de transporte', async () => {
    const onGuardar = vi.fn().mockResolvedValue(null)
    renderWithProviders(<DestinatarioDialog open onGuardar={onGuardar} onCancelar={vi.fn()} regiones={REGIONES} />)
    expect(screen.queryByText(/Tratamiento/)).not.toBeInTheDocument()
    expect(screen.getByText('Zona transporte:')).toBeInTheDocument()
    // Orden: RUT, Nombre 1, Nombre 2, Dirección, Comuna, Ciudad, Zona transporte, Correo
    const [iRut, iNombre1, , , iComuna, iCiudad] = inputs()
    escribir(iRut, '76.111.111-6'); escribir(iNombre1, 'AGRICOLA PRUEBA SPA'); escribir(iComuna, 'OSORNO'); escribir(iCiudad, 'OSORNO')
    elegir(selects()[0], '10')
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1))
    expect(onGuardar.mock.calls[0][0]).toMatchObject({ rut: '76.111.111-6', nombre1: 'AGRICOLA PRUEBA SPA', region: '10', zonaTransporte: '' })
  })
})
