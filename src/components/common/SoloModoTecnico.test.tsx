import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { SoloModoTecnico } from './SoloModoTecnico'
import { JsonCopiable } from './JsonCopiable'

const NEGOCIO = { id: 'negocio', nombre: 'Usuario Negocio', rolCod: 3 as const, sucursal: 'D190' }

describe('SoloModoTecnico', () => {
  it('debería mostrar el contenido a un usuario en modo técnico', () => {
    renderWithProviders(<SoloModoTecnico><span>aviso técnico</span></SoloModoTecnico>)
    expect(screen.getByText('aviso técnico')).toBeInTheDocument()
  })

  it('debería ocultar el contenido a un usuario de negocio', () => {
    renderWithProviders(<SoloModoTecnico><span>aviso técnico</span></SoloModoTecnico>, { user: NEGOCIO })
    expect(screen.queryByText('aviso técnico')).not.toBeInTheDocument()
  })

  it('debería ocultar los bloques JSON a un usuario de negocio', () => {
    renderWithProviders(<JsonCopiable titulo="JSON enviado a SAP" valor={{ a: 1 }} />, { user: NEGOCIO })
    expect(screen.queryByText('JSON enviado a SAP')).not.toBeInTheDocument()
  })
})
