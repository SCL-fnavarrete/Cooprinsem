import { fireEvent, screen } from '@testing-library/react'

// UI5 Input en jsdom: se fija el value y se dispara input (userEvent.type no llega al web component)
export function setUI5InputValue(element: Element, value: string) {
  Object.defineProperty(element, 'value', { value, writable: true, configurable: true })
  fireEvent.input(element, { target: { value } })
}

// Abre el popup de una vía de pago, escribe los campos (testid medio-campo-<campo>) y acepta
export function ingresarMedio(codigo: string, campos: Record<string, string>) {
  fireEvent.click(screen.getByTestId(`btn-medio-${codigo}`))
  for (const [campo, valor] of Object.entries(campos)) {
    setUI5InputValue(screen.getByTestId(`medio-campo-${campo}`), valor)
  }
  fireEvent.click(screen.getByTestId('medio-aceptar'))
}

export const ingresarEfectivo = (monto: string) => ingresarMedio('EFECTIVO', { monto })
