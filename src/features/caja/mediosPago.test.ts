import { describe, it, expect } from 'vitest'
import {
  sumarDias, diasCondicionPago, fechaMaximaCheque, fechaPunto, formularioVacio, validarMedio, medioDesdeFormulario,
  resumenMedio, totalesMedios, filasMediosPago, formularioDesdeMedio, type IContextoMedio, type IFormularioMedio,
} from './mediosPago'

const ctx: IContextoMedio = { hoy: '2026-10-22', fechaMaxima: '2026-11-21', montoMaximo: 17999 }

const tarjeta = (extra: Partial<IFormularioMedio> = {}): IFormularioMedio => ({
  ...formularioVacio(ctx.hoy), monto: '17999', rutEmisor: '66666666-6', numeroTarjeta: '0000', numeroOperacion: '000000', codigoAutorizacion: '000000', ...extra,
})
const cheque = (extra: Partial<IFormularioMedio> = {}): IFormularioMedio => ({
  ...formularioVacio(ctx.hoy), monto: '3000000', rutGirador: '96.719.960-5', codigoBanco: '037', plaza: '283',
  cuentaBancaria: '0584335469', numeroCheque: '20111', telefono: '000', ...extra,
})

describe('fecha máxima del cheque a fecha', () => {
  it('debería sumar los días de la condición de pago o, sin días, los del parámetro', () => {
    expect(sumarDias('2026-12-20', 30)).toBe('2027-01-19')
    expect(diasCondicionPago('CREDITO 60 DIAS VCT')).toBe(60)
    expect(diasCondicionPago('30D')).toBe(30)
    expect(diasCondicionPago('CONT')).toBeNull()
    expect(diasCondicionPago('')).toBeNull()
    expect(fechaMaximaCheque('2026-10-22', 'CREDITO 60 DIAS', 30)).toBe('2026-12-21')
    expect(fechaMaximaCheque('2026-10-22', '', 30)).toBe('2026-11-21')
    expect(fechaPunto('2026-01-23')).toBe('23.01.2026')
  })
})

describe('validarMedio', () => {
  it('efectivo debería exigir solo un monto mayor a 0 y permitir sobrepago (vuelto)', () => {
    expect(validarMedio('EFECTIVO', { ...formularioVacio(ctx.hoy), monto: '0' }, ctx)).toHaveProperty('monto')
    expect(validarMedio('EFECTIVO', { ...formularioVacio(ctx.hoy), monto: '50000' }, ctx)).toEqual({})
  })

  it('tarjeta de débito con los datos del ejemplo debería ser válida', () => {
    expect(validarMedio('TARJETA_DEBITO', tarjeta(), ctx)).toEqual({})
  })

  it('tarjeta no debería permitir sobrepago ni datos incompletos', () => {
    const e = validarMedio('TARJETA_DEBITO', tarjeta({ monto: '18000', numeroTarjeta: '12', numeroOperacion: '', codigoAutorizacion: '', rutEmisor: '6666666-1' }), ctx)
    expect(Object.keys(e).sort()).toEqual(['codigoAutorizacion', 'monto', 'numeroOperacion', 'numeroTarjeta', 'rutEmisor'])
    expect(e.monto).toContain('17.999')
  })

  it('tarjeta de crédito debería exigir cuotas válidas', () => {
    expect(validarMedio('TARJETA_CREDITO', tarjeta({ cuotas: '03' }), ctx)).toEqual({})
    expect(validarMedio('TARJETA_CREDITO', tarjeta({ cuotas: '0' }), ctx)).toHaveProperty('cuotas')
  })

  it('cheque al día con los datos del ejemplo debería ser válido y permitir sobrepago', () => {
    expect(validarMedio('CHEQUE_DIA', cheque({ monto: '9999999' }), ctx)).toEqual({})
  })

  it('cheque al día no debería aceptar fecha futura; cheque a fecha sí, hasta la fecha máxima', () => {
    expect(validarMedio('CHEQUE_DIA', cheque({ fechaCheque: '2026-10-30' }), ctx)).toHaveProperty('fechaCheque')
    expect(validarMedio('CHEQUE_FECHA', cheque({ fechaCheque: '2026-10-22' }), ctx).fechaCheque).toContain('posterior a hoy')
    expect(validarMedio('CHEQUE_FECHA', cheque({ fechaCheque: '2026-11-21' }), ctx)).toEqual({})
    expect(validarMedio('CHEQUE_FECHA', cheque({ fechaCheque: '2026-11-22' }), ctx).fechaCheque).toContain('21.11.2026')
  })

  it('cheque debería exigir RUT girador válido, banco y datos numéricos', () => {
    const e = validarMedio('CHEQUE_DIA', cheque({ rutGirador: '', codigoBanco: '', plaza: 'x', cuentaBancaria: '', numeroCheque: 'abc', telefono: '', fechaGiro: '2026-10-23' }), ctx)
    expect(Object.keys(e).sort()).toEqual(['codigoBanco', 'cuentaBancaria', 'fechaGiro', 'numeroCheque', 'plaza', 'rutGirador', 'telefono'])
  })
})

