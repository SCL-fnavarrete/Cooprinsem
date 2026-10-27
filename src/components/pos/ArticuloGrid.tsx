import '@ui5/webcomponents-icons/dist/delete.js'
import '@ui5/webcomponents-icons/dist/bar-code.js'
import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import {
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Input,
  Button,
  DatePicker,
  MessageStrip,
} from '@ui5/webcomponents-react'
import type { ILineaPedido } from '@/types/pedido'
import { formatCLP } from '@/utils/format'
import { porcentajeDesdeTexto, montoDesdeTexto } from '@/utils/numeros'
import { limpiarTextoCantidad, cantidadDesdeTexto, formatCantidad, formatPrecioUnitario, esCantidadEntera } from '@/utils/cantidades'
import { hoyChileFechaEntrega, errorFechaEntrega } from '@/utils/fechaEntrega'

// Precio/subtotal de la línea según el estado de la consulta automática a SAP.
function MontoLinea({ linea, texto }: { linea: ILineaPedido; texto: string }) {
  if (linea.estadoPrecio === 'consultando') {
    return <span style={{ fontStyle: 'italic', color: 'var(--sapContent_LabelColor)' }}>Consultando…</span>
  }
  if (linea.estadoPrecio === 'error') {
    return (
      <span title={linea.errorPrecio} style={{ color: 'var(--sapNegativeTextColor)' }}>
        Sin precio
      </span>
    )
  }
  return <>{texto}</>
}

// Campos editables de la línea, en el orden de Tab (27-10-2026)
const CAMPOS = ['cantidad', 'centro', 'almacen', 'descuento', 'recargo', 'fecha'] as const
type Campo = typeof CAMPOS[number]

const MENSAJE_SERIES_ENTERAS = 'Con series asignadas la cantidad debe ser entera'

interface ArticuloGridProps {
  lineas: ILineaPedido[]
  onCantidadChange: (posicion: string, cantidad: number) => void
  onLineaChange: (posicion: string, campo: Partial<ILineaPedido>) => void
  onEliminarLinea: (posicion: string) => void
  stockInfo?: Record<string, number>
  // Abre la ventana de series de la línea (PE-23). Sin esta prop no se muestra
  // la columna Series (ej. cotizaciones: las series aplican solo a pedidos).
  onSeries?: (posicion: string) => void
  // Enter en cualquier campo de una línea vuelve al buscador para agregar otro artículo
  onVolverAlBuscador?: () => void
  // Combustible (ZV15): la fecha de entrega es siempre hoy (José, 21-10-2026)
  fechaEntregaFija?: boolean
}

