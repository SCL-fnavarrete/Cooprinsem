import { useState, useRef, useCallback } from 'react'
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
import type { ICliente } from '@/types/cliente'
import { buscarClientes, getCliente } from '@/services/api/clientes'
import { formatCLP } from '@/utils/format'
import { CLIENTE_BOLETA } from '@/config/sap'

interface ClienteSearchProps {
  onClienteSeleccionado: (cliente: ICliente) => void
  onClienteDeseleccionado: () => void
  sucursal?: string
  disabled?: boolean
}

export function ClienteSearch({
  onClienteSeleccionado,
  onClienteDeseleccionado,
  sucursal = 'D190',
  disabled = false,
}: ClienteSearchProps) {
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<ICliente[]>([])
  const [seleccionado, setSeleccionado] = useState<ICliente | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback(
    (texto: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (texto.length < 2) {
        setSugerencias([])
        return
      }
      timerRef.current = setTimeout(async () => {
        setIsLoading(true)
        try {
          const results = await buscarClientes(texto, sucursal)
          setSugerencias(results)
        } catch {
          setSugerencias([])
        } finally {
          setIsLoading(false)
        }
      }, 300)
    },
    [sucursal]
  )

  const handleInput = (e: { target: { value: string } }) => {
    const val = e.target.value
    setQuery(val)
    buscar(val)
  }

  const handleSelect = (e: { detail: { item: HTMLElement } }) => {
    const itemText = e.detail.item.getAttribute('text') ?? e.detail.item.textContent ?? ''
    const cliente = sugerencias.find((c) => itemText.includes(c.codigoCliente))
    if (cliente) {
      setSeleccionado(cliente)
      setQuery(cliente.nombre)
      setSugerencias([])
      onClienteSeleccionado(cliente)
    }
  }

  const handleClear = () => {
    setSeleccionado(null)
    setQuery('')
    setSugerencias([])
    onClienteDeseleccionado()
  }

  const handleClienteBoleta = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSugerencias([])
    setIsLoading(true)
    try {
      const boleta = await getCliente(CLIENTE_BOLETA)
      setSeleccionado(boleta)
      setQuery(boleta.nombre)
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
      <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
        <Input
          placeholder="Buscar cliente por RUT, nombre o código..."
          value={query}
          onInput={handleInput}
          onSelectionChange={handleSelect}
          showSuggestions
          disabled={disabled || !!seleccionado}
          loading={isLoading}
          style={{ flex: 1 }}
          aria-label="Buscar cliente"
        >
          {sugerencias.map((c) => (
            <SuggestionItem
              key={c.codigoCliente}
              text={`${c.codigoCliente} - ${c.nombre} (${c.rut || 'Sin RUT'})`}
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
          <Button
            design="Transparent"
            onClick={handleClienteBoleta}
            disabled={disabled}
          >
            Cliente Boleta
          </Button>
        )}
      </FlexBox>

      {/* Panel de crédito */}
      {seleccionado && (
        <div data-testid="panel-credito" style={{ marginTop: '0.5rem', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <FlexBox alignItems="Center" style={{ gap: '1rem', marginBottom: '0.5rem' }}>
            <Label>Estado:</Label>
            {estadoBadge(seleccionado.estadoCredito)}
            <Label style={{ marginLeft: 'auto' }}>
              Cond. Pago: {seleccionado.condicionPago}
            </Label>
          </FlexBox>

          {seleccionado.creditoAsignado > 0 && (
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
          )}

          {seleccionado.estadoCredito === 'BLOQUEADO' && (
            <MessageStrip
              design="Negative"
              style={{ marginTop: '0.5rem' }}
            >
              Cliente bloqueado crediticiamente. SAP rechazará el pedido al grabar.
            </MessageStrip>
          )}
        </div>
      )}
    </div>
  )
}
