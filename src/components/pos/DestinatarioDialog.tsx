import { useState } from 'react'
import { Dialog, FlexBox, Label, Input, Select, Option, Button, Bar, MessageStrip, BusyIndicator } from '@ui5/webcomponents-react'
import type { ISapRegion } from '@/types/sapMaestro'
import { validarRUT } from '@/utils/validations'

// Destinatario de mercancía (ZDES): siempre organización, sin tratamiento
// (correo José 27-10-2026). La zona de transporte es opcional y no se envía a SAP.
export interface IDestinatario {
  rut: string
  nombre1: string
  nombre2: string
  direccion: string
  region: string
  comuna: string
  ciudad: string
  zonaTransporte: string
  correo: string
}

interface Props {
  open: boolean
  /** Crea el destinatario; devuelve un mensaje de error o null si se creó (el diálogo se cierra). */
  onGuardar: (d: IDestinatario) => Promise<string | null>
  onCancelar: () => void
  regiones: ISapRegion[]
}

const VACIO: IDestinatario = {
  rut: '', nombre1: '', nombre2: '', direccion: '', region: '', comuna: '', ciudad: '', zonaTransporte: '', correo: '',
}

export function DestinatarioDialog({ open, onGuardar, onCancelar, regiones }: Props) {
  const [form, setForm] = useState<IDestinatario>(VACIO)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = async () => {
    if (!form.rut || !form.nombre1 || !form.region || !form.comuna || !form.ciudad) {
      setError('Complete los campos obligatorios (*)'); return
    }
    if (!validarRUT(form.rut)) { setError('RUT inválido. Verifique el dígito verificador.'); return }
    setGuardando(true)
    setError(null)
    const errorSap = await onGuardar(form)
    setGuardando(false)
    if (errorSap) { setError(errorSap); return }
    setForm(VACIO)
  }

  const handleCerrar = () => {
    setForm(VACIO)
    setError(null)
    onCancelar()
  }

  const u = (field: keyof IDestinatario, val: string) => setForm(p => ({ ...p, [field]: val }))

  return (
    <Dialog open={open} headerText="Creación destinatario de mercancía" style={{ width: '500px' }}
      footer={<Bar endContent={<FlexBox style={{ gap: '0.5rem' }}>
        <Button design="Transparent" onClick={handleCerrar} disabled={guardando}>Cancelar</Button>
        <Button design="Emphasized" onClick={() => void handleGuardar()} disabled={guardando}>Crear</Button>
      </FlexBox>} />}>
      <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
        {error && <MessageStrip design="Negative" hideCloseButton style={{ whiteSpace: 'pre-wrap' }}>{error}</MessageStrip>}
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px', color: 'var(--sapNegativeColor)' }}>* RUT:</Label>
          <Input value={form.rut} onInput={(e) => u('rut', (e.target as any).value)} style={{ flex: 1 }} placeholder="Ej: 12.345.678-9" />
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px', color: 'var(--sapNegativeColor)' }}>* Nombre 1:</Label>
          <Input value={form.nombre1} onInput={(e) => u('nombre1', (e.target as any).value)} style={{ flex: 1 }} />
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px' }}>Nombre 2:</Label>
          <Input value={form.nombre2} onInput={(e) => u('nombre2', (e.target as any).value)} style={{ flex: 1 }} />
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px' }}>Dirección:</Label>
          <Input value={form.direccion} onInput={(e) => u('direccion', (e.target as any).value)} style={{ flex: 1 }} />
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px', color: 'var(--sapNegativeColor)' }}>* Región:</Label>
          <Select onChange={(e) => u('region', (e.detail?.selectedOption as any)?.dataset?.value ?? '')} style={{ flex: 1 }}>
            <Option data-value="">Seleccione...</Option>
            {regiones.map(r => <Option key={r.Codigo} data-value={r.Codigo} selected={form.region === r.Codigo}>{r.Descripcion}</Option>)}
          </Select>
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px', color: 'var(--sapNegativeColor)' }}>* Comuna:</Label>
          <Input value={form.comuna} onInput={(e) => u('comuna', (e.target as any).value)} style={{ flex: 1 }} />
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px', color: 'var(--sapNegativeColor)' }}>* Ciudad:</Label>
          <Input value={form.ciudad} onInput={(e) => u('ciudad', (e.target as any).value)} style={{ flex: 1 }} />
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px' }}>Zona transporte:</Label>
          <Input value={form.zonaTransporte} onInput={(e) => u('zonaTransporte', (e.target as any).value)} style={{ flex: 1 }} />
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '130px' }}>Correo:</Label>
          <Input value={form.correo} onInput={(e) => u('correo', (e.target as any).value)} style={{ flex: 1 }} />
        </FlexBox>
        <BusyIndicator active={guardando} size="M"><div /></BusyIndicator>
      </div>
    </Dialog>
  )
}
