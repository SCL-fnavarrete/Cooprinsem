import { describe, it, expect } from 'vitest'
import {
  DATO_PENDIENTE, valorOPendiente, fechaCorta, fechaLarga, montoTabla, hoyChileISO, filasCuentaCorriente, consolidadoDeuda,
} from './estadoCuentaCalculos'
import type { IPartidaCtaCte } from '@/types/ctaCte'

function partida(documento: string, monto: number, fechaVencimiento: string, extra: Partial<IPartidaCtaCte> = {}): IPartidaCtaCte {
  return {
    documento, posicion: '001', ejercicio: '2026', tipoDocumento: 'D1', tipoDocumentoNombre: 'Factura Elect', folio: '',
    documentoFacturacion: '', debeHaber: 'S', moneda: 'CLP', monto, monedaDocumento: 'CLP', montoDocumento: monto,
    fechaDocumento: '2026-07-10', fechaVencimiento, diasMora: 0, bloqueoPago: '', sucursal: '', ...extra,
  }
}

describe('estado de cuenta — formatos', () => {
  it('debería formatear fechas, montos y datos pendientes como los PDF de ejemplo', () => {
    expect(fechaCorta('2025-11-03')).toBe('03.11.25')
    expect(fechaLarga('2025-12-11')).toBe('11.12.2025')
    expect(fechaCorta('')).toBe('')
    expect(montoTabla(1799901)).toBe('1.799.901')
    expect(montoTabla(-76160)).toBe('-76.160')
    expect(valorOPendiente(null)).toBe(DATO_PENDIENTE)
    expect(valorOPendiente('  ')).toBe(DATO_PENDIENTE)
    expect(valorOPendiente('Osorno')).toBe('Osorno')
  })

  it('debería usar la fecha de hoy en Chile, también de noche', () => {
    expect(hoyChileISO(new Date('2026-10-23T02:30:00Z'))).toBe('2026-10-22')
  })
})

describe('filasCuentaCorriente', () => {
  it('debería acumular el saldo en el orden recibido y completar las columnas del PDF', () => {
    const filas = filasCuentaCorriente([
      partida('1800180442', 52063, '2026-07-12', { folio: '033-5284238', sucursal: 'D250' }),
      partida('1800218271', 123760, '2026-07-12'),
    ], (codigo) => (codigo === 'D250' ? 'Los Muermos' : ''))
    expect(filas.map((f) => f.saldo)).toEqual([52063, 175823])
    expect(filas[0]).toMatchObject({
      destino: '', nroDocumento: '033-5284238', nroDoctoInterno: '1800180442', clase: 'Factura Elect',
      oficina: 'Los Muermos', cuotas: '1 de 1', fechaEmision: '10.07.26', fechaVencimiento: '12.07.26', acc: '', moneda: 'CLP',
    })
    // Sin folio ni sucursal informados por SAP
    expect(filas[1]).toMatchObject({ nroDocumento: '', oficina: '' })
  })
})

describe('consolidadoDeuda', () => {
  // Totales del "Estado de cuenta ejemplo completo" al 20.07.2026
  it('debería separar deuda vencida y por vencer según la fecha del estado de cuenta', () => {
    const cuentaCorriente = [
      { monto: 52063, fechaVencimiento: '2026-07-12' }, { monto: 123760, fechaVencimiento: '2026-07-12' },
      { monto: 60266, fechaVencimiento: '2026-07-12' }, { monto: 1345, fechaVencimiento: '2026-07-12' },
      { monto: 32199, fechaVencimiento: '2026-07-12' }, { monto: 4937, fechaVencimiento: '2026-07-12' },
      { monto: 68350, fechaVencimiento: '2026-08-12' }, { monto: 1451, fechaVencimiento: '2026-08-12' },
      { monto: 35555, fechaVencimiento: '2026-08-12' }, { monto: 28304, fechaVencimiento: '2026-08-12' },
    ]
    expect(consolidadoDeuda({ protestados: [1044654], cuentaCorriente, cartera: [159250, 1235299, 1260830], fecha: '2026-07-20' })).toEqual({
      protestados: 1044654, vencida: 274570, totalVencida: 1319224, porVencer: 133660, cartera: 2655379, totalGeneral: 4108263,
    })
  })

  it('con solo Cuenta Corriente por vencer debería dar el total del ejemplo de Laguna Verde', () => {
    const r = consolidadoDeuda({ protestados: [], cuentaCorriente: [{ monto: 5109442, fechaVencimiento: '2025-12-12' }], cartera: [], fecha: '2025-12-11' })
    expect(r).toMatchObject({ vencida: 0, totalVencida: 0, porVencer: 5109442, totalGeneral: 5109442 })
  })
})
