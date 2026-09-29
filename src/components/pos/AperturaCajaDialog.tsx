import { useState, useEffect } from 'react'
import {
  Dialog,
  FlexBox,
  Label,
  Input,
  Button,
  Bar,
  Title,
  MessageStrip,
} from '@ui5/webcomponents-react'

interface AperturaCajaDialogProps {
  open: boolean
  usuario: string
  sociedad: string
  nombreSociedad: string
  sucursal: string
  nombreSucursal: string
  // Fondo fijo esperado para la sucursal (tabla monto_apertura, poblada por el
  // equipo de arquitectura/interfaces SAP) — prellena el campo Monto, pero
  // sigue siendo editable por si el conteo físico no cuadra.
  montoSugerido?: number
  onAceptar: (monto: number, fecha: string) => void
  onCancelar: () => void
  isGrabando: boolean
  error: string | null
}

export function AperturaCajaDialog({
  open,
  usuario,
  sociedad,
  nombreSociedad,
  sucursal,
  nombreSucursal,
  montoSugerido,
  onAceptar,
  onCancelar,
  isGrabando,
  error,
}: AperturaCajaDialogProps) {
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [monto, setMonto] = useState('')

  // El diálogo se mantiene montado entre aperturas (solo cambia `open`), así
  // que hay que re-sincronizar fecha/monto cada vez que se vuelve a abrir —
  // si no, quedaría pegado el valor de la última vez que se usó.
  useEffect(() => {
    if (open) {
      setFecha(new Date().toISOString().split('T')[0])
      setMonto(montoSugerido !== undefined ? String(Math.round(montoSugerido)) : '')
    }
  }, [open, montoSugerido])

  // `monto` guarda solo dígitos (lo que realmente se envía a la API). El
  // input muestra `montoFormateado` (formato CLP, ej. "200.000") — es
  // puramente visual, nunca se guarda en el estado.
  const montoFormateado = monto ? Number(monto).toLocaleString('es-CL') : ''

  const handleMontoInput = (e: { target: { value: string } }) => {
    setMonto(e.target.value.replace(/\D/g, ''))
  }

  const handleAceptar = () => {
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) return
    onAceptar(montoNum, fecha)
  }

  return (
    <Dialog
      open={open}
      headerText="Apertura de Caja"
      style={{ width: '450px' }}
      footer={
        <Bar
          endContent={
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button design="Emphasized" onClick={handleAceptar} disabled={isGrabando || !monto}>
                {isGrabando ? 'Grabando...' : 'Aceptar'}
              </Button>
              <Button design="Transparent" onClick={onCancelar} disabled={isGrabando}>
                Cancelar
              </Button>
            </FlexBox>
          }
        />
      }
    >
      <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
        <Title level="H5">Datos Generales</Title>

        {error && (
          <MessageStrip design="Negative">{error}</MessageStrip>
        )}

        <MessageStrip design="Information" hideCloseButton>
          BORRADOR — al confirmar se envía un asiento real a SAP. El cliente/cajero
          responsable y el centro de beneficio se resuelven automáticamente según la
          sucursal, pero la cuenta contable Caja-Disponible y el indicador de mayor
          especial todavía están hardcodeados en el backend (pendientes de confirmar
          con el equipo de arquitectura). Es normal que SAP rechace el documento hasta
          que se regularicen esos datos.
        </MessageStrip>

        <FlexBox style={{ gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Label>Usuario</Label>
            <Input value={usuario} readonly />
          </div>
        </FlexBox>

        <FlexBox style={{ gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Label>Sociedad</Label>
            <Input value={`${sociedad} — ${nombreSociedad}`} readonly />
          </div>
        </FlexBox>

        <FlexBox style={{ gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Label>Sucursal</Label>
            <Input value={`${sucursal} — ${nombreSucursal}`} readonly />
          </div>
        </FlexBox>

        <FlexBox style={{ gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Label>Fecha</Label>
            <Input
              type="Date"
              value={fecha}
              onInput={(e: { target: { value: string } }) => setFecha(e.target.value)}
            />
          </div>
        </FlexBox>

        <FlexBox style={{ gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Label>Monto</Label>
            <Input
              type="Text"
              value={montoFormateado}
              onInput={handleMontoInput}
              placeholder="200.000"
            />
          </div>
          <div>
            <Label>Moneda</Label>
            <Input value="CLP" readonly />
          </div>
        </FlexBox>
      </div>
    </Dialog>
  )
}