import { useState, useCallback, useEffect, useMemo } from 'react'
import type { ICliente } from '@/types/cliente'
import type { IPartidaAbierta, IResultadoCobro } from '@/types/caja'
import type { IPagoEntry } from '@/types/pago'
import { getCliente } from '@/services/api/clientes'
import { getPartidasAbiertas } from '@/services/api/facturas'
import { registrarCobroEfectivo } from '@/services/api/cobros'

interface UsePagoDetalleParams {
  kunnr: string
  belnrPreseleccionado: string
}

export function usePagoDetalle({ kunnr, belnrPreseleccionado }: UsePagoDetalleParams) {
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

    getCliente(kunnr)
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
  }, [kunnr])

  // Cargar partidas del cliente y pre-seleccionar belnr
  useEffect(() => {
    if (!kunnr) return
    let cancelled = false
    setIsLoadingPartidas(true)
    setErrorPartidas(null)

    getPartidasAbiertas(kunnr)
      .then((data) => {
        if (!cancelled) {
          setPartidas(data)
          // Pre-seleccionar el documento del doble clic
          if (belnrPreseleccionado && data.some(p => p.belnr === belnrPreseleccionado)) {
            setSelectedBelnrs([belnrPreseleccionado])
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
  }, [kunnr, belnrPreseleccionado])

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
    setSelectedBelnrs(prev =>
      prev.includes(belnr)
        ? prev.filter(b => b !== belnr)
        : [...prev, belnr]
    )
  }, [])

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
  }, [kunnr, selectedBelnrs, totalAPagar, totalPagado])

  return {
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
