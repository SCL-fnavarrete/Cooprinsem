import { useState, useEffect, useRef, useMemo } from 'react'
import { buscarClientesSapTabla } from '@/services/api/clientes'
import { getSapCentros } from '@/services/api/sapMaestro'
import { getPartidasCtaCte } from '@/services/api/sapCtaCte'
import { useUser } from '@/stores/userContext'
import { validarRUT, limpiarRUT } from '@/utils/validations'
import { formatRUT } from '@/utils/format'
import type { ICliente } from '@/types/cliente'
import type { ISapCentro } from '@/types/sapMaestro'
import type { IPartidaCtaCte } from '@/types/ctaCte'
import { ordenarPartidasCtaCte, ORDEN_CTACTE_DEFECTO, type IOrdenCtaCte } from './ordenPartidasCtaCte'

/**
 * Búsqueda "Cuenta Corriente" compartida por Caja > Pago Cta. Cte. y
 * Caja > E° de Cuenta (22-10-2026): identifica al cliente por RUT o código en
 * el maestro local Sap_cliente y carga sus partidas abiertas desde SAP
 * (FAR_CUSTOMER_LINE_ITEMS vía GET /api/sap-cta-cte/partidas). Las partidas se
 * recargan al cambiar la fecha de vencimiento ("vence hasta").
 *
 * `clienteInicial`: código a identificar al montar (ej. ?cliente=… al volver
 * desde la pantalla de pago).
 */
