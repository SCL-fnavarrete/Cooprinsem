// Caja > Detalle de Pago — reglas de los medios de pago (popups de las pantallas
// del WebDynpro, correo de José 22-10-2026). Funciones puras, testeadas.
// Solo el EFECTIVO se envía a SAP por ahora; el resto se captura y se muestra.
import { MEDIOS_PAGO } from '@/config/sap'
import type { IMedioCapturado, IPagoEntry, MedioPagoCodigo } from '@/types/pago'
import { validarRUT } from '@/utils/validations'
import { formatCLP, formatRUT } from '@/utils/format'

export const esTarjeta = (c: MedioPagoCodigo) => c === 'TARJETA_DEBITO' || c === 'TARJETA_CREDITO'
export const esCheque = (c: MedioPagoCodigo) => c === 'CHEQUE_DIA' || c === 'CHEQUE_FECHA'

export const etiquetaMedio = (c: MedioPagoCodigo) => MEDIOS_PAGO.find((m) => m.codigo === c)?.label ?? c

// Formulario del popup: todos los campos como texto (montos sin puntos, fechas YYYY-MM-DD)
export interface IFormularioMedio {
  monto: string
  rutEmisor: string
  numeroTarjeta: string
  cuotas: string
  numeroOperacion: string
  codigoAutorizacion: string
  fechaGiro: string
  fechaCheque: string
  rutGirador: string
  codigoBanco: string
  plaza: string
  cuentaBancaria: string
  numeroCheque: string
  telefono: string
}

export type ErroresMedio = Partial<Record<keyof IFormularioMedio, string>>

export interface IContextoMedio {
  hoy: string              // YYYY-MM-DD (Chile)
  fechaMaxima: string      // fecha máxima del cheque a fecha (YYYY-MM-DD)
  montoMaximo: number      // tarjetas: lo que falta por pagar sin contar esta vía
}

/** "2026-01-23" + 30 → "2026-02-22" (sin zona horaria: fecha calendario). */
export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d + dias))
  return f.toISOString().slice(0, 10)
}

/** Días de la condición de pago (ej. "30D", "CREDITO 60 DIAS VCT"); null si no trae días. */
export function diasCondicionPago(condicion: string | undefined | null): number | null {
  const m = /(\d{1,3})\s*D/i.exec(condicion ?? '')
  const dias = m ? parseInt(m[1], 10) : NaN
  return Number.isFinite(dias) && dias > 0 ? dias : null
}

/**
 * Fecha máxima del cheque a fecha. PROVISORIO (22-10-2026): hoy + días de la
 * condición de pago del cliente; si no trae días, hoy + parámetro
 * DIAS_MAX_CHEQUE_FECHA. En SAP la condición de pago del cliente hoy viene vacía.
 */
export function fechaMaximaCheque(hoy: string, condicionPago: string | undefined | null, diasDefecto: number): string {
  return sumarDias(hoy, diasCondicionPago(condicionPago) ?? diasDefecto)
}

