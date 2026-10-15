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
  TextArea,
} from '@ui5/webcomponents-react'

// Egreso de Caja (solicitud de José Castillo, 14-10-2026): mismo formato que la
// Apertura de Caja — sin documento ni cliente. Solo usuario, sociedad, sucursal,
// fecha (hoy, fija), monto y descripción (solo POS, egreso_caja.descripcion).

const MAX_DESCRIPCION = 500

interface EgresoCajaDialogProps {
  open: boolean
  usuario: string
  nombreUsuario?: string
  sociedad: string
  nombreSociedad: string
  sucursal: string
  nombreSucursal: string
  onAceptar: (monto: number, descripcion: string) => void
  onCancelar: () => void
  isGrabando: boolean
  error: string | null
}

// Hoy en Chile como DD-MM-YYYY (solo pantalla: el backend usa siempre hoy).
function hoyChileTexto(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()).split('-').reverse().join('-')
}

export function EgresoCajaDialog({
  open,
  usuario,
  nombreUsuario,
  sociedad,
  nombreSociedad,
  sucursal,
  nombreSucursal,
  onAceptar,
  onCancelar,
  isGrabando,
  error,
}: EgresoCajaDialogProps) {
  // Solo dígitos (lo que se envía); el input muestra el formato CLP.
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyChileTexto)
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => {
    if (open) {
      setMonto('')
      setDescripcion('')
      setFecha(hoyChileTexto())
    }
  }, [open])

  const restantes = MAX_DESCRIPCION - descripcion.length

  const montoFormateado = monto ? Number(monto).toLocaleString('es-CL') : ''

  const handleAceptar = () => {
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) return
    onAceptar(montoNum, descripcion.trim())
  }

  return (
    <Dialog
      open={open}
      headerText="Egreso de Caja"
      style={{ width: '480px' }}
      data-testid="egreso-caja-dialog"
      footer={
        <Bar
          endContent={
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button design="Emphasized" onClick={handleAceptar} disabled={isGrabando || !monto} data-testid="btn-aceptar-egreso">
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

        {error && <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip>}

        <div>
          <Label>Usuario (quien hace el egreso)</Label>
          <Input value={nombreUsuario ? `${usuario} — ${nombreUsuario}` : usuario} readonly style={{ width: '100%' }} data-testid="egreso-usuario" />
        </div>
        <div>
          <Label>Sociedad</Label>
          <Input value={`${sociedad} — ${nombreSociedad}`} readonly style={{ width: '100%' }} />
        </div>
        <div>
          <Label>Sucursal</Label>
          <Input value={`${sucursal} — ${nombreSucursal}`} readonly style={{ width: '100%' }} />
        </div>
        <div>
          <Label>Fecha</Label>
          <Input value={fecha} readonly style={{ width: '100%' }} data-testid="egreso-fecha" />
        </div>
        <FlexBox style={{ gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Label required>Monto</Label>
            <Input
              value={montoFormateado}
              onInput={(e: { target: { value: string } }) => setMonto(e.target.value.replace(/\D/g, ''))}
              placeholder="70.000"
              style={{ width: '100%' }}
              data-testid="egreso-monto"
            />
          </div>
          <div>
            <Label>Moneda</Label>
            <Input value="CLP" readonly style={{ width: '5rem' }} />
          </div>
        </FlexBox>
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          <Label>Descripción</Label>
          <TextArea
            value={descripcion}
            onInput={(e: { target: { value: string } }) => setDescripcion(e.target.value.slice(0, MAX_DESCRIPCION))}
            placeholder="Detalle del egreso (opcional)"
            rows={3}
            maxlength={MAX_DESCRIPCION}
            style={{ width: '100%' }}
            aria-label="Descripción"
            data-testid="egreso-descripcion"
          />
          {/* Contador propio en español (el de UI5 sale en inglés) */}
          <Label style={{ justifySelf: 'end', fontSize: '0.75rem' }} data-testid="egreso-descripcion-restantes">
            {restantes} {restantes === 1 ? 'carácter restante' : 'caracteres restantes'}
          </Label>
        </div>
      </div>
    </Dialog>
  )
}