export function useBusquedaCtaCte(clienteInicial = '') {
  const { usuario } = useUser()

  const [rut, setRut] = useState('')
  const [codigoCliente, setCodigoCliente] = useState(clienteInicial)
  const [cliente, setCliente] = useState<ICliente | null>(null)
  const [coincidencias, setCoincidencias] = useState<ICliente[]>([])
  const [sucursal, setSucursal] = useState(usuario?.sucursal ?? '')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [centros, setCentros] = useState<ISapCentro[]>([])
  const [isBuscando, setIsBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBuscador, setShowBuscador] = useState(false)
  const [partidas, setPartidas] = useState<IPartidaCtaCte[]>([])
  const [isCargandoPartidas, setIsCargandoPartidas] = useState(false)
  const [errorPartidas, setErrorPartidas] = useState<string | null>(null)
  const [partidasTruncadas, setPartidasTruncadas] = useState(false)
  // Pago de varias facturas en un cobro (parámetro PAGO_MULTIPLE del backend).
  const [pagoMultiple, setPagoMultiple] = useState(false)
  const [orden, setOrden] = useState<IOrdenCtaCte>(ORDEN_CTACTE_DEFECTO)
  const partidasOrdenadas = useMemo(() => ordenarPartidasCtaCte(partidas, orden), [partidas, orden])

  // Partidas abiertas del cliente identificado; se recargan al cambiar la
  // fecha de vencimiento ("vence hasta"). Una respuesta vieja no pisa a una nueva.
  const codigoIdentificado = cliente?.codigoCliente ?? ''
  useEffect(() => {
    setPartidas([])
    setErrorPartidas(null)
    setPartidasTruncadas(false)
    if (!codigoIdentificado) return
    let vigente = true
    setIsCargandoPartidas(true)
    getPartidasCtaCte({ cliente: codigoIdentificado, venceHasta: fechaVencimiento || undefined })
      .then((r) => {
        if (!vigente) return
        if (r.success) {
          setPartidas(r.data ?? [])
          setPartidasTruncadas(!!r.truncado)
          setPagoMultiple(!!r.pagoMultiple)
        } else {
          setErrorPartidas(r.message ?? 'No se pudieron consultar las partidas abiertas')
        }
      })
      .catch((err) => { if (vigente) setErrorPartidas(err instanceof Error ? err.message : 'Error de red al consultar las partidas') })
      .finally(() => { if (vigente) setIsCargandoPartidas(false) })
    return () => { vigente = false }
  }, [codigoIdentificado, fechaVencimiento])

  const totalPartidas = partidas.reduce((suma, p) => suma + p.monto, 0)

  // Sucursales desde el maestro SAP (Sap_centro).
  useEffect(() => {
    getSapCentros().then(setCentros).catch(() => setCentros([]))
  }, [])

  const asignarCliente = (c: ICliente) => {
    setCliente(c)
    setCoincidencias([])
    setError(null)
    setRut(c.rut ? formatRUT(c.rut) : '')
    setCodigoCliente(c.codigoCliente)
  }

  // Editar RUT o Cliente invalida el cliente identificado.
  const editarRut = (valor: string) => {
    setRut(valor)
    setCliente(null)
    setCoincidencias([])
  }
  const editarCodigo = (valor: string) => {
    setCodigoCliente(valor)
    setCliente(null)
    setCoincidencias([])
  }

  /**
   * Identifica al cliente por RUT o por código en el maestro local Sap_cliente.
   * El backend no encuentra un RUT completo (Sap_cliente lo guarda con guion y
   * la búsqueda lo compara sin guion), así que se busca por el cuerpo del RUT y
   * se filtra la coincidencia exacta aquí.
   *
   * `origen`: al salir del campo RUT se busca solo por RUT, y al salir de
   * Cliente solo por código (el otro campo puede tener un valor anterior).
   * El botón Buscar usa ambos.
   */
  const buscandoRef = useRef(false)
  const identificarCliente = async (origen: 'rut' | 'cliente' | 'ambos' = 'ambos') => {
    if (buscandoRef.current) return
    setError(null)
    setCoincidencias([])
    const rutIngresado = origen === 'cliente' ? '' : rut.trim()
    const codigoIngresado = origen === 'rut' ? '' : codigoCliente.trim()

    if (!rutIngresado && !codigoIngresado) {
      setError('Ingrese el RUT o el código de Cliente')
      return
    }
    if (rutIngresado && !validarRUT(rutIngresado)) {
      setError('El RUT ingresado no es válido')
      return
    }

    buscandoRef.current = true
    setIsBuscando(true)
    try {
      const rutLimpio = rutIngresado ? limpiarRUT(rutIngresado).toUpperCase() : ''
      const consulta = rutLimpio ? rutLimpio.slice(0, -1) : codigoIngresado
      const resultados = await buscarClientesSapTabla(consulta, usuario?.sucursal)
      const exactos = resultados.filter((c) =>
        (!rutLimpio || limpiarRUT(c.rut ?? '').toUpperCase() === rutLimpio) &&
        (!codigoIngresado || c.codigoCliente === codigoIngresado)
      )

      if (exactos.length === 0) {
        setCliente(null)
        setError('No se encontró el cliente en el maestro de clientes SAP (Sap_cliente)')
      } else if (exactos.length === 1) {
        asignarCliente(exactos[0])
      } else {
        // Varios clientes con el mismo RUT: el cajero elige.
        setCliente(null)
        setCoincidencias(exactos)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar el cliente')
    } finally {
      buscandoRef.current = false
      setIsBuscando(false)
    }
  }

  useEffect(() => {
    if (clienteInicial) void identificarCliente('cliente')
    // Solo al montar: identificarCliente cambia en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al salir del campo (o con Enter) con un valor nuevo, se busca el cliente y
  // se carga el nombre automáticamente (evento "change" del Input UI5).
  const alSalirDeRut = () => {
    if (rut.trim() && !cliente) void identificarCliente('rut')
  }
  const alSalirDeCliente = () => {
    if (codigoCliente.trim() && !cliente) void identificarCliente('cliente')
  }

  const nombreSucursal = centros.find((c) => c.Plant === sucursal)?.PlantName

  return {
    rut, codigoCliente, cliente, coincidencias, sucursal, setSucursal, fechaVencimiento, setFechaVencimiento,
    centros, nombreSucursal, isBuscando, error, showBuscador, setShowBuscador,
    partidas, partidasOrdenadas, totalPartidas, isCargandoPartidas, errorPartidas, partidasTruncadas, pagoMultiple,
    orden, setOrden,
    asignarCliente, editarRut, editarCodigo, identificarCliente, alSalirDeRut, alSalirDeCliente,
  }
}

export type IBusquedaCtaCte = ReturnType<typeof useBusquedaCtaCte>
