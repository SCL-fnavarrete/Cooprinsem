import { useState, useMemo, useCallback, useRef } from 'react'
import type { IArticulo } from '@/types/articulo'
import type { ICliente } from '@/types/cliente'
import type { IPedido, IPedidoHeader, ILineaPedido } from '@/types/pedido'
import { IVA } from '@/config/sap'
import { validarPedido } from '@/features/pedidos/pedidoValidation'
import {
  simularPedidoSap,
  crearPedidoSap,
  type IPedidoSapParams,
  type ISimularPedidoResult,
  type ICrearPedidoResult,
} from '@/services/api/sapPedidos'

const HEADER_INICIAL: IPedidoHeader = {
  codigoCliente: '',
  canalDistribucion: 'Venta Mesón',
  // Debe coincidir EXACTO con pos_documento_venta.descripcion (usado para resolver
  // el SalesOrderType real en /api/sap-pedidos/simular) — la BD real usa "Venta normal"
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
  const [resultadoSimulacion, setResultadoSimulacion] = useState<ISimularPedidoResult | null>(null)
  const [resultadoCreacion, setResultadoCreacion] = useState<ICrearPedidoResult | null>(null)
  // Params exactos usados en la simulación exitosa más reciente — crearPedido()
  // los reenvía tal cual al confirmar, para que la creación sea consistente con
  // lo que el usuario vio en el resumen (incluye el mismo purchaseOrderByCustomer).
  const paramsSimuladosRef = useRef<IPedidoSapParams | null>(null)

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
    setResultadoSimulacion(null)
    setResultadoCreacion(null)
    paramsSimuladosRef.current = null
  }, [])

  const { subtotal, totalIVA, total } = useMemo(() => {
    const sub = lineas.reduce((acc, l) => acc + l.subtotal, 0)
    const iva = Math.round(sub * IVA)
    return { subtotal: sub, totalIVA: iva, total: sub + iva }
  }, [lineas])

  // Fase 1 — simula el pedido (no crea nada). Devuelve el resultado (éxito o
  // rechazo de SAP) para que PedidoPage.tsx decida qué modal mostrar; retorna
  // `null` solo cuando la validación local (pedidoValidation.ts) falla antes de
  // siquiera llamar a SAP — en ese caso ya se dejó el mensaje en `error`.
  const simular = useCallback(async (idVendedor?: string, centro?: string, stockPorMaterial?: Record<string, number>): Promise<ISimularPedidoResult | null> => {
    setError(null)
    setResultadoSimulacion(null)
    setResultadoCreacion(null)

    const pedido: IPedido = { header, lineas }
    const validation = validarPedido(pedido, { stockPorMaterial, idVendedor })
    if (!validation.valid) {
      setError(validation.errors.join('. '))
      return null
    }

    const params: IPedidoSapParams = {
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
      purchaseOrderByCustomer: `POS-${Date.now()}`,
    }
    paramsSimuladosRef.current = params

    setIsGrabando(true)
    try {
      const resultado = await simularPedidoSap(params)
      setResultadoSimulacion(resultado)
      if (!resultado.success) {
        setError(resultado.message ?? 'SAP rechazó la simulación del pedido')
      }
      return resultado
    } catch (err) {
      // Error de red/parseo real (no un success:false de SAP) — no hay JSON
      // crudo que mostrar.
      const msg = err instanceof Error ? err.message : 'Error de red al simular el pedido'
      setError(msg)
      return null
    } finally {
      setIsGrabando(false)
    }
  }, [header, lineas])

  // Fase 2 — crea el pedido real en SAP, reenviando los mismos params usados en
  // la última simulación exitosa (ver simular()). Debe llamarse solo tras
  // confirmación explícita del usuario en el modal de resumen.
  const crearPedido = useCallback(async (): Promise<ICrearPedidoResult | null> => {
    const params = paramsSimuladosRef.current
    if (!params) {
      setError('No hay una simulación previa para confirmar — vuelve a intentar Grabar.')
      return null
    }

    setIsGrabando(true)
    try {
      const resultado = await crearPedidoSap(params)
      setResultadoCreacion(resultado)
      if (!resultado.success) {
        setError(resultado.message ?? 'SAP rechazó la creación del pedido')
      }
      return resultado
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red al crear el pedido'
      setError(msg)
      return null
    } finally {
      setIsGrabando(false)
    }
  }, [])

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
    simular,
    crearPedido,
    isGrabando,
    error,
    resultadoSimulacion,
    resultadoCreacion,
    subtotal,
    totalIVA,
    total,
  }
}
