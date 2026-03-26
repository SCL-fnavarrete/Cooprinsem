import { useState, useMemo, useCallback } from 'react'
import type { IArticulo } from '@/types/articulo'
import type { ICliente } from '@/types/cliente'
import type { IPedido, IPedidoHeader, ILineaPedido } from '@/types/pedido'
import type { ICrearPedidoResponse } from '@/types/pedido'
import { IVA } from '@/config/sap'
import { crearPedido } from '@/services/api/pedidos'
import { validarPedido } from '@/features/pedidos/pedidoValidation'

const HEADER_INICIAL: IPedidoHeader = {
  codigoCliente: '',
  canalDistribucion: 'Venta Mesón',
  tipoDocumento: 'Venta Normal',
  referencia: '',
  observaciones: '',
  ubicacionPredio: '',
}

export function usePedido() {
  const [header, setHeaderState] = useState<IPedidoHeader>(HEADER_INICIAL)
  const [lineas, setLineas] = useState<ILineaPedido[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null)
  const [isGrabando, setIsGrabando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ICrearPedidoResponse | null>(null)

  const setHeader = useCallback((partial: Partial<IPedidoHeader>) => {
    setHeaderState((prev) => ({ ...prev, ...partial }))
  }, [])

  const seleccionarCliente = useCallback((cliente: ICliente) => {
    setClienteSeleccionado(cliente)
    setHeaderState((prev) => ({ ...prev, codigoCliente: cliente.codigoCliente }))
  }, [])

  const deseleccionarCliente = useCallback(() => {
    setClienteSeleccionado(null)
    setHeaderState((prev) => ({ ...prev, codigoCliente: '' }))
  }, [])

  const agregarArticulo = useCallback((articulo: IArticulo) => {
    setLineas((prev) => {
      const posicion = String((prev.length + 1) * 10)
      const nuevaLinea: ILineaPedido = {
        posicion,
        codigoMaterial: articulo.codigoMaterial,
        descripcion: articulo.descripcion,
        cantidad: 1,
        unidadMedida: articulo.unidadMedida,
        precioUnitario: articulo.precioUnitario,
        subtotal: articulo.precioUnitario,
      }
      return [...prev, nuevaLinea]
    })
  }, [])

  const actualizarCantidad = useCallback((posicion: string, cantidad: number) => {
    setLineas((prev) =>
      prev.map((l) =>
        l.posicion === posicion
          ? { ...l, cantidad, subtotal: cantidad * l.precioUnitario }
          : l
      )
    )
  }, [])

  // No renumerar posiciones al eliminar (convención SAP)
  const eliminarLinea = useCallback((posicion: string) => {
    setLineas((prev) => prev.filter((l) => l.posicion !== posicion))
  }, [])

  const limpiar = useCallback(() => {
    setHeaderState(HEADER_INICIAL)
    setLineas([])
    setClienteSeleccionado(null)
    setError(null)
    setResultado(null)
  }, [])

  const { subtotal, totalIVA, total } = useMemo(() => {
    const sub = lineas.reduce((acc, l) => acc + l.subtotal, 0)
    const iva = Math.round(sub * IVA)
    return { subtotal: sub, totalIVA: iva, total: sub + iva }
  }, [lineas])

  const grabar = useCallback(async (): Promise<string> => {
    setError(null)
    setResultado(null)

    const pedido: IPedido = { header, lineas }
    const validation = validarPedido(pedido)
    if (!validation.valid) {
      const msg = validation.errors.join('. ')
      setError(msg)
      throw new Error(msg)
    }

    setIsGrabando(true)
    try {
      const res = await crearPedido(pedido)
      setResultado(res)
      return res.VBELN
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al crear pedido'
      setError(msg)
      throw err
    } finally {
      setIsGrabando(false)
    }
  }, [header, lineas])

  return {
    header,
    lineas,
    clienteSeleccionado,
    setHeader,
    seleccionarCliente,
    deseleccionarCliente,
    agregarArticulo,
    actualizarCantidad,
    eliminarLinea,
    limpiar,
    grabar,
    isGrabando,
    error,
    resultado,
    subtotal,
    totalIVA,
    total,
  }
}
