import '@ui5/webcomponents-icons/dist/decline.js'
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Input,
  SuggestionItem,
  Button,
  FlexBox,
  ObjectStatus,
  ProgressIndicator,
  MessageStrip,
  Label,
} from '@ui5/webcomponents-react'
import type { InputDomRef } from '@ui5/webcomponents-react'
import type { ICliente } from '@/types/cliente'
import { buscarClientesSapTabla, getCliente } from '@/services/api/clientes'
import { formatCLP } from '@/utils/format'
import { CLIENTE_BOLETA } from '@/config/sap'
import { largoBusqueda } from '@/utils/busqueda'
import { BusquedaClienteDialog } from './BusquedaClienteDialog'

// Texto de cada sugerencia: también sirve para reconocer el cliente elegido
const textoSugerenciaCliente = (c: ICliente) => `${c.codigoCliente} - ${c.nombre} (${c.rut || 'Sin RUT'})`

interface ClienteSearchProps {
  onClienteSeleccionado: (cliente: ICliente) => void
  onClienteDeseleccionado: () => void
  sucursal?: string
  disabled?: boolean
  // Cliente ya elegido al montar (ej. popup Anticipos abierto desde Ant. Cliente).
  clienteInicial?: ICliente | null
  // Ant. Cliente: el Cliente Boleta no tiene solicitudes de anticipo ni datos de crédito que mostrar.
  ocultarClienteBoleta?: boolean
  ocultarPanelCredito?: boolean
}

