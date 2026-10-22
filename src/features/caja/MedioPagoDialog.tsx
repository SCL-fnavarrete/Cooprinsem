import { useEffect, useState } from 'react'
import {
  Dialog,
  Bar,
  Button,
  Input,
  Label,
  Select,
  Option,
  DatePicker,
  MessageStrip,
  Text,
} from '@ui5/webcomponents-react'
import type { IMedioCapturado, MedioPagoCodigo } from '@/types/pago'
import type { ISapBanco } from '@/types/sapMaestro'
import { formatRUT } from '@/utils/format'
import {
  esTarjeta, esCheque, formularioVacio, formularioDesdeMedio, validarMedio, medioDesdeFormulario, fechaPunto,
  type IFormularioMedio, type ErroresMedio,
} from './mediosPago'

// Popup de una vía de pago (Caja > Detalle de Pago). Replica los datos que pide
// el WebDynpro para cada medio (correo de José 22-10-2026). Si la vía ya tiene
// datos se abre con ellos: Aceptar los reemplaza, Limpiar quita el medio y
// Cancelar cierra sin cambios. Un solo medio por cobro: aceptar una vía limpia
// la que estaba ingresada (se avisa en el popup).

const TITULOS: Record<MedioPagoCodigo, string> = {
  EFECTIVO: 'Forma de pago Efectivo',
  TARJETA_DEBITO: 'Forma de pago Tarjeta Débito',
  TARJETA_CREDITO: 'Forma de pago Tarjeta de Crédito',
  CHEQUE_DIA: 'Forma de pago Cheque al día',
  CHEQUE_FECHA: 'Forma de pago Cheque a fecha',
  VALE_VISTA: 'Forma de pago Vale Vista',
}

interface MedioPagoDialogProps {
  codigo: MedioPagoCodigo | null      // null = cerrado
  medioActual?: IMedioCapturado        // datos ya ingresados en esta vía
  montoSugerido: number                // lo que falta por pagar
  montoMaximo: number                  // tarjetas: sin sobrepago
  medioReemplazado?: string            // etiqueta del medio ya ingresado que se limpiará al aceptar
  hoy: string                          // YYYY-MM-DD
  fechaMaxima: string                  // cheque a fecha
  rutCliente?: string
  bancos: ISapBanco[]
  onAceptar: (medio: IMedioCapturado) => void
  onQuitar: (codigo: MedioPagoCodigo) => void
  onCancelar: () => void
}

type Campo = keyof IFormularioMedio

