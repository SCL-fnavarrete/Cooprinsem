import { useState } from 'react'
import { Dialog, FlexBox, Label, Input, Select, Option, Button, Bar, MessageStrip, BusyIndicator } from '@ui5/webcomponents-react'
import type { ISapRegion } from '@/types/sapMaestro'
import { validarRUT } from '@/utils/validations'

// Persona que retira (ZPER): nombre y apellido separados, celular, correo y
// dirección (correo José 27-10-2026). Con ZB queda colgada del destinatario
// elegido, como las personas que retiran que ya existen en SAP.
export interface IPersonaRetira {
  tratamiento: string
  rut: string
  nombre: string
  apellido: string
  celular: string
  correo: string
  direccion: string
  region: string
  comuna: string
  ciudad: string
  destinatario: string
}

export interface IOpcionDestinatario {
  codigo: string
  nombre: string
}

interface Props {
  open: boolean
  /** Crea la persona; devuelve un mensaje de error o null si se creó (el diálogo se cierra). */
  onGuardar: (p: IPersonaRetira) => Promise<string | null>
  onCancelar: () => void
  regiones: ISapRegion[]
  destinatarios: IOpcionDestinatario[]
}

const vacio = (destinatario: string): IPersonaRetira => ({
  tratamiento: 'Señor', rut: '', nombre: '', apellido: '', celular: '', correo: '',
  direccion: '', region: '', comuna: '', ciudad: '', destinatario,
})

export function PersonaRetiraDialog({ open, onGuardar, onCancelar, regiones, destinatarios }: Props) {
  const primerDestinatario = destinatarios[0]?.codigo ?? ''
  const [form, setForm] = useState<IPersonaRetira>(vacio(primerDestinatario))
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  // Si el destinatario elegido ya no está en la lista, se usa el primero
  const destinatario = destinatarios.some((d) => d.codigo === form.destinatario) ? form.destinatario : primerDestinatario

  const handleGuardar = async () => {
    if (!form.rut || !form.nombre || !form.apellido || !form.direccion || !form.region || !form.comuna || !form.ciudad) {
      setError('Complete los campos obligatorios (*)'); return
    }
    if (!validarRUT(form.rut)) { setError('RUT inválido. Verifique el dígito verificador.'); return }
    setGuardando(true)
    setError(null)
    const errorSap = await onGuardar({ ...form, destinatario })
    setGuardando(false)
    if (errorSap) { setError(errorSap); return }
    setForm(vacio(primerDestinatario))
  }

  const handleCerrar = () => {
    setForm(vacio(primerDestinatario))
    setError(null)
    onCancelar()
  }

  const u = (field: keyof IPersonaRetira, val: string) => setForm(p => ({ ...p, [field]: val }))

  const campo = (etiqueta: string, field: keyof IPersonaRetira, obligatorio = false, placeholder?: string) => (
    <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
      <Label style={{ width: '120px', ...(obligatorio ? { color: 'var(--sapNegativeColor)' } : {}) }}>{obligatorio ? `* ${etiqueta}` : etiqueta}:</Label>
      <Input value={form[field]} onInput={(e) => u(field, (e.target as any).value)} style={{ flex: 1 }} placeholder={placeholder} />
    </FlexBox>
  )

  return (
    <Dialog open={open} headerText="Creación Persona Retira" style={{ width: '480px' }}
      footer={<Bar endContent={<FlexBox style={{ gap: '0.5rem' }}>
        <Button design="Transparent" onClick={handleCerrar} disabled={guardando}>Cancelar</Button>
        <Button design="Emphasized" onClick={() => void handleGuardar()} disabled={guardando}>Crear</Button>
      </FlexBox>} />}>
      <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
        {error && <MessageStrip design="Negative" hideCloseButton style={{ whiteSpace: 'pre-wrap' }}>{error}</MessageStrip>}
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '120px', color: 'var(--sapNegativeColor)' }}>* Destinatario:</Label>
          <Select onChange={(e) => u('destinatario', (e.detail?.selectedOption as any)?.dataset?.value ?? '')} style={{ flex: 1 }} aria-label="Destinatario de la persona">
            {destinatarios.map((d) => (
              <Option key={d.codigo} data-value={d.codigo} selected={destinatario === d.codigo}>{d.codigo} — {d.nombre}</Option>
            ))}
          </Select>
        </FlexBox>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '120px', color: 'var(--sapNegativeColor)' }}>* Tratamiento:</Label>
          <Select onChange={(e) => u('tratamiento', (e.detail?.selectedOption as any)?.dataset?.value ?? 'Señor')} style={{ flex: 1 }}>
            <Option data-value="Señora" selected={form.tratamiento === 'Señora'}>Señora</Option>
            <Option data-value="Señor" selected={form.tratamiento === 'Señor'}>Señor</Option>
          </Select>
        </FlexBox>
        {campo('RUT', 'rut', true, 'Ej: 12.345.678-5')}
        {campo('Nombre', 'nombre', true)}
        {campo('Apellido', 'apellido', true)}
        {campo('Celular', 'celular', false, 'Ej: 912345678')}
        {campo('Correo', 'correo')}
        {campo('Dirección', 'direccion', true)}
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label style={{ width: '120px', color: 'var(--sapNegativeColor)' }}>* Región:</Label>
          <Select onChange={(e) => u('region', (e.detail?.selectedOption as any)?.dataset?.value ?? '')} style={{ flex: 1 }}>
            <Option data-value="">Seleccione...</Option>
            {regiones.map(r => <Option key={r.Codigo} data-value={r.Codigo} selected={form.region === r.Codigo}>{r.Descripcion}</Option>)}
          </Select>
        </FlexBox>
        {campo('Comuna', 'comuna', true)}
        {campo('Ciudad', 'ciudad', true)}
        <BusyIndicator active={guardando} size="M"><div /></BusyIndicator>
      </div>
    </Dialog>
  )
}
