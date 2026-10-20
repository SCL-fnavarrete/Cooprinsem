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
import { PendientesAperturaCaja } from './PendientesAperturaCaja'
import { SoloModoTecnico } from '@/components/common/SoloModoTecnico'

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
  // Entrar a Caja sin registrar la apertura (pruebas, 15-10-2026). Sin esta prop no se muestra el botón.
  onEntrarSinApertura?: () => void
  isGrabando: boolean
  error: string | null
}

// Hoy en Chile como YYYY-MM-DD (toISOString usa UTC: de noche ya sería mañana).
function hoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

// Formato común de los campos del formulario: etiqueta arriba, campo a todo el ancho.
const estiloCampo = { display: 'grid', gap: '0.25rem' } as const
const estiloInput = { width: '100%' } as const

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
  onEntrarSinApertura,
  isGrabando,
  error,
}: AperturaCajaDialogProps) {
  // Fecha fija en hoy: la caja se abre por día (ver apertura_caja en sapCaja.ts)
  const [fecha, setFecha] = useState(hoyChile)
  const [monto, setMonto] = useState('')

  // El diálogo se mantiene montado entre aperturas (solo cambia `open`), así
  // que hay que re-sincronizar fecha/monto cada vez que se vuelve a abrir —
  // si no, quedaría pegado el valor de la última vez que se usó.
  useEffect(() => {
    if (open) {
      setFecha(hoyChile())
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
      style={{ width: '560px', maxHeight: '90vh' }}
      footer={
        <Bar
          endContent={
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button design="Emphasized" onClick={handleAceptar} disabled={isGrabando || !monto}>
                {isGrabando ? 'Grabando...' : 'Aceptar'}
              </Button>
              {onEntrarSinApertura && (
                <Button design="Default" onClick={onEntrarSinApertura} disabled={isGrabando} data-testid="btn-entrar-sin-apertura">
                  Entrar sin apertura
                </Button>
              )}
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
          Al confirmar se contabiliza un asiento real en SAP (Apertura de Caja). Ver abajo qué va fijo y qué falta definir.
        </MessageStrip>

        {/* Todos los campos con el mismo formato: etiqueta arriba y campo a todo el ancho */}
        <div style={estiloCampo}>
          <Label>Usuario</Label>
          <Input value={usuario} readonly style={estiloInput} />
        </div>

        <div style={estiloCampo}>
          <Label>Sociedad</Label>
          <Input value={`${sociedad} — ${nombreSociedad}`} readonly style={estiloInput} />
        </div>

        <div style={estiloCampo}>
          <Label>Sucursal</Label>
          <Input value={`${sucursal} — ${nombreSucursal}`} readonly style={estiloInput} />
        </div>

        <div style={estiloCampo}>
          <Label>Fecha</Label>
          <Input value={fecha.split('-').reverse().join('-')} readonly style={estiloInput} data-testid="apertura-fecha" />
        </div>

        {/* Monto y Moneda en la misma fila, alineados con el resto */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 6rem', gap: '1rem' }}>
          <div style={estiloCampo}>
            <Label>Monto</Label>
            <Input
              type="Text"
              value={montoFormateado}
              onInput={handleMontoInput}
              placeholder="200.000"
              style={estiloInput}
            />
          </div>
          <div style={estiloCampo}>
            <Label>Moneda</Label>
            <Input value="CLP" readonly style={estiloInput} />
          </div>
        </div>

        <SoloModoTecnico><PendientesAperturaCaja /></SoloModoTecnico>
      </div>
    </Dialog>
  )
}