/** "2026-01-23" → "23.01.2026" (formato de las pantallas del WebDynpro). */
export function fechaPunto(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

export function formularioVacio(hoy: string): IFormularioMedio {
  return {
    monto: '', rutEmisor: '', numeroTarjeta: '', cuotas: '01', numeroOperacion: '', codigoAutorizacion: '',
    fechaGiro: hoy, fechaCheque: hoy, rutGirador: '', codigoBanco: '', plaza: '', cuentaBancaria: '', numeroCheque: '', telefono: '',
  }
}

/** Formulario a partir de un medio ya ingresado (para editarlo). */
export function formularioDesdeMedio(m: IMedioCapturado, hoy: string): IFormularioMedio {
  return {
    ...formularioVacio(hoy),
    monto: String(m.monto),
    ...(m.tarjeta ?? {}),
    ...(m.cheque ? { ...m.cheque } : {}),
  }
}

const soloDigitos = (v: string, min: number, max: number) => new RegExp(`^\\d{${min},${max}}$`).test(v)

/** Errores del formulario según la vía (vacío = válido). */
export function validarMedio(codigo: MedioPagoCodigo, f: IFormularioMedio, ctx: IContextoMedio): ErroresMedio {
  const e: ErroresMedio = {}
  const monto = parseInt(f.monto, 10)
  if (!Number.isFinite(monto) || monto <= 0) e.monto = 'Ingrese un monto mayor a 0'

  if (esTarjeta(codigo)) {
    // Tarjetas: no permiten sobrepago
    if (!e.monto && monto > ctx.montoMaximo) e.monto = `No puede superar lo que falta por pagar (${formatCLP(ctx.montoMaximo)})`
    if (f.rutEmisor && !validarRUT(f.rutEmisor)) e.rutEmisor = 'RUT inválido'
    if (!soloDigitos(f.numeroTarjeta, 4, 4)) e.numeroTarjeta = 'Ingrese los 4 últimos dígitos'
    if (!soloDigitos(f.numeroOperacion, 1, 12)) e.numeroOperacion = 'Solo números (hasta 12)'
    if (!/^[0-9A-Za-z]{1,12}$/.test(f.codigoAutorizacion)) e.codigoAutorizacion = 'Ingrese el código de autorización'
    if (codigo === 'TARJETA_CREDITO') {
      const cuotas = parseInt(f.cuotas, 10)
      if (!soloDigitos(f.cuotas, 1, 2) || cuotas < 1) e.cuotas = 'Cuotas entre 1 y 99'
    }
  }

  if (esCheque(codigo)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fechaGiro)) e.fechaGiro = 'Ingrese la fecha de giro'
    else if (f.fechaGiro > ctx.hoy) e.fechaGiro = 'La fecha de giro no puede ser futura'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fechaCheque)) e.fechaCheque = 'Ingrese la fecha del cheque'
    else if (codigo === 'CHEQUE_DIA' && f.fechaCheque > ctx.hoy) e.fechaCheque = 'Cheque al día: la fecha no puede ser futura (use Cheque a fecha)'
    else if (codigo === 'CHEQUE_FECHA' && f.fechaCheque <= ctx.hoy) e.fechaCheque = 'Cheque a fecha: la fecha debe ser posterior a hoy (use Cheque al día)'
    else if (codigo === 'CHEQUE_FECHA' && f.fechaCheque > ctx.fechaMaxima) e.fechaCheque = `La fecha del cheque supera la fecha máxima (${fechaPunto(ctx.fechaMaxima)})`
    if (!validarRUT(f.rutGirador)) e.rutGirador = f.rutGirador ? 'RUT inválido' : 'Ingrese el RUT del girador'
    if (!f.codigoBanco) e.codigoBanco = 'Seleccione el banco'
    if (!soloDigitos(f.plaza, 1, 4)) e.plaza = 'Solo números (hasta 4)'
    if (!soloDigitos(f.cuentaBancaria, 1, 20)) e.cuentaBancaria = 'Solo números (hasta 20)'
    if (!soloDigitos(f.numeroCheque, 1, 12)) e.numeroCheque = 'Solo números (hasta 12)'
    if (!soloDigitos(f.telefono, 1, 15)) e.telefono = 'Solo números (hasta 15)'
  }
  return e
}

