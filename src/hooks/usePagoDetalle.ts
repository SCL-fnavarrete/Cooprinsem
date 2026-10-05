import { useState, useCallback, useEffect, useMemo } from 'react'
import type { ICliente } from '@/types/cliente'
import type { IPartidaAbierta, IResultadoCobro } from '@/types/caja'
import type { IPagoEntry } from '@/types/pago'
import { getCliente } from '@/services/api/clientes'
import { getPartidasAbiertas } from '@/services/api/facturas'
import { registrarCobroEfectivo } from '@/services/api/cobros'
import { buscarClientesSapTabla } from '@/services/api/clientes'
import { getPartidasCtaCte, previewPagoCtaCte, registrarPagoCtaCte } from '@/services/api/sapCtaCte'
import { clavePartidaCtaCte, motivoNoPagable, type IPartidaCtaCte, type IPagoCtaCteParams, type IPreviewPagoCtaCte, type IResultadoPagoCtaCte } from '@/types/ctaCte'

// Partida SAP (Pago Cta. Cte.) en el formato de la pantalla de pago.
function partidaSapAPago(p: IPartidaCtaCte): IPartidaAbierta {
  return {
    belnr: clavePartidaCtaCte(p),
    etiqueta: p.documento,
    kunnr: '',
    claseDoc: p.tipoDocumento,
    fechaDoc: p.fechaDocumento,
    fechaVenc: p.fechaVencimiento,
    importe: p.monto,
    estado: p.diasMora > 0 ? 'VENCIDO' : 'ABIERTO',
    diasMora: Math.max(0, p.diasMora),
    semaforo: p.diasMora > 0 ? 'rojo' : p.diasMora >= -7 ? 'amarillo' : 'verde',
    motivoNoSeleccionable: motivoNoPagable(p) ?? undefined,
  }
}

interface UsePagoDetalleParams {
  // 'sap' = partidas de SAP (Caja > Pago Cta. Cte.): cliente desde Sap_cliente y
  // partidas desde FAR_CUSTOMER_LINE_ITEMS. El pago se contabiliza en SAP con
  // prepararPagoSap() + confirmarPagoSap() (ejecutarPago() es solo modo local).
  fuente?: 'local' | 'sap'
  kunnr: string
  belnrPreseleccionado: string
  belnrsPreseleccionados?: string[]
}