export function MedioPagoDialog({
  codigo, medioActual, montoSugerido, montoMaximo, medioReemplazado, hoy, fechaMaxima, rutCliente, bancos, onAceptar, onQuitar, onCancelar,
}: MedioPagoDialogProps) {
  const [form, setForm] = useState<IFormularioMedio>(() => formularioVacio(hoy))
  const [intentado, setIntentado] = useState(false)

  // Al abrir: datos ya ingresados, o un formulario nuevo con el monto pendiente y el RUT del cliente
  useEffect(() => {
    if (!codigo) return
    setIntentado(false)
    if (medioActual) {
      setForm(formularioDesdeMedio(medioActual, hoy))
      return
    }
    const rut = rutCliente ? formatRUT(rutCliente) : ''
    setForm({
      ...formularioVacio(hoy),
      monto: montoSugerido > 0 ? String(montoSugerido) : '',
      rutEmisor: esTarjeta(codigo) ? rut : '',
      rutGirador: esCheque(codigo) ? rut : '',
      fechaCheque: codigo === 'CHEQUE_FECHA' ? '' : hoy,
    })
  }, [codigo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!codigo) return null

  const ctx = { hoy, fechaMaxima, montoMaximo }
  const errores: ErroresMedio = intentado ? validarMedio(codigo, form, ctx) : {}
  const set = (campo: Campo, valor: string) => setForm((f) => ({ ...f, [campo]: valor }))

  const aceptar = () => {
    setIntentado(true)
    if (Object.keys(validarMedio(codigo, form, ctx)).length > 0) return
    onAceptar(medioDesdeFormulario(codigo, form, ctx))
  }

  const limpiar = () => {
    if (medioActual) {
      onQuitar(codigo)
      return
    }
    setIntentado(false)
    setForm({ ...formularioVacio(hoy), fechaCheque: codigo === 'CHEQUE_FECHA' ? '' : hoy })
  }

  const alPresionarTecla = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      aceptar()
    }
  }

  const campoTexto = (campo: Campo, etiqueta: string, opciones: { requerido?: boolean; maxLength?: number; soloDigitos?: boolean } = {}) => (
    <CampoFila etiqueta={etiqueta} requerido={opciones.requerido} error={errores[campo]} campo={campo}>
      <Input
        value={form[campo]}
        maxlength={opciones.maxLength}
        valueState={errores[campo] ? 'Negative' : 'None'}
        onInput={(e) => {
          const v = String(e.target.value ?? '')
          set(campo, opciones.soloDigitos ? v.replace(/\D/g, '') : v)
        }}
        onKeyDown={alPresionarTecla}
        accessibleName={etiqueta}
        style={{ width: '100%' }}
        data-testid={`medio-campo-${campo}`}
      />
    </CampoFila>
  )

  const campoFecha = (campo: 'fechaGiro' | 'fechaCheque', etiqueta: string) => (
    <CampoFila etiqueta={etiqueta} requerido error={errores[campo]} campo={campo}>
      <DatePicker
        value={form[campo]}
        valueFormat="yyyy-MM-dd"
        displayFormat="dd.MM.yyyy"
        placeholder="dd.mm.aaaa"
        valueState={errores[campo] ? 'Negative' : 'None'}
        // UI5 2.20 marca valid=false al combinar valueFormat y displayFormat aunque la
        // fecha sea correcta: se acepta el valor si viene en YYYY-MM-DD (validarMedio revisa el resto)
        onChange={(e) => set(campo, /^\d{4}-\d{2}-\d{2}$/.test(e.detail.value) ? e.detail.value : '')}
        accessibleName={etiqueta}
        style={{ width: '100%' }}
        data-testid={`medio-campo-${campo}`}
      />
    </CampoFila>
  )

  const montoMostrado = form.monto ? `$${parseInt(form.monto, 10).toLocaleString('es-CL')}` : ''

  return (
    <Dialog
      open
      headerText={TITULOS[codigo]}
      onClose={onCancelar}
      style={{ width: 'min(480px, 95vw)' }}
      data-testid="medio-pago-dialog"
      footer={
        <Bar
          endContent={
            <>
              <Button design="Emphasized" onClick={aceptar} data-testid="medio-aceptar">Aceptar</Button>
              <Button design="Transparent" onClick={limpiar} tooltip={medioActual ? 'Quita este medio de pago' : 'Vacía el formulario'} data-testid="medio-limpiar">
                Limpiar
              </Button>
              <Button design="Transparent" onClick={onCancelar} data-testid="medio-cancelar">Cancelar</Button>
            </>
          }
        />
      }
    >
      <div style={{ display: 'grid', gap: '0.5rem', padding: '0.5rem 0' }}>
        {medioReemplazado && (
          <MessageStrip design="Critical" hideCloseButton data-testid="medio-aviso-reemplazo">
            Ya ingresó un pago con {medioReemplazado}. Al aceptar, ese pago se limpia y queda solo este medio.
          </MessageStrip>
        )}
        {codigo === 'CHEQUE_FECHA' && (
          <Text data-testid="medio-fecha-maxima">
            <b>Fecha máxima cheque:</b> {fechaPunto(fechaMaxima)}
          </Text>
        )}

        {esTarjeta(codigo) && (
          <>
            {campoTexto('rutEmisor', 'RUT emisor', { maxLength: 12 })}
            {campoTexto('numeroTarjeta', 'Número de tarjeta (4 últimos)', { requerido: true, maxLength: 4, soloDigitos: true })}
            {codigo === 'TARJETA_CREDITO' && campoTexto('cuotas', 'Cuotas', { requerido: true, maxLength: 2, soloDigitos: true })}
          </>
        )}

        {esCheque(codigo) && (
          <>
            {campoFecha('fechaGiro', 'Fecha giro')}
            {campoFecha('fechaCheque', 'Fecha cheque')}
            {campoTexto('rutGirador', 'RUT girador', { requerido: true, maxLength: 12 })}
            <CampoFila etiqueta="Código bancario" requerido error={errores.codigoBanco} campo="codigoBanco">
              <Select
                onChange={(e) => set('codigoBanco', (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? '')}
                valueState={errores.codigoBanco ? 'Negative' : 'None'}
                accessibleName="Código bancario"
                style={{ width: '100%' }}
                data-testid="medio-campo-codigoBanco"
              >
                <Option data-id="" selected={!form.codigoBanco}>— Seleccione el banco —</Option>
                {bancos.map((b) => (
                  <Option key={b.BankKey} data-id={b.BankKey} selected={form.codigoBanco === b.BankKey}>
                    {b.BankKey} - {b.BankName}
                  </Option>
                ))}
              </Select>
            </CampoFila>
            {campoTexto('plaza', 'Plaza', { requerido: true, maxLength: 4, soloDigitos: true })}
            {campoTexto('cuentaBancaria', 'Cuenta bancaria', { requerido: true, maxLength: 20, soloDigitos: true })}
            {campoTexto('numeroCheque', 'N° cheque', { requerido: true, maxLength: 12, soloDigitos: true })}
          </>
        )}

        <CampoFila etiqueta={esTarjeta(codigo) ? 'Valor total' : 'Monto'} requerido error={errores.monto} campo="monto">
          <Input
            value={montoMostrado}
            valueState={errores.monto ? 'Negative' : 'None'}
            onInput={(e) => set('monto', String(e.target.value ?? '').replace(/\D/g, ''))}
            onKeyDown={alPresionarTecla}
            accessibleName="Monto"
            style={{ width: '100%' }}
            data-testid="medio-campo-monto"
          />
        </CampoFila>

        {esTarjeta(codigo) && (
          <>
            {campoTexto('numeroOperacion', 'Número de operación', { requerido: true, maxLength: 12, soloDigitos: true })}
            {campoTexto('codigoAutorizacion', 'Código de autorización', { requerido: true, maxLength: 12 })}
          </>
        )}
        {esCheque(codigo) && campoTexto('telefono', 'N° teléfono', { requerido: true, maxLength: 15, soloDigitos: true })}

        {esTarjeta(codigo) && (
          <MessageStrip design="Information" hideCloseButton>
            Las tarjetas no permiten sobrepago: el valor no puede superar lo que falta por pagar.
          </MessageStrip>
        )}
        {esCheque(codigo) && (
          <MessageStrip design="Information" hideCloseButton>
            Si el cheque supera lo que falta por pagar, la diferencia queda como saldo a favor del cliente.
          </MessageStrip>
        )}
      </div>
    </Dialog>
  )
}

function CampoFila({ etiqueta, requerido, error, campo, children }: {
  etiqueta: string
  requerido?: boolean
  error?: string
  campo: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 40%) 1fr', gap: '0.5rem', alignItems: 'center' }}>
      <Label required={requerido} showColon>{etiqueta}</Label>
      <div>
        {children}
        {error && (
          <div style={{ color: 'var(--sapNegativeColor, #bb0000)', fontSize: '0.75rem', marginTop: '0.125rem' }} data-testid={`medio-error-${campo}`}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
