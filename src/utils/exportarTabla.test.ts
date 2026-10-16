import { describe, it, expect } from 'vitest'
import { generarTexto, generarCsv, generarXlsx, nombreArchivoExport, type ColumnaExport } from './exportarTabla'

interface Fila { cliente: string; monto: number; fecha: string }
const filas: Fila[] = [
  { cliente: 'Ñuñoa Agrícola; "Cía"', monto: 19040, fecha: '05/10/2026' },
  { cliente: 'José Pérez', monto: -3000, fecha: '' },
]
const columnas: ColumnaExport<Fila>[] = [
  { titulo: 'Cliente', valor: (f) => f.cliente },
  { titulo: 'Monto', valor: (f) => f.monto },
  { titulo: 'Fecha', valor: (f) => f.fecha },
]

describe('generarTexto', () => {
  it('debería partir con BOM UTF-8 y separar columnas con tabulador', () => {
    const t = generarTexto(filas, columnas)
    expect(t.charCodeAt(0)).toBe(0xFEFF)
    expect(t.slice(1).split('\r\n')[0]).toBe('Cliente\tMonto\tFecha')
    expect(t).toContain('Ñuñoa Agrícola; "Cía"\t19040\t05/10/2026')
  })

  it('debería cambiar tabuladores y saltos dentro de una celda por espacio', () => {
    const t = generarTexto([{ cliente: 'A\tB\nC', monto: 1, fecha: '' }], columnas)
    expect(t).toContain('A B C\t1\t')
  })
})

describe('generarCsv', () => {
  it('debería usar ; y escapar comillas y punto y coma', () => {
    const t = generarCsv(filas, columnas)
    expect(t.charCodeAt(0)).toBe(0xFEFF)
    const lineas = t.slice(1).split('\r\n')
    expect(lineas[0]).toBe('Cliente;Monto;Fecha')
    expect(lineas[1]).toBe('"Ñuñoa Agrícola; ""Cía""";19040;05/10/2026')
    expect(lineas[2]).toBe('José Pérez;-3000;')
  })
})

describe('generarXlsx', () => {
  it('debería generar un ZIP con la hoja y los textos en UTF-8', () => {
    const datos = generarXlsx(filas, columnas, 'Listado documentos')
    // Firma ZIP "PK\x03\x04"
    expect(Array.from(datos.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
    const texto = new TextDecoder().decode(datos)
    expect(texto).toContain('xl/worksheets/sheet1.xml')
    expect(texto).toContain('<sheet name="Listado documentos"')
    expect(texto).toContain('Ñuñoa Agrícola; &quot;Cía&quot;')
    // Montos como número, no como texto
    expect(texto).toContain('<c r="B2"><v>19040</v></c>')
  })
})

describe('nombreArchivoExport', () => {
  it('debería quitar tildes y espacios y agregar fecha y hora', () => {
    expect(nombreArchivoExport('Caja — Pagarés', new Date(2026, 9, 16, 15, 30))).toBe('caja-pagares_2026-10-16_1530')
  })
})
