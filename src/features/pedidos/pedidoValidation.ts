import type { IPedido } from '@/types/pedido'

interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validarPedido(pedido: IPedido): ValidationResult {
  const errors: string[] = []

  if (!pedido.header.codigoCliente) {
    errors.push('Debe seleccionar un cliente')
  }

  if (!pedido.header.canalDistribucion) {
    errors.push('Debe seleccionar un canal de distribución')
  }

  if (!pedido.header.tipoDocumento) {
    errors.push('Debe seleccionar un tipo de documento')
  }

  if (pedido.lineas.length === 0) {
    errors.push('Debe agregar al menos un artículo')
  }

  for (const linea of pedido.lineas) {
    if (linea.cantidad <= 0) {
      errors.push(`Artículo ${linea.codigoMaterial}: la cantidad debe ser mayor a 0`)
    }
  }

  return { valid: errors.length === 0, errors }
}
