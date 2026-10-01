import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import type { ILineaPedido } from '@/types/pedido'
import { SeriesDialog } from './SeriesDialog'

const linea: ILineaPedido = {
  posicion: '10', codigoMaterial: '11000074', descripcion: 'ALLFLEX DIIO ELECT HDX UNIDAD', cantidad: 5,
  unidadMedida: 'PC', precioUnitario: 0, subtotal: 0, centroSuministrador: '', almacen: '',
  recargo: 0, descuentoLinea: 0, fechaEntrega: '',
}

function escribir(label: string, valor: string) {
  const input = screen.getByLabelText(label) as HTMLInputElement
  input.value = valor
  fireEvent.input(input, { target: { value: valor } })
}

function renderDialog(onConfirmar = vi.fn()) {
  renderWithProviders(
    <SeriesDialog open linea={linea} centro="D190" usadasEnOtrasLineas={new Set()} onConfirmar={onConfirmar} onCancelar={vi.fn()} />
  )
  return onConfirmar
}

describe('SeriesDialog', () => {
  it('debería asignar las primeras 5 series libres y permitir confirmar', async () => {
    const onConfirmar = renderDialog()
    // 25601496–25601502: la 25601497 viene "no disponible" en el mock (termina en 7)
    escribir('Serie desde', '25601496')
    escribir('Serie hasta', '25601502')
    fireEvent.click(screen.getByText('Buscar'))

    await waitFor(() => expect(screen.getByText(/5 de 5 series asignadas/)).toBeInTheDocument())
    fireEvent.click(screen.getByText('Confirmar'))
    expect(onConfirmar).toHaveBeenCalledWith('10', expect.any(Array))
    const series = onConfirmar.mock.calls[0][1] as { numeroSerie: string }[]
    expect(series.map((s) => s.numeroSerie)).toEqual(['25601496', '25601498', '25601499', '25601500', '25601501'])
  })

  it('debería mostrar error y no confirmar cuando el rango no alcanza', async () => {
    const onConfirmar = renderDialog()
    escribir('Serie desde', '25601496')
    escribir('Serie hasta', '25601500')
    fireEvent.click(screen.getByText('Buscar'))

    await waitFor(() => expect(screen.getByText(/Se requieren 5 series y el rango tiene 4 disponibles/)).toBeInTheDocument())
    fireEvent.click(screen.getByText('Confirmar'))
    expect(onConfirmar).not.toHaveBeenCalled()
  })
})
