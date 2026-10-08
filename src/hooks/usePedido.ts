import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { IArticulo } from '@/types/articulo'
import type { ICliente } from '@/types/cliente'
import type { IPedido, IPedidoHeader, ILineaPedido } from '@/types/pedido'
import type { ISerieAsignada } from '@/types/serie'
import { IVA } from '@/config/sap'
import { validarPedido } from '@/features/pedidos/pedidoValidation'
import { aplicarPreciosSimulacion, aplicarPreciosPorPosicion } from '@/features/pedidos/preciosSimulacion'
import {
  simularPedidoSap,
  consultarPreciosSap,
  type IAjustesCabeceraSap,
  crearPedidoSap,
  crearCotizacionSap,
  type IPedidoSapParams,
  type ISimularPedidoResult,
  type ICrearPedidoResult,
  type ICotizacionSapParams,
  type ICrearCotizacionResult,
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
  nombreConductor: '',
  rutConductor: '',
  despacho: '',
  recargoFlete: 0,
  destinatarioMercancia: '',
  quienRetira: '',
}

// Espera tras el último cambio de la grilla antes de consultar precios a SAP
// (evita una consulta por cada tecla al escribir la cantidad).
export const ESPERA_CONSULTA_PRECIOS_MS = 500

interface IUsePedidoOpciones {
  centro?: string  // Centro para la consulta automática de precios (sucursal del usuario)
}