export function ClienteSearch({
  onClienteSeleccionado,
  onClienteDeseleccionado,
  sucursal = 'D190',
  disabled = false,
  clienteInicial = null,
  ocultarClienteBoleta = false,
  ocultarPanelCredito = false,
}: ClienteSearchProps) {
  const [sugerencias, setSugerencias] = useState<ICliente[]>([])
  const [seleccionado, setSeleccionado] = useState<ICliente | null>(clienteInicial)
  // Sap_cliente/Sap_clientes_direccion no traen crédito ni condición de pago (ver
  // PROGRESS.md) — en vez de inventar un estado, cada campo sin dato real muestra
  // "Sin información para Cliente".
  const [sinInfoCredito, setSinInfoCredito] = useState(false)
  const [showBusquedaSapTablaPopup, setShowBusquedaSapTablaPopup] = useState(false)
  const [_isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<InputDomRef>(null)
  // Guardamos las sugerencias en ref para acceder desde handleSelect sin depender del state
  const sugerenciasRef = useRef<ICliente[]>([])

  // Cliente precargado: mostrar su nombre en el input (solo al montar).
  useEffect(() => {
    if (clienteInicial && inputRef.current) inputRef.current.value = clienteInicial.nombre
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buscar = useCallback(
    (texto: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (largoBusqueda(texto) < 2) {
        sugerenciasRef.current = []
        setSugerencias([])
        return
      }
      timerRef.current = setTimeout(async () => {
        setIsLoading(true)
        try {
          const results = await buscarClientesSapTabla(texto, sucursal)
          sugerenciasRef.current = results
          setSugerencias(results)
        } catch {
          sugerenciasRef.current = []
          setSugerencias([])
        } finally {
          setIsLoading(false)
        }
      }, 300)
    },
    [sucursal]
  )

  const handleInput = (e: CustomEvent) => {
    const target = e.target as HTMLInputElement
    const val = target?.value ?? ''
    buscar(val)
  }

  // Solo Enter o clic eligen el cliente: UI5 dispara "change" con el texto de la
  // sugerencia. "selection-change" también se dispara al moverse con las flechas
  // (vista previa) y elegía el primer cliente sin dejar seguir bajando (27-10-2026).
  const handleChange = (e: { target: unknown }) => {
    const texto = (e.target as InputDomRef | null)?.value ?? ''
    const cliente = sugerenciasRef.current.find((c) => textoSugerenciaCliente(c) === texto)
    if (cliente) {
      setSeleccionado(cliente)
      // La búsqueda rápida sale de Sap_cliente — sin datos de crédito/condición de pago.
      setSinInfoCredito(true)
      if (inputRef.current) inputRef.current.value = cliente.nombre
      sugerenciasRef.current = []
      setSugerencias([])
      onClienteSeleccionado(cliente)
    }
  }

  const handleClear = () => {
    setSeleccionado(null)
    setSinInfoCredito(false)
    if (inputRef.current) inputRef.current.value = ''
    sugerenciasRef.current = []
    setSugerencias([])
    onClienteDeseleccionado()
  }

  const handleClienteBoleta = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    sugerenciasRef.current = []
    setSugerencias([])
    setIsLoading(true)
    try {
      const boleta = await getCliente(CLIENTE_BOLETA)
      setSeleccionado(boleta)
      setSinInfoCredito(false)
      if (inputRef.current) inputRef.current.value = boleta.nombre
      onClienteSeleccionado(boleta)
    } catch {
      // silenciar — el usuario puede reintentar
    } finally {
      setIsLoading(false)
    }
  }

  const estadoBadge = (estado: ICliente['estadoCredito']) => {
    switch (estado) {
      case 'BLOQUEADO':
        return <ObjectStatus state="Negative" showDefaultIcon>BLOQUEADO</ObjectStatus>
      case 'CON_DEUDA':
        return <ObjectStatus state="Critical" showDefaultIcon>CON DEUDA</ObjectStatus>
      case 'AL_DIA':
        return <ObjectStatus state="Positive" showDefaultIcon>AL DÍA</ObjectStatus>
    }
  }

  return (
    <div data-testid="cliente-search">
      <FlexBox alignItems="Center" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <Input
          ref={inputRef}
          placeholder="Buscar cliente por RUT, nombre o código (* = comodín)..."
          onInput={handleInput}
          onChange={handleChange}
          showSuggestions
          disabled={disabled || !!seleccionado}
          style={{ flex: 1 }}
          aria-label="Buscar cliente"
        >
          {sugerencias.map((c) => (
            <SuggestionItem
              key={c.codigoCliente}
              text={textoSugerenciaCliente(c)}
              additionalText={c.condicionPago}
            />
          ))}
        </Input>
        {seleccionado && (
          <Button
            icon="decline"
            design="Transparent"
            onClick={handleClear}
            aria-label="Limpiar cliente"
          />
        )}
        {!seleccionado && (
          <>
            <Button design="Transparent" icon="search" onClick={() => setShowBusquedaSapTablaPopup(true)} disabled={disabled} aria-label="Búsqueda cliente SAP_CLIENTES">Busca Cliente SAP_CLIENTES</Button>
            {!ocultarClienteBoleta && <Button design="Transparent" onClick={handleClienteBoleta} disabled={disabled}>Cliente Boleta</Button>}
          </>
        )}
      </FlexBox>

      {/* Panel de crédito — siempre visible; los campos sin dato real (fuente Sap_cliente)
          muestran "Sin información para Cliente" en vez de un valor inventado. */}
      {seleccionado && !ocultarPanelCredito && (
        <div data-testid="panel-credito" style={{ marginTop: '0.5rem', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <FlexBox alignItems="Center" style={{ gap: '1rem', marginBottom: '0.5rem' }}>
            <Label>Estado:</Label>
            {sinInfoCredito ? <Label>Sin información para Cliente</Label> : estadoBadge(seleccionado.estadoCredito)}
            <Label style={{ marginLeft: 'auto' }}>
              Cond. Pago: {sinInfoCredito ? 'Sin información para Cliente' : seleccionado.condicionPago}
            </Label>
          </FlexBox>

          {sinInfoCredito ? (
            <FlexBox style={{ gap: '1rem', marginBottom: '0.25rem' }}>
              <Label>Crédito Asignado: Sin información para Cliente</Label>
              <Label>Utilizado: Sin información para Cliente</Label>
            </FlexBox>
          ) : (
            seleccionado.creditoAsignado > 0 && (
              <>
                <FlexBox style={{ gap: '1rem', marginBottom: '0.25rem' }}>
                  <Label>Crédito Asignado: {formatCLP(seleccionado.creditoAsignado)}</Label>
                  <Label>Utilizado: {formatCLP(seleccionado.creditoUtilizado)}</Label>
                </FlexBox>
                <ProgressIndicator
                  value={Math.min(seleccionado.porcentajeAgotamiento, 100)}
                  valueState={
                    seleccionado.porcentajeAgotamiento >= 100
                      ? 'Negative'
                      : seleccionado.porcentajeAgotamiento >= 80
                        ? 'Critical'
                        : 'Positive'
                  }
                  displayValue={`${seleccionado.porcentajeAgotamiento}%`}
                />
              </>
            )
          )}

          {!sinInfoCredito && seleccionado.estadoCredito === 'BLOQUEADO' && (
            <MessageStrip
              design="Negative"
              style={{ marginTop: '0.5rem' }}
            >
              Cliente bloqueado crediticiamente. SAP rechazará el pedido al grabar.
            </MessageStrip>
          )}
        </div>
      )}

      <BusquedaClienteDialog
        open={showBusquedaSapTablaPopup}
        onSeleccionar={(c) => {
          setSeleccionado(c)
          setSinInfoCredito(true)
          if (inputRef.current) inputRef.current.value = c.nombre
          onClienteSeleccionado(c)
          setShowBusquedaSapTablaPopup(false)
        }}
        onCerrar={() => setShowBusquedaSapTablaPopup(false)}
        sucursal={sucursal}
      />
    </div>
  )
}