export function ArticuloGrid({
  lineas,
  onCantidadChange,
  onLineaChange,
  onEliminarLinea,
  stockInfo,
  onSeries,
  onVolverAlBuscador,
  fechaEntregaFija = false,
}: ArticuloGridProps) {
  const camposRef = useRef(new Map<string, HTMLElement>())
  const prevLengthRef = useRef(lineas.length)
  // Texto de Cantidad mientras se escribe ("1," todavía no es un número)
  const [textoCantidad, setTextoCantidad] = useState<Record<string, string>>({})
  const [errorCantidad, setErrorCantidad] = useState<Record<string, string>>({})

  const claveCampo = (posicion: string, campo: Campo) => `${posicion}|${campo}`
  const registrar = (posicion: string, campo: Campo) => (el: HTMLElement | null) => {
    if (el) camposRef.current.set(claveCampo(posicion, campo), el)
    else camposRef.current.delete(claveCampo(posicion, campo))
  }
  const enfocar = (posicion: string, campo: Campo) => {
    const el = camposRef.current.get(claveCampo(posicion, campo))
    if (!el) return false
    el.focus()
    return true
  }

  // Al agregar un artículo nuevo (la lista crece), enfocar su input de Cantidad
  useEffect(() => {
    if (lineas.length > prevLengthRef.current) {
      const ultima = lineas[lineas.length - 1]
      setTimeout(() => enfocar(ultima.posicion, 'cantidad'), 100)
    }
    prevLengthRef.current = lineas.length
  }, [lineas])

  // Teclado en los campos de la línea (27-10-2026):
  // Enter → buscador de artículos · ↑/↓ → mismo campo de la línea anterior/siguiente ·
  // Tab / Shift+Tab → siguiente/anterior campo editable (salta los botones).
  const alPresionarTecla = (indiceLinea: number, campo: Campo) => (e: KeyboardEvent<HTMLElement>) => {
    // Con el calendario abierto, las flechas y Enter son del calendario
    if ((e.currentTarget as HTMLElement & { open?: boolean }).open) return
    if (e.key === 'Enter') {
      e.preventDefault()
      onVolverAlBuscador?.()
      return
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const destino = lineas[indiceLinea + (e.key === 'ArrowUp' ? -1 : 1)]
      if (destino) {
        e.preventDefault()
        enfocar(destino.posicion, campo)
      }
      return
    }
    if (e.key === 'Tab') {
      const orden = lineas.flatMap((l) => CAMPOS.map((c) => [l.posicion, c] as const))
      const actual = orden.findIndex(([p, c]) => p === lineas[indiceLinea].posicion && c === campo)
      const paso = e.shiftKey ? -1 : 1
      for (let i = actual + paso; i >= 0 && i < orden.length; i += paso) {
        if (enfocar(orden[i][0], orden[i][1])) {
          e.preventDefault()
          return
        }
      }
    }
  }

  const cambiarCantidad = (linea: ILineaPedido, entrada: HTMLInputElement) => {
    let limpio = limpiarTextoCantidad(entrada.value)
    let error = ''
    // Artículos con serie: por ahora se reconocen por tener series asignadas
    if (linea.series?.length && limpio.includes(',')) {
      limpio = limpio.split(',')[0]
      error = MENSAJE_SERIES_ENTERAS
    }
    if (entrada.value !== limpio) entrada.value = limpio
    setTextoCantidad((prev) => ({ ...prev, [linea.posicion]: limpio }))
    setErrorCantidad((prev) => ({ ...prev, [linea.posicion]: error }))
    const cantidad = cantidadDesdeTexto(limpio)
    if (cantidad > 0) onCantidadChange(linea.posicion, cantidad)
  }

  // Al salir del campo, se muestra la cantidad vigente con su formato ("1," → "1")
  const normalizarCantidad = (posicion: string) => {
    setTextoCantidad((prev) => {
      const { [posicion]: _, ...resto } = prev
      return resto
    })
  }

  if (lineas.length === 0) {
    return (
      <MessageStrip design="Information" hideCloseButton>
        Busque y agregue artículos al pedido
      </MessageStrip>
    )
  }

  const minimoFecha = hoyChileFechaEntrega()

  return (
    <Table
      headerRow={
        <TableHeaderRow>
          <TableHeaderCell>Pos</TableHeaderCell>
          <TableHeaderCell>Material</TableHeaderCell>
          <TableHeaderCell>Descripción</TableHeaderCell>
          <TableHeaderCell>Cantidad</TableHeaderCell>
          <TableHeaderCell>UM</TableHeaderCell>
          <TableHeaderCell>Centro Sum.</TableHeaderCell>
          <TableHeaderCell>Almacén</TableHeaderCell>
          <TableHeaderCell>Precio</TableHeaderCell>
          <TableHeaderCell>Desc. %</TableHeaderCell>
          <TableHeaderCell>Recargo</TableHeaderCell>
          <TableHeaderCell>Fe. Entrega</TableHeaderCell>
          <TableHeaderCell>Subtotal</TableHeaderCell>
          {onSeries && <TableHeaderCell>Series</TableHeaderCell>}
          <TableHeaderCell>Acciones</TableHeaderCell>
        </TableHeaderRow>
      }
    >
      {lineas.map((linea, indice) => {
        const stock = stockInfo?.[linea.codigoMaterial]
        const exceedsStock = stock !== undefined && linea.cantidad > stock
        const errorFecha = linea.fechaEntrega ? errorFechaEntrega(linea.fechaEntrega) : null
        const cantidadDecimal = !esCantidadEntera(linea.cantidad)
        const tecla = (campo: Campo) => alPresionarTecla(indice, campo)
        return (
          <TableRow
            key={linea.posicion}
            style={exceedsStock ? { backgroundColor: '#fff3cd' } : undefined}
          >
            <TableCell>{linea.posicion}</TableCell>
            <TableCell>{linea.codigoMaterial}</TableCell>
            <TableCell>{linea.descripcion}</TableCell>
            <TableCell>
              {/* Texto y no número: acepta coma decimal y las flechas mueven entre líneas */}
              <Input
                ref={registrar(linea.posicion, 'cantidad')}
                value={textoCantidad[linea.posicion] ?? formatCantidad(linea.cantidad)}
                onInput={(e: { target: unknown }) => cambiarCantidad(linea, e.target as HTMLInputElement)}
                onChange={() => normalizarCantidad(linea.posicion)}
                onFocus={(e) => {
                  // Seleccionar el valor para sobrescribirlo al escribir
                  const campo = e.currentTarget as HTMLElement & { getInputDOMRefSync?: () => HTMLInputElement | null }
                  setTimeout(() => campo.getInputDOMRefSync?.()?.select(), 0)
                }}
                onKeyDown={tecla('cantidad')}
                valueState={errorCantidad[linea.posicion] ? 'Critical' : 'None'}
                valueStateMessage={errorCantidad[linea.posicion] ? <div>{errorCantidad[linea.posicion]}</div> : undefined}
                style={{ width: '5rem' }}
                aria-label={`Cantidad ${linea.descripcion}`}
              />
            </TableCell>
            <TableCell>{linea.unidadMedida}</TableCell>
            <TableCell>
              <Input
                ref={registrar(linea.posicion, 'centro')}
                value={linea.centroSuministrador}
                onInput={(e: { target: { value: string } }) => onLineaChange(linea.posicion, { centroSuministrador: e.target.value })}
                onKeyDown={tecla('centro')}
                style={{ width: '5rem' }}
                placeholder="D190"
                aria-label="Centro suministrador"
              />
            </TableCell>
            <TableCell>
              <Input
                ref={registrar(linea.posicion, 'almacen')}
                value={linea.almacen}
                onInput={(e: { target: { value: string } }) => onLineaChange(linea.posicion, { almacen: e.target.value })}
                onKeyDown={tecla('almacen')}
                style={{ width: '5rem' }}
                placeholder="B000"
                aria-label="Almacén"
              />
            </TableCell>
            <TableCell><MontoLinea linea={linea} texto={formatPrecioUnitario(linea.precioUnitario)} /></TableCell>
            <TableCell>
              {/* ZD02 de posición: solo números enteros 0-100; el precio lo recalcula SAP */}
              <Input
                ref={registrar(linea.posicion, 'descuento')}
                value={linea.descuentoLinea ? String(linea.descuentoLinea) : ''}
                onInput={(e: { target: { value: string } }) => {
                  const valor = porcentajeDesdeTexto(e.target.value)
                  e.target.value = valor ? String(valor) : ''
                  onLineaChange(linea.posicion, { descuentoLinea: valor })
                }}
                onKeyDown={tecla('descuento')}
                style={{ width: '4rem' }}
                placeholder="0"
                aria-label="Descuento línea"
              />
            </TableCell>
            <TableCell>
              {/* ZFX3 (Flete Pes./Vol.): monto CLP entero; el precio lo recalcula SAP */}
              <Input
                ref={registrar(linea.posicion, 'recargo')}
                value={linea.recargo ? String(linea.recargo) : ''}
                onInput={(e: { target: { value: string } }) => {
                  const valor = montoDesdeTexto(e.target.value)
                  e.target.value = valor ? String(valor) : ''
                  onLineaChange(linea.posicion, { recargo: valor })
                }}
                onKeyDown={tecla('recargo')}
                style={{ width: '5rem' }}
                placeholder="0"
                aria-label="Recargo"
              />
            </TableCell>
            <TableCell>
              {/* Por posición, desde hoy (Chile); se escribe DD-MM-AAAA o se elige en el calendario */}
              <DatePicker
                ref={registrar(linea.posicion, 'fecha')}
                value={linea.fechaEntrega}
                formatPattern="dd-MM-yyyy"
                minDate={minimoFecha}
                readonly={fechaEntregaFija}
                onChange={(e) => onLineaChange(linea.posicion, { fechaEntrega: e.detail.value })}
                onKeyDown={tecla('fecha')}
                valueState={errorFecha ? 'Negative' : 'None'}
                valueStateMessage={errorFecha ? <div>{errorFecha}</div> : undefined}
                placeholder="DD-MM-AAAA"
                style={{ width: '9rem' }}
                aria-label="Fecha entrega"
                data-testid={`fecha-entrega-${linea.posicion}`}
              />
            </TableCell>
            <TableCell><MontoLinea linea={linea} texto={formatCLP(linea.subtotal)} /></TableCell>
            {onSeries && (
              <TableCell>
                <Button
                  icon="bar-code"
                  design={linea.series?.length ? 'Positive' : 'Default'}
                  disabled={cantidadDecimal}
                  tooltip={cantidadDecimal ? 'Las series requieren una cantidad entera' : 'Asignar números de serie'}
                  onClick={() => onSeries(linea.posicion)}
                  aria-label={`Series ${linea.descripcion}`}
                >
                  {linea.series?.length ? `${linea.series.length}/${formatCantidad(linea.cantidad)}` : 'Serie'}
                </Button>
              </TableCell>
            )}
            <TableCell>
              <Button
                icon="delete"
                design="Negative"
                tooltip="Eliminar"
                onClick={() => onEliminarLinea(linea.posicion)}
                aria-label={`Eliminar ${linea.descripcion}`}
              />
            </TableCell>
          </TableRow>
        )
      })}
    </Table>
  )
}