export function usePagoDetalle({ kunnr, belnrPreseleccionado, belnrsPreseleccionados, fuente = 'local' }: UsePagoDetalleParams) {
  const [cliente, setCliente] = useState<ICliente | null>(null)
  const [isLoadingCliente, setIsLoadingCliente] = useState(false)
  const [errorCliente, setErrorCliente] = useState<string | null>(null)

  const [partidas, setPartidas] = useState<IPartidaAbierta[]>([])
  const [isLoadingPartidas, setIsLoadingPartidas] = useState(false)
  const [errorPartidas, setErrorPartidas] = useState<string | null>(null)

  const [selectedBelnrs, setSelectedBelnrs] = useState<string[]>([])
  const [pagoEntries, setPagoEntries] = useState<IPagoEntry[]>([])

  const [isCobrando, setIsCobrando] = useState(false)
  const [errorCobro, setErrorCobro] = useState<string | null>(null)
  const [resultadoCobro, setResultadoCobro] = useState<IResultadoCobro | null>(null)

  // Cargar cliente
  useEffect(() => {
    if (!kunnr) return
    let cancelled = false
    setIsLoadingCliente(true)
    setErrorCliente(null)

    const cargarCliente = fuente === 'sap'
      ? buscarClientesSapTabla(kunnr).then((r) => {
          const encontrado = r.find((c) => c.codigoCliente === kunnr)
          if (!encontrado) throw new Error(`Cliente ${kunnr} no encontrado en el maestro de clientes SAP`)
          return encontrado
        })
      : getCliente(kunnr)
    cargarCliente
      .then((data) => {
        if (!cancelled) setCliente(data)
      })
      .catch((err) => {
        if (!cancelled) setErrorCliente(err instanceof Error ? err.message : 'Error cargando cliente')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCliente(false)
      })

    return () => { cancelled = true }
  }, [kunnr, fuente])

  // Cargar partidas del cliente y pre-seleccionar belnr
  useEffect(() => {
    if (!kunnr) return
    let cancelled = false
    setIsLoadingPartidas(true)
    setErrorPartidas(null)

    const cargarPartidas = fuente === 'sap'
      ? getPartidasCtaCte({ cliente: kunnr }).then((r) => {
          if (!r.success) throw new Error(r.message ?? 'No se pudieron consultar las partidas abiertas en SAP')
          return (r.data ?? []).map(partidaSapAPago)
        })
      : getPartidasAbiertas(kunnr)
    cargarPartidas
      .then((data) => {
        if (!cancelled) {
          // Si vienen documentos específicos desde la lista, solo mostrar esos
          if (belnrsPreseleccionados && belnrsPreseleccionados.length > 0) {
            const filtradas = data.filter(p => belnrsPreseleccionados.includes(p.belnr))
            setPartidas(filtradas)
            setSelectedBelnrs(belnrsPreseleccionados.filter(b => filtradas.some(p => p.belnr === b && !p.motivoNoSeleccionable)))
          } else {
            setPartidas(data)
            if (belnrPreseleccionado && data.some(p => p.belnr === belnrPreseleccionado)) {
              setSelectedBelnrs([belnrPreseleccionado])
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setErrorPartidas(err instanceof Error ? err.message : 'Error cargando partidas')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPartidas(false)
      })

    return () => { cancelled = true }
  }, [kunnr, belnrPreseleccionado, belnrsPreseleccionados, fuente])

  // Totales
  const totalAPagar = useMemo(
    () => partidas
      .filter(p => selectedBelnrs.includes(p.belnr))
      .reduce((acc, p) => acc + p.importe, 0),
    [partidas, selectedBelnrs]
  )

  const totalPagado = useMemo(
    () => pagoEntries
      .filter(e => e.tipoPago !== 'VUELTO EFECTIVO')
      .reduce((acc, e) => acc + e.monto, 0),
    [pagoEntries]
  )

  const totalADevolver = useMemo(
    () => Math.max(0, totalPagado - totalAPagar),
    [totalPagado, totalAPagar]
  )

  const togglePartida = useCallback((belnr: string) => {
    // Partidas bloqueadas o abonos (SAP) no se pueden seleccionar.
    if (partidas.find(p => p.belnr === belnr)?.motivoNoSeleccionable) return
    setSelectedBelnrs(prev =>
      prev.includes(belnr)
        ? prev.filter(b => b !== belnr)
        : [...prev, belnr]
    )
  }, [partidas])

  const agregarPagoEfectivo = useCallback((montoRecibido: number) => {
    const hoy = new Date().toLocaleDateString('es-CL')
    const entradas: IPagoEntry[] = [
      {
        id: `ef-${Date.now()}`,
        tipoPago: 'EFECTIVO',
        numero: '',
        fecha: hoy,
        cuota: '',
        monto: montoRecibido,
      },
    ]
    // Si hay vuelto, agregar fila de vuelto
    const vuelto = montoRecibido - totalAPagar
    if (vuelto > 0) {
      entradas.push({
        id: `vuelto-${Date.now()}`,
        tipoPago: 'VUELTO EFECTIVO',
        numero: '',
        fecha: hoy,
        cuota: '',
        monto: -vuelto,
      })
    }
    setPagoEntries(entradas)
  }, [totalAPagar])

  const limpiarPagos = useCallback(() => {
    setPagoEntries([])
  }, [])

  const ejecutarPago = useCallback(async (): Promise<IResultadoCobro> => {
    if (fuente === 'sap') throw new Error('Registro del pago en SAP pendiente de API')
    if (!kunnr) throw new Error('No hay cliente')
    if (selectedBelnrs.length === 0) throw new Error('No hay documentos seleccionados')
    if (totalPagado < totalAPagar) throw new Error('Monto pagado insuficiente')

    setIsCobrando(true)
    setErrorCobro(null)
    try {
      const resultado = await registrarCobroEfectivo({
        kunnr,
        monto: totalAPagar,
        montoRecibido: totalPagado,
        medio_pago: 'EFECTIVO',
        belnrs_cancelados: selectedBelnrs,
      })
      setResultadoCobro(resultado)
      return resultado
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error registrando cobro'
      setErrorCobro(msg)
      throw err
    } finally {
      setIsCobrando(false)
    }
  }, [kunnr, selectedBelnrs, totalAPagar, totalPagado, fuente])

  // ── Pago real en SAP (fuente 'sap') ───────────────────────────────────────
  // belnr de cada partida SAP = "documento-posicion-ejercicio" (clavePartidaCtaCte)
  const paramsPagoSap = useCallback((sucursal: string): IPagoCtaCteParams => ({
    cliente: kunnr,
    sucursal,
    partidas: selectedBelnrs.map((clave) => {
      const [documento, posicion, ejercicio] = clave.split('-')
      return { documento, posicion, ejercicio }
    }),
  }), [kunnr, selectedBelnrs])

  const [isProcesandoPagoSap, setIsProcesandoPagoSap] = useState(false)

  // Body del pago sin contabilizar (para el modal de confirmación).
  const prepararPagoSap = useCallback(async (sucursal: string): Promise<IPreviewPagoCtaCte> => {
    setIsProcesandoPagoSap(true)
    try {
      return await previewPagoCtaCte(paramsPagoSap(sucursal))
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Error de red al preparar el pago' }
    } finally {
      setIsProcesandoPagoSap(false)
    }
  }, [paramsPagoSap])

  // Contabiliza el pago en SAP. Devuelve siempre el resultado (éxito o rechazo).
  const confirmarPagoSap = useCallback(async (sucursal: string): Promise<IResultadoPagoCtaCte> => {
    if (totalPagado < totalAPagar) return { success: false, message: 'Monto pagado insuficiente' }
    setIsProcesandoPagoSap(true)
    try {
      return await registrarPagoCtaCte(paramsPagoSap(sucursal))
    } catch (err) {
      return { success: false, incierto: true, message: err instanceof Error ? `Error de red al contabilizar: ${err.message}` : 'Error de red al contabilizar el pago' }
    } finally {
      setIsProcesandoPagoSap(false)
    }
  }, [paramsPagoSap, totalPagado, totalAPagar])

  return {
    prepararPagoSap,
    confirmarPagoSap,
    isProcesandoPagoSap,
    cliente,
    isLoadingCliente,
    errorCliente,
    partidas,
    isLoadingPartidas,
    errorPartidas,
    selectedBelnrs,
    togglePartida,
    pagoEntries,
    agregarPagoEfectivo,
    limpiarPagos,
    totalAPagar,
    totalPagado,
    totalADevolver,
    ejecutarPago,
    isCobrando,
    errorCobro,
    resultadoCobro,
  }
}
