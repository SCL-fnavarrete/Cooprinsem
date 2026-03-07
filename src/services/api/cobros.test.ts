import { describe, it, expect } from 'vitest'
import { registrarCobroEfectivo } from './cobros'

describe('registrarCobroEfectivo', () => {
  it('registra cobro exitosamente y retorna BELNR clase W', async () => {
    const resultado = await registrarCobroEfectivo({
      kunnr: '0001000001',
      monto: 500000,
      montoRecibido: 500000,
      medio_pago: 'EFECTIVO',
      belnrs_cancelados: ['1900000001'],
    })

    expect(resultado.BELNR).toBeTruthy()
    expect(resultado.BLART).toBe('W')
    expect(resultado.BUKRS).toBe('COOP')
    expect(resultado.status).toBe('OK')
  })

  it('lanza error si monto es 0', async () => {
    await expect(
      registrarCobroEfectivo({
        kunnr: '0001000001',
        monto: 0,
        montoRecibido: 0,
        medio_pago: 'EFECTIVO',
        belnrs_cancelados: [],
      })
    ).rejects.toThrow()
  })
})