/** Medio listo para guardar a partir del formulario ya validado. */
export function medioDesdeFormulario(codigo: MedioPagoCodigo, f: IFormularioMedio, ctx: IContextoMedio): IMedioCapturado {
  const monto = parseInt(f.monto, 10)
  if (esTarjeta(codigo)) {
    return {
      codigo, monto,
      tarjeta: {
        rutEmisor: f.rutEmisor ? formatRUT(f.rutEmisor) : '',
        numeroTarjeta: f.numeroTarjeta,
        cuotas: codigo === 'TARJETA_CREDITO' ? f.cuotas.padStart(2, '0') : '',
        numeroOperacion: f.numeroOperacion,
        codigoAutorizacion: f.codigoAutorizacion,
      },
    }
  }
  if (esCheque(codigo)) {
    return {
      codigo, monto,
      cheque: {
        fechaGiro: f.fechaGiro,
        fechaCheque: f.fechaCheque,
        fechaMaxima: codigo === 'CHEQUE_FECHA' ? ctx.fechaMaxima : '',
        rutGirador: formatRUT(f.rutGirador),
        codigoBanco: f.codigoBanco,
        plaza: f.plaza,
        cuentaBancaria: f.cuentaBancaria,
        numeroCheque: f.numeroCheque,
        telefono: f.telefono,
      },
    }
  }
  return { codigo, monto }
}

/** Resumen que se muestra debajo del botón de la vía. */
export function resumenMedio(m: IMedioCapturado, nombreBanco?: (codigo: string) => string): string {
  if (m.tarjeta) {
    const partes = [`**** ${m.tarjeta.numeroTarjeta}`]
    if (m.codigo === 'TARJETA_CREDITO') partes.push(`${parseInt(m.tarjeta.cuotas, 10)} cuota(s)`)
    partes.push(`Op. ${m.tarjeta.numeroOperacion}`, `Aut. ${m.tarjeta.codigoAutorizacion}`, formatCLP(m.monto))
    return partes.join(' · ')
  }
  if (m.cheque) {
    const banco = nombreBanco?.(m.cheque.codigoBanco) || m.cheque.codigoBanco
    return [`N° ${m.cheque.numeroCheque}`, banco, fechaPunto(m.cheque.fechaCheque), formatCLP(m.monto)].join(' · ')
  }
  return formatCLP(m.monto)
}

export interface ITotalesMedios {
  totalPagado: number
  vuelto: number            // solo sale del efectivo
  excedenteCheques: number  // sobrepago con cheque: saldo a favor en cta. cte.
}

/**
 * Totales de los medios ingresados. El exceso sobre el total a pagar se
 * devuelve primero como vuelto (hasta el efectivo recibido); lo que sobre de
 * cheques queda a favor del cliente. Las tarjetas no permiten sobrepago.
 */
export function totalesMedios(medios: IMedioCapturado[], totalAPagar: number): ITotalesMedios {
  const totalPagado = medios.reduce((s, m) => s + m.monto, 0)
  const efectivo = medios.filter((m) => m.codigo === 'EFECTIVO').reduce((s, m) => s + m.monto, 0)
  const excedente = Math.max(0, totalPagado - totalAPagar)
  const vuelto = Math.min(excedente, efectivo)
  return { totalPagado, vuelto, excedenteCheques: excedente - vuelto }
}

/** Filas de "Medios de Pago Seleccionados" (orden de los botones + vuelto). */
export function filasMediosPago(medios: IMedioCapturado[], vuelto: number, fechaHoy: string): IPagoEntry[] {
  const filas: IPagoEntry[] = MEDIOS_PAGO
    .map((mp) => medios.find((m) => m.codigo === mp.codigo))
    .filter((m): m is IMedioCapturado => !!m)
    .map((m) => ({
      id: m.codigo,
      tipoPago: etiquetaMedio(m.codigo),
      numero: m.tarjeta ? `**** ${m.tarjeta.numeroTarjeta}` : m.cheque?.numeroCheque ?? '',
      fecha: m.cheque ? fechaPunto(m.cheque.fechaCheque) : fechaHoy,
      cuota: m.tarjeta?.cuotas ?? '',
      monto: m.monto,
    }))
  if (vuelto > 0) filas.push({ id: 'VUELTO', tipoPago: 'VUELTO EFECTIVO', numero: '', fecha: fechaHoy, cuota: '', monto: -vuelto })
  return filas
}
