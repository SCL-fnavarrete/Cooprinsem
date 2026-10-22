import { describe, it, expect } from 'vitest'
import { generarPdfEstadoCuenta, type IDatosPdfEstadoCuenta } from './estadoCuentaPdf'
import { consolidadoDeuda, filasCuentaCorriente } from './estadoCuentaCalculos'
import type { IPartidaCtaCte } from '@/types/ctaCte'

const partidas: IPartidaCtaCte[] = [
  { documento: '1800000054', posicion: '001', ejercicio: '2026', tipoDocumento: 'D1', tipoDocumentoNombre: 'Factura Elect', folio: '033-5108474',
    documentoFacturacion: '', debeHaber: 'S', moneda: 'CLP', monto: 32451, monedaDocumento: 'CLP', montoDocumento: 32451,
    fechaDocumento: '2026-10-19', fechaVencimiento: '2026-11-12', diasMora: -21, bloqueoPago: '', sucursal: 'D190' },
]

function datos(): IDatosPdfEstadoCuenta {
  return {
    encabezado: {
      success: true,
      cliente: { codigo: '10000003', nombre: 'Sergio Cutiño', rut: '16029421-3', direccion: 'San rafael norte 60', ciudad: 'Valdivia' },
      empresa: { nombre: 'Cooprinsem', casaMatriz: 'Osorno', direccion: null, fono: null, fax: null, web: null },
    },
    codigoCliente: '10000003',
    nombreCliente: 'Sergio Cutiño',
    fecha: '2026-10-22',
    filas: filasCuentaCorriente(partidas, () => 'Osorno'),
    consolidado: consolidadoDeuda({ protestados: [], cuentaCorriente: partidas, cartera: [], fecha: '2026-10-22' }),
  }
}

// jsPDF sin compresión deja el texto legible en la salida
describe('generarPdfEstadoCuenta', () => {
  it('debería armar las 2 páginas con membrete, cliente, las 3 tablas, el consolidado y Formas de Pagos', () => {
    const doc = generarPdfEstadoCuenta(datos())
    expect(doc.getNumberOfPages()).toBe(2)
    const texto = doc.output()
    for (const t of [
      'Casa Matriz:', 'Osorno', 'DATO PENDIENTE', 'SERGIO CUTI', 'SAN RAFAEL NORTE 60', 'Valdivia', 'Rut: 16029421-3', 'Cta. 10000003',
      'Estado de Cuenta al 22.10.2026', 'Documentos protestados:', 'Cuenta Corriente:', 'Documentos en cartera:',
      '033-5108474', '1800000054', 'Factura Elect', '19.10.26', '12.11.26', '32.451', 'Sin documentos',
      'Detalle Consolidado de Deuda:', 'Deuda por Vencer CLP', 'Total General CLP', 'Total CP01',
      'Formas de Pagos:', 'Banco Santander', 'ctasctes@cooprinsem.cl', 'COOPRINSEM', 'gina 1 de 2', 'gina 2 de 2',
    ]) {
      expect(texto, t).toContain(t)
    }
  })

  it('sin partidas debería mostrar "Sin documentos" también en Cuenta Corriente', () => {
    const d = { ...datos(), filas: [], consolidado: consolidadoDeuda({ protestados: [], cuentaCorriente: [], cartera: [], fecha: '2026-10-22' }) }
    const texto = generarPdfEstadoCuenta(d).output()
    expect(texto.split('Sin documentos').length - 1).toBe(3)
  })
})
