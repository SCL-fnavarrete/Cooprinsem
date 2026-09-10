import type { IPedido } from '@/types/pedido'

interface ValidationResult {
  valid: boolean
  errors: string[]
}

interface ValidarPedidoOpciones {
  // Stock disponible por código de material (ver PedidoPage.tsx, stockInfo) —
  // si falta el dato para un material no se valida el tope (no se puede saber).
  stockPorMaterial?: Record<string, number>
  // Id Vendedor del usuario logueado — obligatorio (interlocutor ZA, ver
  // server/src/routes/sapPedidos.ts).
  idVendedor?: string
}

export function validarPedido(pedido: IPedido, opciones: ValidarPedidoOpciones = {}): ValidationResult {
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

  if (!pedido.header.destinatarioMercancia) {
    errors.push('Debe seleccionar un destinatario mercancía')
  }

  if (pedido.lineas.length === 0) {
    errors.push('Debe agregar al menos un artículo')
  }

  for (const linea of pedido.lineas) {
    if (linea.cantidad <= 0) {
      errors.push(`Artículo ${linea.codigoMaterial}: la cantidad debe ser mayor a 0`)
      continue
    }
    const stock = opciones.stockPorMaterial?.[linea.codigoMaterial]
    if (stock !== undefined && linea.cantidad > stock) {
      errors.push(`Artículo ${linea.codigoMaterial}: la cantidad (${linea.cantidad}) supera el stock disponible (${stock})`)
    }
  }

  if (!opciones.idVendedor) {
    errors.push('Tu usuario no tiene Id Vendedor configurado. Contacta al administrador (Admin > Usuarios).')
  }

  return { valid: errors.length === 0, errors }
}
