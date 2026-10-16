// Exportación de tablas a texto plano, CSV y Excel (.xlsx), sin librerías.
// - Texto y CSV en UTF-8 con BOM: Excel y el Bloc de notas muestran bien ñ y tildes.
// - CSV separado por ';' (Excel con configuración regional de Chile usa ';').
// - .xlsx real: ZIP sin compresión con el XML mínimo de una hoja (inlineStr).
// Los montos CLP se exportan como número entero (sin $ ni puntos) para poder sumarlos.

export type ValorCelda = string | number | null | undefined

export interface ColumnaExport<T> {
  titulo: string
  valor: (fila: T) => ValorCelda
}

export type FormatoExport = 'txt' | 'csv' | 'xlsx'

const BOM = '﻿'

function aTexto(v: ValorCelda): string {
  return v === null || v === undefined ? '' : String(v)
}

function matriz<T>(filas: T[], columnas: ColumnaExport<T>[]): ValorCelda[][] {
  return filas.map((f) => columnas.map((c) => c.valor(f)))
}

/** Texto plano: columnas separadas por tabulador, una fila por línea (CRLF). */
export function generarTexto<T>(filas: T[], columnas: ColumnaExport<T>[]): string {
  // Tabuladores y saltos dentro de una celda romperían las columnas: se cambian por espacio
  const limpiar = (v: ValorCelda) => aTexto(v).replace(/[\t\r\n]+/g, ' ')
  const lineas = [columnas.map((c) => limpiar(c.titulo)), ...matriz(filas, columnas).map((f) => f.map(limpiar))]
  return BOM + lineas.map((l) => l.join('\t')).join('\r\n') + '\r\n'
}

/** CSV con ';', comillas dobles para escapar ; " y saltos de línea. */
export function generarCsv<T>(filas: T[], columnas: ColumnaExport<T>[]): string {
  const escapar = (v: ValorCelda) => {
    const t = aTexto(v)
    return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const lineas = [columnas.map((c) => escapar(c.titulo)), ...matriz(filas, columnas).map((f) => f.map(escapar))]
  return BOM + lineas.map((l) => l.join(';')).join('\r\n') + '\r\n'
}

// ─── .xlsx ───────────────────────────────────────────────────────────────────

function xml(t: string): string {
  // Quita caracteres de control no válidos en XML 1.0
  // eslint-disable-next-line no-control-regex
  return t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Referencia de columna Excel: 0 → A, 25 → Z, 26 → AA
function letraColumna(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function celda(ref: string, v: ValorCelda, estilo = 0): string {
  const s = estilo ? ` s="${estilo}"` : ''
  if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`
  const t = aTexto(v)
  if (!t) return ''
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xml(t)}</t></is></c>`
}

function hojaXml<T>(filas: T[], columnas: ColumnaExport<T>[]): string {
  const datos = [columnas.map((c) => c.titulo as ValorCelda), ...matriz(filas, columnas)]
  const ancho = (i: number) => Math.min(60, Math.max(8, ...datos.map((f) => aTexto(f[i]).length + 2)))
  const cols = columnas.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${ancho(i)}" customWidth="1"/>`).join('')
  const rows = datos.map((f, r) =>
    `<row r="${r + 1}">${f.map((v, c) => celda(`${letraColumna(c)}${r + 1}`, v, r === 0 ? 1 : 0)).join('')}</row>`).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`
}

const CRC_TABLA = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(datos: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < datos.length; i++) c = CRC_TABLA[(c ^ datos[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

/** ZIP sin compresión (método "store"), suficiente para un .xlsx. */
function zip(archivos: { nombre: string; contenido: string }[]): Uint8Array {
  const enc = new TextEncoder()
  const locales: Uint8Array[] = []
  const centrales: Uint8Array[] = []
  let offset = 0
  for (const a of archivos) {
    const nombre = enc.encode(a.nombre)
    const datos = enc.encode(a.contenido)
    const crc = crc32(datos)
    const local = new Uint8Array(30 + nombre.length)
    const vl = new DataView(local.buffer)
    vl.setUint32(0, 0x04034b50, true)
    vl.setUint16(4, 20, true)
    vl.setUint16(6, 0x0800, true)          // nombres en UTF-8
    vl.setUint16(8, 0, true)               // sin compresión
    vl.setUint32(14, crc, true)
    vl.setUint32(18, datos.length, true)
    vl.setUint32(22, datos.length, true)
    vl.setUint16(26, nombre.length, true)
    local.set(nombre, 30)
    const central = new Uint8Array(46 + nombre.length)
    const vc = new DataView(central.buffer)
    vc.setUint32(0, 0x02014b50, true)
    vc.setUint16(4, 20, true)
    vc.setUint16(6, 20, true)
    vc.setUint16(8, 0x0800, true)
    vc.setUint32(16, crc, true)
    vc.setUint32(20, datos.length, true)
    vc.setUint32(24, datos.length, true)
    vc.setUint16(28, nombre.length, true)
    vc.setUint32(42, offset, true)
    central.set(nombre, 46)
    locales.push(local, datos)
    centrales.push(central)
    offset += local.length + datos.length
  }
  const tamCentral = centrales.reduce((s, c) => s + c.length, 0)
  const fin = new Uint8Array(22)
  const vf = new DataView(fin.buffer)
  vf.setUint32(0, 0x06054b50, true)
  vf.setUint16(8, archivos.length, true)
  vf.setUint16(10, archivos.length, true)
  vf.setUint32(12, tamCentral, true)
  vf.setUint32(16, offset, true)
  const partes = [...locales, ...centrales, fin]
  const total = new Uint8Array(partes.reduce((s, p) => s + p.length, 0))
  let pos = 0
  for (const p of partes) { total.set(p, pos); pos += p.length }
  return total
}

/** Libro .xlsx con una hoja; la fila 1 (títulos) va en negrita y queda fija. */
export function generarXlsx<T>(filas: T[], columnas: ColumnaExport<T>[], nombreHoja = 'Datos'): Uint8Array {
  const hoja = xml(nombreHoja.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Datos')
  return zip([
    { nombre: '[Content_Types].xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>' },
    { nombre: '_rels/.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>' },
    { nombre: 'xl/workbook.xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets><sheet name="${hoja}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { nombre: 'xl/_rels/workbook.xml.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>' },
    { nombre: 'xl/styles.xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + '</styleSheet>' },
    { nombre: 'xl/worksheets/sheet1.xml', contenido: hojaXml(filas, columnas) },
  ])
}

const TIPOS: Record<FormatoExport, string> = {
  txt: 'text/plain;charset=utf-8',
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

/** "caja-listado-documentos_2026-10-16_1530" (hora local del equipo). */
export function nombreArchivoExport(base: string, ahora = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const limpio = base.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${limpio || 'tabla'}_${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}_${p(ahora.getHours())}${p(ahora.getMinutes())}`
}

/** Genera el archivo en el formato pedido y lo descarga en el navegador. */
export function exportarTabla<T>(formato: FormatoExport, filas: T[], columnas: ColumnaExport<T>[], nombreBase: string, nombreHoja?: string): void {
  const contenido = formato === 'txt' ? generarTexto(filas, columnas)
    : formato === 'csv' ? generarCsv(filas, columnas)
      : generarXlsx(filas, columnas, nombreHoja ?? nombreBase)
  const blob = new Blob([contenido as BlobPart], { type: TIPOS[formato] })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivoExport(nombreBase)}.${formato}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