describe('medios capturados', () => {
  it('debería armar el medio, su resumen y volver a editarlo con los mismos datos', () => {
    const credito = medioDesdeFormulario('TARJETA_CREDITO', tarjeta({ cuotas: '3', rutEmisor: '666666666' }), ctx)
    expect(credito.tarjeta).toMatchObject({ cuotas: '03', rutEmisor: '66.666.666-6' })
    expect(resumenMedio(credito)).toBe('**** 0000 · 3 cuota(s) · Op. 000000 · Aut. 000000 · $17.999')

    const chequeFecha = medioDesdeFormulario('CHEQUE_FECHA', cheque({ fechaCheque: '2026-11-10' }), ctx)
    expect(chequeFecha.cheque).toMatchObject({ fechaMaxima: '2026-11-21', rutGirador: '96.719.960-5' })
    expect(resumenMedio(chequeFecha, (c) => (c === '037' ? 'Banco Santander' : ''))).toBe('N° 20111 · Banco Santander · 10.11.2026 · $3.000.000')
    expect(formularioDesdeMedio(chequeFecha, ctx.hoy)).toMatchObject({ monto: '3000000', numeroCheque: '20111', fechaCheque: '2026-11-10' })

    expect(resumenMedio({ codigo: 'EFECTIVO', monto: 17999 })).toBe('$17.999')
  })

  it('debería dar vuelto solo del efectivo y dejar el sobrepago de cheques a favor', () => {
    // Total 100.000: tarjeta 30.000 + cheque 50.000 + efectivo 40.000 → exceso 20.000, todo vuelto
    expect(totalesMedios([
      { codigo: 'TARJETA_DEBITO', monto: 30000 }, { codigo: 'CHEQUE_DIA', monto: 50000 }, { codigo: 'EFECTIVO', monto: 40000 },
    ], 100000)).toEqual({ totalPagado: 120000, vuelto: 20000, excedenteCheques: 0 })
    // Cheque 120.000 + efectivo 10.000 → exceso 30.000: 10.000 vuelto, 20.000 a favor
    expect(totalesMedios([{ codigo: 'CHEQUE_DIA', monto: 120000 }, { codigo: 'EFECTIVO', monto: 10000 }], 100000))
      .toEqual({ totalPagado: 130000, vuelto: 10000, excedenteCheques: 20000 })
  })

  it('las filas deberían seguir el orden de los botones y terminar con el vuelto', () => {
    const filas = filasMediosPago([
      { codigo: 'EFECTIVO', monto: 50000 },
      medioDesdeFormulario('CHEQUE_DIA', cheque({ monto: '60000' }), ctx),
      medioDesdeFormulario('TARJETA_CREDITO', tarjeta({ monto: '10000', cuotas: '2' }), ctx),
    ], 20000, '22-10-2026')
    expect(filas.map((f) => f.tipoPago)).toEqual(['EFECTIVO', 'TARJETA DE CREDITO', 'CHEQUE AL DIA', 'VUELTO EFECTIVO'])
    expect(filas[1]).toMatchObject({ numero: '**** 0000', cuota: '02' })
    expect(filas[2]).toMatchObject({ numero: '20111', fecha: '22.10.2026' })
    expect(filas[3].monto).toBe(-20000)
  })
})
