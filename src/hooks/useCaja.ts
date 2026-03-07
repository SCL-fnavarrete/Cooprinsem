import { useState, useCallback } from 'react'
import type { ICliente } from '@/types/cliente'
import type { IPartidaAbierta, IResultadoCobro } from '@/types/caja'
import { getPartidasAbiertas } from '@/services/api/facturas'
import { registrarCobroEfectivo } from '@/services/api/cobros'

export function useCaja() {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null)
  const [partidas, setPartidas] = useState<IPartidaAbierta[]>([])
  const [isLoadingPartidas, setIsLoadingPartidas] = useState(false)
  const [errorPartidas, setErrorPartidas] = useState<string | null>(null)
  const [partidasSeleccionadas, setPartidasSeleccionadas] = useState<string[]>([])
  const [isCobrando, setIsCobrando] = useState(false)
  const [errorCobro, setErrorCobro] = useState<string | null>(null)
  const [resultadoCobro, setResultadoCobro] = useState<IResultadoCobro | null>(null)

  // Al seleccionar cliente, cargar partidas automáticamente
  const seleccionarCliente = useCallback(async (cliente: ICliente) => {
    setClienteSeleccionado(cliente)
    setPartidasSeleccionadas([])
    setErrorPartidas(null)
    setErrorCobro(null)
    setResultadoCobro(null)
    setIsLoadingPartidas(true)
    try {
      const data = await getPartidasAbiertas(cliente.codigoCliente)
      setPartidas(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando partidas'
      setErrorPartidas(msg)
      setPartidas([])
    } finally {
      setIsLoadingPartidas(false)
    }
  }, [])

  const deseleccionarCliente = useCallback(() => {
    setClienteSeleccionado(null)
    setPartidas([])
    setPartidasSeleccionadas([])
    setErrorPartidas(null)
    setErrorCobro(null)
    setResultadoCobro(null)
  }, [])

  const togglePartida = useCallback((belnr: string) => {
    setPartidasSeleccionadas((prev) =>
      prev.includes(belnr)
        ? prev.filter((b) => b !== belnr)
        : [...prev, belnr]
    )
  }, [])

  // Monto total de las partidas seleccionadas
  const totalSeleccionado = partidas
    .filter((p) => partidasSeleccionadas.includes(p.belnr))
    .reduce((acc, p) => acc + p.importe, 0)

  const confirmarCobroEfectivo = useCallback(
    async (montoRecibido: number): Promise<IResultadoCobro> => {
      if (!clienteSeleccionado) throw new Error('No hay cliente seleccionado')
      if (partidasSeleccionadas.length === 0) throw new Error('No hay partidas seleccionadas')

      setErrorCobro(null)
      setIsCobrando(true)
      try {
        const resultado = await registrarCobroEfectivo({
          kunnr: clienteSeleccionado.codigoCliente,
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
    [clienteSeleccionado, partidasSeleccionadas, totalSeleccionado]
  )

  // Resetear todo el estado para un nuevo cobro
  const resetear = useCallback(() => {
    setClienteSeleccionado(null)
    setPartidas([])
    setPartidasSeleccionadas([])
    setErrorPartidas(null)
    setErrorCobro(null)
    setResultadoCobro(null)
  }, [])

  return {
    clienteSeleccionado,
    seleccionarCliente,
    deseleccionarCliente,
    partidas,
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
