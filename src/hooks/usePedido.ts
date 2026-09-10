import { useState, useMemo, useCallback } from 'react'
import type { IArticulo } from '@/types/articulo'
import type { ICliente } from '@/types/cliente'
import type { IPedido, IPedidoHeader, ILineaPedido } from '@/types/pedido'
import { IVA } from '@/config/sap'
import { validarPedido } from '@/features/pedidos/pedidoValidation'
import { validarPedidoSap, type IValidarPedidoResult } from '@/services/api/sapPedidos'

const HEADER_INICIAL: IPedidoHeader = {
  codigoCliente: '',
  canalDistribucion: 'Venta Mesón',
  // Debe coincidir EXACTO con pos_documento_venta.descripcion (usado para resolver
  // el SalesOrderType real en /api/sap-pedidos/validar) — la BD real usa "Venta normal"
  // (n minúscula), no "Venta Normal". Ver PedidoHeader.tsx, que lee esta tabla directo.
  tipoDocumento: 'Venta normal',
  referencia: '',
  observaciones: '',
  ubicacionPredio: '',
  retira: '',
  descuentoPorcentaje: 0,
  patente: '',
  despacho: '',
  recargoFlete: 0,
  destinatarioMercancia: '',
  quienRetira: '',
}

export function usePedido() {
  const [header, setHeaderState] = useState<IPedidoHeader>(HEADER_INICIAL)
  const [lineas, setLineas] = useState<ILineaPedido[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null)
  const [isGrabando, setIsGrabando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<IValidarPedidoResult | null>(null)

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
        centroSuministrador: '',
        almacen: '',
        recargo: 0,
        descuentoLinea: 0,
        fechaEntrega: '',
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

  const cambiarLinea = useCallback((posicion: string, campo: Partial<ILineaPedido>) => {
    setLineas((prev) => prev.map((l) => l.posicion === posicion ? { ...l, ...campo } : l))
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

  const grabar = useCallback(async (idVendedor?: string, centro?: string, stockPorMaterial?: Record<string, number>): Promise<void> => {
    setError(null)
    setResultado(null)

    const pedido: IPedido = { header, lineas }
    const validation = validarPedido(pedido, { stockPorMaterial, idVendedor })
    if (!validation.valid) {
      const msg = validation.errors.join('. ')
      setError(msg)
      throw new Error(msg)
    }

    setIsGrabando(true)
    try {
      let resultadoSap: IValidarPedidoResult
      try {
        resultadoSap = await validarPedidoSap({
          cliente: header.codigoCliente,
          items: lineas.map(l => ({
            codigoMaterial: l.codigoMaterial,
            cantidad: l.cantidad,
            unidadMedida: l.unidadMedida,
          })),
          centro: centro || 'D190',
          tipoDocumento: header.tipoDocumento,
          canalDistribucion: header.canalDistribucion,
          destinatarioMercancia: header.destinatarioMercancia || undefined,
          idVendedor,
        })
      } catch (err) {
        // Error de red/parseo real (no un success:false de SAP) — no hay JSON
        // crudo que mostrar.
        const msg = err instanceof Error ? err.message : 'Error desconocido al validar pedido'
        setError(msg)
        throw err
      }

      // Se guarda siempre, exitoso o no — la UI (PedidoPage.tsx) usa `resultado`
      // para mostrar el JSON crudo de la respuesta de SAP en ambos casos.
      setResultado(resultadoSap)
      if (!resultadoSap.success) {
        const msg = resultadoSap.message ?? 'Error al procesar el pedido en SAP'
        setError(msg)
        // Marcador para que PedidoPage.tsx sepa que SAP sí respondió (hay JSON
        // crudo en `resultado`) en vez de un error de validación local.
        throw Object.assign(new Error(msg), { sapRespondio: true })
      }
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
    cambiarLinea,
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
