// Comprobante del pedido según su clase SAP (definición del usuario, 22-10-2026).
// Reemplaza el select "Boleta / Factura" de Nuevo Pedido. Misma regla en el
// backend: server/src/routes/comprobante.ts (mantener alineadas).
//   Boleta:      ZV01 Venta normal, ZV02 Venta Boleta
//   Factura:     ZV04 Puesto Fundo, ZV06 Calzada, ZV07 Anticipada, ZV15 Combustible
//   Por definir: el resto (Cotización, Notas de crédito/débito)
import { CLIENTE_BOLETA } from './sap'

export type Comprobante = 'Boleta' | 'Factura' | 'Por definir'

export const CLASES_BOLETA: readonly string[] = ['ZV01', 'ZV02']
export const CLASES_FACTURA: readonly string[] = ['ZV04', 'ZV06', 'ZV07', 'ZV15']
// Clase que se elige al usar el Cliente Boleta con un tipo que no es boleta
export const CLASE_VENTA_NORMAL = 'ZV01'

// Clases que se facturan automáticamente (pedido → factura → folio, ADR-033).
// Vacío: las boletas no se facturan y las facturas esperan que SAP confirme el proceso.
export const CLASES_FACTURACION_AUTOMATICA: readonly string[] = []

const normalizar = (clase?: string | null) => (clase ?? '').trim().toUpperCase()

export function comprobanteDeClase(clase?: string | null): Comprobante {
  const c = normalizar(clase)
  if (CLASES_BOLETA.includes(c)) return 'Boleta'
  if (CLASES_FACTURA.includes(c)) return 'Factura'
  return 'Por definir'
}

export const esClienteBoleta = (codigoCliente?: string | null) => (codigoCliente ?? '').trim().replace(/^0+/, '') === CLIENTE_BOLETA

/** El Cliente Boleta (999999) solo se usa en ventas boleta. */
export const clienteBoletaNoPermitido = (codigoCliente?: string | null, clase?: string | null) =>
  esClienteBoleta(codigoCliente) && comprobanteDeClase(clase) !== 'Boleta'

/** ¿Se factura automáticamente al crear el pedido? Hoy ninguna clase. */
export const correspondeFacturar = (clase?: string | null) => CLASES_FACTURACION_AUTOMATICA.includes(normalizar(clase))
