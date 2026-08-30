import { useState, useCallback } from 'react'
import {
  Dialog,
  FlexBox,
  Label,
  Input,
  Button,
  Bar,
  Toast,
} from '@ui5/webcomponents-react'
import { SAP_SOCIEDAD } from '@/config/sap'

const MENSAJE_PENDIENTE = 'Funcionalidad pendiente de API'

interface AnticipoCajaDialogProps {
  open: boolean
  onCancelar: () => void
}

// CA-12 — Anticipo Clientes (Post Venta). Las APIs para verificar/ejecutar
// el anticipo en SAP están a la espera del equipo ABAP (Priscila) — por ahora
// solo se implementa el frontend; Verif. y Aceptar solo notifican al usuario.
export function AnticipoCajaDialog({ open, onCancelar }: AnticipoCajaDialogProps) {
  const ejercicioActual = new Date().getFullYear().toString()
  const [cliente, setCliente] = useState('')
  const [ejercicio, setEjercicio] = useState(ejercicioActual)
  const [nroDocumento, setNroDocumento] = useState('')
  const [toastOpen, setToastOpen] = useState(false)

  const mostrarToast = useCallback(() => {
    setToastOpen(false)
    setTimeout(() => setToastOpen(true), 10)
  }, [])

  const handleCerrar = useCallback(() => {
    setCliente('')
    setEjercicio(ejercicioActual)
    setNroDocumento('')
    onCancelar()
  }, [ejercicioActual, onCancelar])

  return (
    <Dialog
      open={open}
      headerText="Anticipos"
      style={{ width: '480px', maxWidth: '95vw' }}
      footer={
        <Bar
          endContent={
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button design="Transparent" onClick={handleCerrar}>
                Cancelar
              </Button>
              <Button
                design="Emphasized"
                onClick={mostrarToast}
                disabled={!cliente.trim() || !nroDocumento.trim()}
              >
                Aceptar
              </Button>
            </FlexBox>
          }
        />
      }
    >
      <div style={{ padding: '1rem', display: 'grid', gap: '1rem', boxSizing: 'border-box' }}>
        <div>
          <Label>Cliente</Label>
          <Input
            value={cliente}
            onInput={(e: { target: { value: string } }) => setCliente(e.target.value)}
            placeholder="Código SAP cliente"
            aria-label="Cliente"
            style={{ width: '100%' }}
          />
        </div>

        <FlexBox style={{ gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label>Sociedad</Label>
            <Input value={SAP_SOCIEDAD} readonly aria-label="Sociedad" style={{ width: '100%' }} />
          </div>
          <div style={{ width: '80px', flexShrink: 0 }}>
            <Label>Ejercicio</Label>
            <Input
              value={ejercicio}
              onInput={(e: { target: { value: string } }) => setEjercicio(e.target.value)}
              aria-label="Ejercicio"
              style={{ width: '100%' }}
            />
          </div>
        </FlexBox>

        <FlexBox style={{ gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label>Nº documento</Label>
            <Input
              value={nroDocumento}
              onInput={(e: { target: { value: string } }) => setNroDocumento(e.target.value)}
              placeholder="Nº comprobante SAP"
              aria-label="Nº documento"
              style={{ width: '100%' }}
            />
          </div>
          <Button
            design="Default"
            onClick={mostrarToast}
            disabled={!nroDocumento.trim()}
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Verif.
          </Button>
        </FlexBox>
      </div>

      <Toast open={toastOpen} onClose={() => setToastOpen(false)}>
        {MENSAJE_PENDIENTE}
      </Toast>
    </Dialog>
  )
}