export function usePedido(opciones: IUsePedidoOpciones = {}) {
  const { centro } = opciones
  const [header, setHeaderState] = useState<IPedidoHeader>(HEADER_INICIAL)
  const [lineas, setLineas] = useState<ILineaPedido[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null)
  const [isGrabando, setIsGrabando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultadoSimulacion, setResultadoSimulacion] = useState<ISimularPedidoResult | null>(null)
  const [resultadoCreacion, setResultadoCreacion] = useState<ICrearPedidoResult | null>(null)
  const [isCotizando, setIsCotizando] = useState(false)
  const [resultadoCotizacion, setResultadoCotizacion] = useState<ICrearCotizacionResult | null>(null)
  // Params exactos usados en la simulación exitosa más reciente — crearPedido()
  // los reenvía tal cual al confirmar, para que la creación sea consistente con
  // lo que el usuario vio en el resumen (incluye el mismo purchaseOrderByCustomer).
  const paramsSimuladosRef = useRef<IPedidoSapParams | null>(null)
  const [isConsultandoPrecios, setIsConsultandoPrecios] = useState(false)
  const [errorPrecios, setErrorPrecios] = useState<string | null>(null)

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
          // El IVA de SAP deja de valer para la nueva cantidad — vuelve al cálculo
          // local hasta la próxima simulación.
          // Las series asignadas dejan de calzar con la nueva cantidad: se limpian
          // y hay que volver a buscarlas.
          ? { ...l, cantidad, subtotal: cantidad * l.precioUnitario, ivaSap: undefined, series: undefined }
          : l
      )
    )
  }, [])

  // Asigna (o quita, con []) las series de una línea — ventana "Series" (PE-23).
  const asignarSeries = useCallback((posicion: string, series: ISerieAsignada[]) => {
    setLineas((prev) => prev.map((l) => (l.posicion === posicion ? { ...l, series: series.length > 0 ? series : undefined } : l)))
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
    setResultadoCotizacion(null)
    paramsSimuladosRef.current = null
  }, [])

  // Descuento % y Recargo Flete de cabecera según SAP (van en los totales, no
  // en el precio de las líneas). null = sin condiciones de cabecera o sin dato.
  const [ajustesCabecera, setAjustesCabecera] = useState<IAjustesCabeceraSap | null>(null)

  // Consulta automática de precios a SAP en cada cambio de la grilla (agregar,
  // cambiar cantidad, eliminar) o de los datos que definen el precio (cliente,
  // tipo de documento, canal, centro). La "huella" incluye SOLO esos datos —
  // nunca los precios: si los incluyera, cada respuesta dispararía otra consulta.
  const huellaPrecios = useMemo(() => JSON.stringify({
    cliente: header.codigoCliente,
    tipoDocumento: header.tipoDocumento,
    canal: header.canalDistribucion,
    centro,
    // Descuentos y recargos también cambian el precio (los aplica SAP)
    descuento: header.descuentoPorcentaje,
    recargoFlete: header.recargoFlete,
    lineas: lineas.map((l) => [l.posicion, l.codigoMaterial, l.cantidad, l.descuentoLinea, l.recargo]),
  }), [header.codigoCliente, header.tipoDocumento, header.canalDistribucion, header.descuentoPorcentaje, header.recargoFlete, centro, lineas])

  // Datos vigentes para la consulta, leídos desde el efecto sin volverlo a disparar.
  const datosPreciosRef = useRef({ header, lineas, centro })
  datosPreciosRef.current = { header, lineas, centro }

  useEffect(() => {
    const { header: h, lineas: ls, centro: c } = datosPreciosRef.current
    const lineasConsulta = ls.filter((l) => l.cantidad > 0)
    if (!h.codigoCliente || lineasConsulta.length === 0) {
      setIsConsultandoPrecios(false)
      setErrorPrecios(null)
      setAjustesCabecera(null)
      return
    }

    setLineas((prev) => prev.map((l) => (l.cantidad > 0 ? { ...l, estadoPrecio: 'consultando' } : l)))
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsConsultandoPrecios(true)
      try {
        const resultado = await consultarPreciosSap({
          cliente: h.codigoCliente,
          centro: c || 'D190',
          tipoDocumento: h.tipoDocumento,
          canalDistribucion: h.canalDistribucion,
          descuentoPorcentaje: h.descuentoPorcentaje || undefined,
          recargoFlete: h.recargoFlete || undefined,
          items: lineasConsulta.map((l) => ({
            posicion: l.posicion,
            codigoMaterial: l.codigoMaterial,
            cantidad: l.cantidad,
            descuentoLinea: l.descuentoLinea || undefined,
            recargo: l.recargo || undefined,
          })),
        }, controller.signal)
        if (controller.signal.aborted) return
        if (resultado.success) {
          setLineas((prev) => aplicarPreciosPorPosicion(prev, resultado.posiciones ?? []))
          setAjustesCabecera(resultado.cabecera ?? null)
          const sinCabecera = resultado.parcial && (h.descuentoPorcentaje > 0 || h.recargoFlete > 0)
          setErrorPrecios(resultado.parcial
            ? `SAP no pudo calcular el precio de algunas líneas${sinCabecera ? ' (el descuento y el recargo flete de cabecera no se pudieron calcular)' : ''}`
            : null)
        } else {
          const mensaje = resultado.message ?? 'SAP no pudo calcular los precios'
          setLineas((prev) => prev.map((l) => (l.estadoPrecio === 'consultando' ? { ...l, estadoPrecio: 'error', errorPrecio: mensaje } : l)))
          setErrorPrecios(mensaje)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        const mensaje = err instanceof Error ? err.message : 'Error de red al consultar precios'
        setLineas((prev) => prev.map((l) => (l.estadoPrecio === 'consultando' ? { ...l, estadoPrecio: 'error', errorPrecio: mensaje } : l)))
        setErrorPrecios(mensaje)
      } finally {
        if (!controller.signal.aborted) setIsConsultandoPrecios(false)
      }
    }, ESPERA_CONSULTA_PRECIOS_MS)

    // Un cambio nuevo cancela la consulta anterior: una respuesta vieja nunca
    // pisa a una más nueva.
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [huellaPrecios])

  const { subtotal, totalIVA, total, descuentoCabecera, recargoFleteCabecera } = useMemo(() => {
    const sub = lineas.reduce((acc, l) => acc + l.subtotal, 0)
    // Descuento % y Recargo Flete de cabecera: montos de SAP, aparte del subtotal
    const descuento = ajustesCabecera?.descuento ?? 0
    const flete = ajustesCabecera?.recargoFlete ?? 0
    // IVA: el del pedido completo según SAP si hay condiciones de cabecera; si no,
    // el de SAP por línea cuando todas lo tienen; si no, cálculo local referencial.
    const todasConIvaSap = lineas.length > 0 && lineas.every((l) => l.ivaSap !== undefined)
    const iva = ajustesCabecera
      ? ajustesCabecera.iva
      : todasConIvaSap
        ? lineas.reduce((acc, l) => acc + (l.ivaSap ?? 0), 0)
        : Math.round(sub * IVA)
    return {
      subtotal: sub,
      totalIVA: iva,
      total: sub + descuento + flete + iva,
      descuentoCabecera: descuento,
      recargoFleteCabecera: flete,
    }
  }, [lineas, ajustesCabecera])

  // Fase 1 — simula el pedido (no crea nada). Devuelve el resultado (éxito o
  // rechazo de SAP) para que PedidoPage.tsx decida qué modal mostrar; retorna
  // `null` solo cuando la validación local (pedidoValidation.ts) falla antes de
  // siquiera llamar a SAP — en ese caso ya se dejó el mensaje en `error`.
  const simular = useCallback(async (idVendedor?: string, centro?: string, stockPorMaterial?: Record<string, number>, vendedorNombre?: string): Promise<ISimularPedidoResult | null> => {
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
        precioUnitario: l.precioUnitario,
        // Condiciones de precio de la posición (ZD02, ZFX3)
        descuentoLinea: l.descuentoLinea || undefined,
        recargo: l.recargo || undefined,
      })),
      // Condiciones de precio de cabecera (ZD02, ZFEM)
      descuentoPorcentaje: header.descuentoPorcentaje || undefined,
      recargoFlete: header.recargoFlete || undefined,
      centro: centro || 'D190',
      tipoDocumento: header.tipoDocumento,
      canalDistribucion: header.canalDistribucion,
      destinatarioMercancia: header.destinatarioMercancia || undefined,
      idVendedor,
      purchaseOrderByCustomer: `POS-${Date.now()}`,
      // Textos de cabecera del pedido en SAP (to_Text, solo en la creación — PE-26)
      observaciones: header.observaciones || undefined,
      ubicacionPredio: header.ubicacionPredio || undefined,
      patente: header.patente || undefined,
      nombreConductor: header.nombreConductor || undefined,
      rutConductor: header.rutConductor || undefined,
      // Denormalizados para el registro espejo local — el cliente real de SAP
      // no siempre existe en la tabla local `clientes` (ver sapPedidos.ts).
      clienteNombre: clienteSeleccionado?.nombre || undefined,
      clienteRut: clienteSeleccionado?.rut || undefined,
      condicionPago: clienteSeleccionado?.condicionPago || undefined,
      vendedorNombre: vendedorNombre || undefined,
    }
    paramsSimuladosRef.current = params

    setIsGrabando(true)
    try {
      const resultado = await simularPedidoSap(params)
      setResultadoSimulacion(resultado)
      if (resultado.success) {
        // Reflejar en la grilla los precios reales de SAP (el buscador de
        // artículos no trae precio — las líneas llegan en $0).
        // Precios de las líneas SIN descuento/recargo de cabecera (van en los totales)
        setLineas((prev) => aplicarPreciosSimulacion(prev, resultado.data?.simulacionLineas ?? resultado.data?.simulacion))
        setAjustesCabecera(resultado.cabecera ?? null)
      } else {
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
  }, [header, lineas, clienteSeleccionado])

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

  // Crea una cotización real en SAP (A_SalesQuotation) — BORRADOR pendiente de
  // confirmación de JFOG (ver server/src/routes/sapPedidos.ts). De una sola
  // fase, sin simulación previa: no hay ningún servicio de simulación de
  // cotización confirmado. Solo debe llamarse cuando header.tipoDocumento es
  // "Cotización normal" (ver PedidoPage.tsx, esCotizacion).
  const cotizar = useCallback(async (idVendedor?: string, centro?: string, vendedorNombre?: string): Promise<ICrearCotizacionResult | null> => {
    setError(null)
    setResultadoCotizacion(null)

    if (!header.codigoCliente || lineas.length === 0) {
      setError('Debe seleccionar un cliente y agregar al menos un artículo para cotizar')
      return null
    }

    const params: ICotizacionSapParams = {
      cliente: header.codigoCliente,
      items: lineas.map(l => ({
        codigoMaterial: l.codigoMaterial,
        cantidad: l.cantidad,
        unidadMedida: l.unidadMedida,
        precioUnitario: l.precioUnitario,
      })),
      centro: centro || 'D190',
      tipoDocumento: header.tipoDocumento,
      canalDistribucion: header.canalDistribucion,
      destinatarioMercancia: header.destinatarioMercancia || undefined,
      idVendedor,
      purchaseOrderByCustomer: `POS-COT-${Date.now()}`,
      // Denormalizados para el registro local (pedidos_venta) — no se envían a SAP.
      clienteNombre: clienteSeleccionado?.nombre || undefined,
      clienteRut: clienteSeleccionado?.rut || undefined,
      condicionPago: clienteSeleccionado?.condicionPago || undefined,
      vendedorNombre: vendedorNombre || undefined,
    }

    setIsCotizando(true)
    try {
      const resultado = await crearCotizacionSap(params)
      setResultadoCotizacion(resultado)
      if (!resultado.success) {
        setError(resultado.message ?? 'SAP rechazó la creación de la cotización')
      }
      return resultado
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red al crear la cotización'
      setError(msg)
      return null
    } finally {
      setIsCotizando(false)
    }
  }, [header, lineas, clienteSeleccionado])

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
    asignarSeries,
    eliminarLinea,
    limpiar,
    simular,
    crearPedido,
    cotizar,
    isGrabando,
    isCotizando,
    isConsultandoPrecios,
    errorPrecios,
    error,
    resultadoSimulacion,
    resultadoCreacion,
    resultadoCotizacion,
    subtotal,
    totalIVA,
    total,
    descuentoCabecera,
    recargoFleteCabecera,
  }
}
