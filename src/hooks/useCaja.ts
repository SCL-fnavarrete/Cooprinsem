import { useState, useCallback, useEffect, useMemo } from 'react'
import type { ICliente } from '@/types/cliente'
import type { IPartidaAbierta, IResultadoCobro, Semaforo } from '@/types/caja'
import { getPartidasAbiertas } from '@/services/api/facturas'
import { registrarCobroEfectivo } from '@/services/api/cobros'

export function useCaja() {
  // Todas las partidas cargadas al montar (sin filtro de cliente)
  const [todasPartidas, setTodasPartidas] = useState<IPartidaAbierta[]>([])
  const [isLoadingPartidas, setIsLoadingPartidas] = useState(false)
  const [errorPartidas, setErrorPartidas] = useState<string | null>(null)

  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroDocumento, setFiltroDocumento] = useState('')
  const [filtroPedido, setFiltroPedido] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<Semaforo | ''>('')
  const [partidasSeleccionadas, setPartidasSeleccionadas] = useState<string[]>([])
  const [isCobrando, setIsCobrando] = useState(false)
  const [errorCobro, setErrorCobro] = useState<string | null>(null)
  const [resultadoCobro, setResultadoCobro] = useState<IResultadoCobro | null>(null)

  // Cargar partidas al montar y cuando cambie filtroEstado a/desde 'pagada'
  const necesitaPagadas = filtroEstado === 'pagada'
  useEffect(() => {
    let cancelled = false
    setIsLoadingPartidas(true)
    setErrorPartidas(null)

    getPartidasAbiertas(undefined, necesitaPagadas)
      .then((data) => {
        if (!cancelled) setTodasPartidas(data)
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Error cargando partidas'
          setErrorPartidas(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPartidas(false)
      })

    return () => { cancelled = true }
  }, [necesitaPagadas])

  // Partidas filtradas: por los 4 filtros individuales y/o estado
  const partidas = useMemo(() => {
    let result = todasPartidas

    if (clienteSeleccionado) {
      result = result.filter((p) => p.kunnr === clienteSeleccionado.codigoCliente)
    } else {
      if (filtroCliente.trim()) {
        const q = filtroCliente.toLowerCase()
        result = result.filter((p) => p.kunnr.toLowerCase().includes(q))
      }
      if (filtroNombre.trim()) {
        const q = filtroNombre.toLowerCase()
        result = result.filter((p) => (p.nombreCliente ?? '').toLowerCase().includes(q))
      }
      if (filtroDocumento.trim()) {
        const q = filtroDocumento.toLowerCase()
        result = result.filter((p) => p.belnr.toLowerCase().includes(q))
      }
      if (filtroPedido.trim()) {
        const q = filtroPedido.toLowerCase()
        result = result.filter((p) => (p.vbeln ?? '').toLowerCase().includes(q))
      }
    }

    if (filtroEstado) {
      result = result.filter((p) => p.semaforo === filtroEstado)
    }

    return result
  }, [todasPartidas, clienteSeleccionado, filtroCliente, filtroNombre, filtroDocumento, filtroPedido, filtroEstado])

  // Al seleccionar cliente, filtrar y limpiar selección
  const seleccionarCliente = useCallback((cliente: ICliente) => {
    setClienteSeleccionado(cliente)
    setFiltroCliente('')
    setFiltroNombre('')
    setFiltroDocumento('')
    setFiltroPedido('')
    setPartidasSeleccionadas([])
    setErrorCobro(null)
    setResultadoCobro(null)
  }, [])

  const deseleccionarCliente = useCallback(() => {
    setClienteSeleccionado(null)
    setFiltroCliente('')
    setFiltroNombre('')
    setFiltroDocumento('')
    setFiltroPedido('')
    setPartidasSeleccionadas([])
    setErrorCobro(null)
    setResultadoCobro(null)
  }, [])

  // Limpiar todos los filtros
  const limpiarFiltros = useCallback(() => {
    setClienteSeleccionado(null)
    setFiltroCliente('')
    setFiltroNombre('')
    setFiltroDocumento('')
    setFiltroPedido('')
    setFiltroEstado('')
    setPartidasSeleccionadas([])
  }, [])

  const togglePartida = useCallback((belnr: string) => {
    setPartidasSeleccionadas((prev) =>
      prev.includes(belnr)
        ? prev.filter((b) => b !== belnr)
        : [...prev, belnr]
    )
  }, [])

  // Derivar kunnr desde partidas seleccionadas (auto-detectar cliente)
  const clienteDerivado = useMemo(() => {
    if (partidasSeleccionadas.length === 0) return null
    // Buscar en partidas filtradas primero, luego en todas
    const seleccionadas = partidas.filter(p => partidasSeleccionadas.includes(p.belnr))
    const all = seleccionadas.length >= partidasSeleccionadas.length
      ? seleccionadas
      : todasPartidas.filter(p => partidasSeleccionadas.includes(p.belnr))
    const kunnrs = [...new Set(all.map(p => p.kunnr))]
    if (kunnrs.length === 0) return null
    if (kunnrs.length > 1) return 'MULTIPLE' as const
    return { kunnr: kunnrs[0] }
  }, [partidasSeleccionadas, partidas, todasPartidas])

  // Monto total de las partidas seleccionadas
  const totalSeleccionado = partidas
    .filter((p) => partidasSeleccionadas.includes(p.belnr))
    .reduce((acc, p) => acc + p.importe, 0)

  const confirmarCobroEfectivo = useCallback(
    async (montoRecibido: number): Promise<IResultadoCobro> => {
      const kunnr = clienteSeleccionado?.codigoCliente
        ?? (clienteDerivado && clienteDerivado !== 'MULTIPLE' ? clienteDerivado.kunnr : null)
      if (!kunnr) throw new Error('No hay cliente seleccionado')
      if (partidasSeleccionadas.length === 0) throw new Error('No hay partidas seleccionadas')

      setErrorCobro(null)
      setIsCobrando(true)
      try {
        const resultado = await registrarCobroEfectivo({
          kunnr,
          monto: totalSeleccionado,
          montoRecibido,
          medio_pago: 'EFECTIVO',
          belnrs_cancelados: partidasSeleccionadas,
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
    },
    [clienteSeleccionado, clienteDerivado, partidasSeleccionadas, totalSeleccionado]
  )

  // Resetear todo el estado para un nuevo cobro
  const resetear = useCallback(() => {
    setClienteSeleccionado(null)
    setFiltroCliente('')
    setFiltroNombre('')
    setFiltroDocumento('')
    setFiltroPedido('')
    setFiltroEstado('')
    setPartidasSeleccionadas([])
    setErrorCobro(null)
    setResultadoCobro(null)
    // Recargar todas las partidas
    setIsLoadingPartidas(true)
    setErrorPartidas(null)
    getPartidasAbiertas()
      .then((data) => setTodasPartidas(data))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Error cargando partidas'
        setErrorPartidas(msg)
      })
      .finally(() => setIsLoadingPartidas(false))
  }, [])

  return {
    clienteSeleccionado,
    clienteDerivado,
    seleccionarCliente,
    deseleccionarCliente,
    filtroCliente,
    setFiltroCliente,
    filtroNombre,
    setFiltroNombre,
    filtroDocumento,
    setFiltroDocumento,
    filtroPedido,
    setFiltroPedido,
    filtroEstado,
    setFiltroEstado,
    limpiarFiltros,
    partidas,
    todasPartidas,
    isLoadingPartidas,
    errorPartidas,
    partidasSeleccionadas,
    togglePartida,
    totalSeleccionado,
    confirmarCobroEfectivo,
    isCobrando,
    errorCobro,
    resultadoCobro,
    resetear,
  }
}
