import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  Button,
  Label,
  Input,
  FlexBox,
  Bar,
  Title,
  MessageStrip,
} from '@ui5/webcomponents-react'
import type { ICliente } from '@/types/cliente'
import { formatCLP } from '@/utils/format'

interface PagoEfectivoModalProps {
  open: boolean
  totalACobrar: number
  cliente: ICliente
  documentosSeleccionados: string[]
  onConfirmar: (montoRecibido: number) => void
  onCancelar: () => void
  isCobrando: boolean
}

export function PagoEfectivoModal({
  open,
  totalACobrar,
  cliente,
  documentosSeleccionados,
  onConfirmar,
  onCancelar,
  isCobrando,
}: PagoEfectivoModalProps) {
  const [montoRecibido, setMontoRecibido] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<any>(null)

  // Resetear monto al abrir
  useEffect(() => {
    if (open) {
      setMontoRecibido('')
      // Autofoco al abrir
      setTimeout(() => {
        const input = inputRef.current?.querySelector?.('input') ?? inputRef.current
        if (input && 'focus' in input) (input as HTMLElement).focus()
      }, 100)
    }
  }, [open])

  const montoNum = parseInt(montoRecibido, 10) || 0
  const vuelto = montoNum - totalACobrar
  const canConfirmar = montoNum >= totalACobrar && montoNum > 0 && !isCobrando

  const handleConfirmar = () => {
    if (canConfirmar) {
      onConfirmar(montoNum)
    }
  }

  // Atajo Enter para confirmar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canConfirmar) {
      handleConfirmar()
    }
  }

  return (
    <Dialog
      open={open}
      headerText="Cobro en Efectivo"
      onClose={onCancelar}
      footer={
        <Bar
          endContent={
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button
                design="Transparent"
                onClick={onCancelar}
                disabled={isCobrando}
              >
                Cancelar
              </Button>
              <Button
                design="Emphasized"
                onClick={handleConfirmar}
                disabled={!canConfirmar}
                icon={isCobrando ? 'synchronize' : undefined}
              >
                {isCobrando ? 'Procesando...' : 'Confirmar Cobro'}
              </Button>
            </FlexBox>
          }
        />
      }
      style={{ minWidth: '400px' }}
    >
      <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }} onKeyDown={handleKeyDown}>
        {/* Resumen */}
        <div>
          <Title level="H5">Resumen</Title>
          <FlexBox direction="Column" style={{ gap: '0.25rem', marginTop: '0.5rem' }}>
            <Label>Cliente: {cliente.nombre} {cliente.rut ? `(${cliente.rut})` : ''}</Label>
            <Label>Documentos a cancelar: {documentosSeleccionados.length}</Label>
          </FlexBox>
        </div>

        {/* Total a cobrar */}
        <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
          <Label style={{ fontWeight: 'bold' }}>Total a Pagar</Label>
          <Title level="H3" data-testid="total-a-cobrar">{formatCLP(totalACobrar)}</Title>
        </FlexBox>

        {/* Monto recibido */}
        <div>
          <Label>Efectivo Recibido</Label>
          <Input
            ref={inputRef}
            value={montoRecibido}
            onInput={(e: { target: { value: string } }) => {
              const cleaned = e.target.value.replace(/[^0-9]/g, '')
              setMontoRecibido(cleaned)
            }}
            placeholder="Ingrese monto en efectivo"
            style={{ width: '100%' }}
            aria-label="Monto recibido"
          />
        </div>

        {/* Vuelto */}
        <FlexBox direction="Column" style={{ gap: '0.25rem' }}>
          <Label style={{ fontWeight: 'bold' }}>Vuelto</Label>
          <Title
            level="H3"
            data-testid="vuelto"
            style={{
              color: vuelto >= 0
                ? 'var(--sapPositiveColor, #2b7c2b)'
                : 'var(--sapNegativeColor, #bb0000)',
            }}
          >
            {formatCLP(Math.max(vuelto, 0))}
          </Title>
        </FlexBox>

        {/* Warning monto insuficiente */}
        {montoRecibido !== '' && vuelto < 0 && (
          <MessageStrip design="Negative">
            El monto recibido es insuficiente. Faltan {formatCLP(Math.abs(vuelto))}.
          </MessageStrip>
        )}
      </div>
    </Dialog>
  )
}
