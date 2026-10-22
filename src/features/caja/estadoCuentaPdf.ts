// Caja > E° de Cuenta — PDF del estado de cuenta con el formato de Cooprinsem
// (ejemplos "Agricola Laguna Verde al 11-12-2025" y "Estado de cuenta ejemplo
// completo"): membrete, cliente, 3 tablas (Documentos protestados, Cuenta
// Corriente, Documentos en cartera), Detalle Consolidado de Deuda y Formas de
// Pagos. Por ahora solo se llena Cuenta Corriente.
import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import type { IEncabezadoEstadoCuenta } from '@/types/ctaCte'
import {
  DATO_PENDIENTE, valorOPendiente, fechaLarga, montoTabla, type IFilaCuentaCorriente, type IConsolidadoDeuda,
} from './estadoCuentaCalculos'

export interface IDatosPdfEstadoCuenta {
  encabezado: IEncabezadoEstadoCuenta
  codigoCliente: string
  nombreCliente: string      // el que muestra la pantalla (respaldo si el encabezado no lo trae)
  fecha: string              // YYYY-MM-DD
  filas: IFilaCuentaCorriente[]
  consolidado: IConsolidadoDeuda
  logo?: { dataUrl: string; ancho: number; alto: number }
}

// Texto fijo de "Formas de Pagos" (igual a los ejemplos, 22-10-2026).
const FORMAS_DE_PAGO = [
  '1.- En cualquiera de nuestras oficinas comerciales.',
  '2.- Remitirnos cheque nominativo y cruzado a nombre de COOPRINSEM por correo certificado incluyendo el detalle de los documentos que cancela o abona.',
  '3.- Transferencia Bancaria o depósito a nombre de Cooprinsem, Rut 82.392.600-6 en las siguientes cuentas corrientes:',
]
const CUENTAS_BANCARIAS: [string, string][] = [
  ['- Banco Santander', ': N° 826100474-8'],
  ['- Banco Estado', ': N° 81500115343'],
  ['- Banco Bice', ': N° 1800261-2'],
  ['- Banco Crédito e Inversiones', ': N° 61040215'],
]
const TEXTO_COMPROBANTE = 'En este caso, agradeceremos enviar su comprobante de pago al correo electrónico ctasctes@cooprinsem.cl, incluyendo el detalle de los documentos cancelados o abonados, fecha del depósito y nombre del banco. En caso de ser depósito con cheque, número de cheques, monto y banco. Ya que caso contrario el pago no podrá ser reconocido en la fecha realizada.'

const MARGEN = 15            // mm
const INICIO_CONTENIDO = 42  // mm: debajo del membrete
const ESTILO_TABLA = {
  theme: 'grid' as const,
  styles: { fontSize: 6.5, cellPadding: 1.2, textColor: 0, lineColor: 0, lineWidth: 0.15, valign: 'middle' as const },
  headStyles: { fillColor: [235, 235, 235] as [number, number, number], textColor: 0, fontStyle: 'bold' as const },
  margin: { left: MARGEN, right: MARGEN, top: INICIO_CONTENIDO },
}

// Membrete de cada página: logo a la izquierda y datos de la Casa Matriz a la derecha.
function dibujarMembrete(doc: jsPDF, d: IDatosPdfEstadoCuenta) {
  if (d.logo) {
    const alto = 18
    doc.addImage(d.logo.dataUrl, 'PNG', MARGEN, 10, (d.logo.ancho / d.logo.alto) * alto, alto, 'logo', 'FAST')
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(18).text('COOPRINSEM', MARGEN, 22)
  }
  const e = d.encabezado.empresa
  const filas: [string, string | null][] = [
    ['Casa Matriz:', e.casaMatriz], ['Dirección:', e.direccion], ['Fono:', e.fono], ['Fax:', e.fax], ['Web:', e.web],
  ]
  const x = 125
  filas.forEach(([etiqueta, valor], i) => {
    const y = 13 + i * 4.2
    doc.setFont('helvetica', 'bold').setFontSize(9).text(etiqueta, x, y)
    doc.setFont('helvetica', 'normal').text(valorOPendiente(valor), x + 22, y)
  })
}

function tituloSeccion(doc: jsPDF, texto: string, y: number): number {
  // Si no cabe el título con algo de tabla, pasa a la página siguiente
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    y = INICIO_CONTENIDO
  }
  doc.setFont('helvetica', 'bold').setFontSize(10).text(texto, MARGEN, y)
  return y + 2
}

function sinDocumentos(columnas: number): RowInput[] {
  return [[{ content: 'Sin documentos', colSpan: columnas, styles: { halign: 'center', fontStyle: 'italic' } }]]
}

// jspdf-autotable deja la última posición en doc.lastAutoTable.finalY
const finTabla = (doc: jsPDF) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

/** Arma el PDF del estado de cuenta. Devuelve el documento (para previsualizar, descargar o imprimir). */
export function generarPdfEstadoCuenta(d: IDatosPdfEstadoCuenta): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
  const ancho = doc.internal.pageSize.getWidth()
  const c = d.encabezado.cliente

  // ── Cliente ──
  let y = INICIO_CONTENIDO + 2
  doc.setFont('helvetica', 'normal').setFontSize(9)
  doc.text('Señor(es)', MARGEN, y)
  doc.text(valorOPendiente(c?.nombre ?? d.nombreCliente).toUpperCase(), MARGEN, y + 4)
  doc.text(valorOPendiente(c?.direccion).toUpperCase(), MARGEN, y + 8)
  doc.text(valorOPendiente(c?.ciudad), MARGEN, y + 12)
  doc.text(`Rut: ${valorOPendiente(c?.rut)}`, 125, y)
  doc.text(`N° Cta. ${d.codigoCliente}`, 125, y + 4)
  y += 22
  doc.text('Estimado cliente:', MARGEN, y)
  y += 7
  doc.text(`Estamos informando su Estado de Cuenta al ${fechaLarga(d.fecha)}.`, MARGEN, y)
  y += 10

  // ── Documentos protestados (por ahora sin datos) ──
  y = tituloSeccion(doc, 'Documentos protestados:', y)
  autoTable(doc, {
    ...ESTILO_TABLA, startY: y,
    head: [['N° Documento', 'N° Docto. Int.', 'Banco', 'Motivo', 'Oficina de Venta', 'Fecha emisión', 'Fecha Vencto.', 'Mon.', 'Monto', 'Saldo']],
    body: sinDocumentos(10),
  })
  y = finTabla(doc) + 7

  // ── Cuenta Corriente ──
  y = tituloSeccion(doc, 'Cuenta Corriente:', y)
  autoTable(doc, {
    ...ESTILO_TABLA, startY: y,
    head: [['Destin.', 'N° Documento', 'N° Docto. Int.', 'Clase de Docto.', 'Oficina de Venta', 'Cuotas', 'Fecha emisión', 'Fecha Vencto.', 'ACC.', 'Mon.', 'Monto', 'Saldo']],
    body: d.filas.length === 0
      ? sinDocumentos(12)
      : d.filas.map((f) => [
        f.destino, f.nroDocumento, f.nroDoctoInterno, f.clase, f.oficina, f.cuotas,
        f.fechaEmision, f.fechaVencimiento, f.acc, f.moneda, montoTabla(f.monto), montoTabla(f.saldo),
      ]),
    columnStyles: { 10: { halign: 'right' }, 11: { halign: 'right' } },
  })
  y = finTabla(doc) + 7

  // ── Documentos en cartera (por ahora sin datos) ──
  y = tituloSeccion(doc, 'Documentos en cartera:', y)
  autoTable(doc, {
    ...ESTILO_TABLA, startY: y,
    head: [['N° Documento', 'N° Docto. Int.', 'Banco', 'Oficina de Venta', 'Fecha emisión', 'Fecha Vencto.', 'Mon.', 'Monto', 'Saldo']],
    body: sinDocumentos(9),
  })
  y = finTabla(doc) + 8

  // ── Detalle Consolidado de Deuda (calculado con lo que va en el PDF) ──
  const k = d.consolidado
  const lineas: { etiqueta: string; valor: string; subrayar?: boolean; separacion?: number }[] = [
    { etiqueta: 'Documentos protestados', valor: montoTabla(k.protestados) },
    { etiqueta: 'Deuda Vencida CLP', valor: montoTabla(k.vencida), subrayar: true },
    { etiqueta: 'Total Deuda Vencida CLP', valor: montoTabla(k.totalVencida) },
    { etiqueta: 'Deuda por Vencer CLP', valor: montoTabla(k.porVencer), separacion: 3 },
    { etiqueta: 'Documentos en Cartera CLP', valor: montoTabla(k.cartera), subrayar: true },
    { etiqueta: 'Total General CLP', valor: montoTabla(k.totalGeneral) },
    { etiqueta: 'Total CP01', valor: DATO_PENDIENTE, separacion: 4 },
    { etiqueta: 'Total CP02', valor: DATO_PENDIENTE, separacion: 2 },
  ]
  if (y + 8 + lineas.length * 6 > doc.internal.pageSize.getHeight() - 15) {
    doc.addPage()
    y = INICIO_CONTENIDO
  }
  y = tituloSeccion(doc, 'Detalle Consolidado de Deuda:', y) + 5
  for (const l of lineas) {
    y += l.separacion ?? 0
    doc.setFont('helvetica', 'bold').setFontSize(8).text(l.etiqueta, MARGEN + 2, y)
    doc.text(': $', MARGEN + 48, y)
    doc.text(l.valor, MARGEN + 90, y, { align: 'right' })
    if (l.subrayar) doc.setLineWidth(0.2).line(MARGEN + 55, y + 1, MARGEN + 90, y + 1)
    y += 5.5
  }

  // ── Página final: Formas de Pagos (texto fijo) ──
  doc.addPage()
  y = INICIO_CONTENIDO
  doc.setFont('helvetica', 'bold').setFontSize(10).text('Formas de Pagos:', MARGEN, y)
  y += 7
  doc.setFont('helvetica', 'normal').setFontSize(9)
  const anchoTexto = ancho - MARGEN * 2
  for (const parrafo of FORMAS_DE_PAGO) {
    const lineasTexto = doc.splitTextToSize(parrafo, anchoTexto)
    doc.text(lineasTexto, MARGEN, y)
    y += lineasTexto.length * 4
  }
  y += 3
  for (const [banco, cuenta] of CUENTAS_BANCARIAS) {
    doc.text(banco, MARGEN + 10, y)
    doc.text(cuenta, MARGEN + 62, y)
    y += 4
  }
  y += 4
  const comprobante = doc.splitTextToSize(TEXTO_COMPROBANTE, anchoTexto)
  doc.text(comprobante, MARGEN, y)
  y += comprobante.length * 4 + 8
  doc.text('Atentamente.', MARGEN, y)
  doc.setFont('helvetica', 'bold').text('COOPRINSEM', MARGEN, y + 4)

  // ── Membrete y "Página X de Y" en todas las páginas ──
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    dibujarMembrete(doc, d)
    doc.setFont('helvetica', 'normal').setFontSize(7)
      .text(`Página ${i} de ${total}`, ancho - MARGEN, doc.internal.pageSize.getHeight() - 10, { align: 'right' })
  }
  return doc
}

/** Logo de la app (public/logo-cooprinsem.png) como dataURL con su tamaño, para el membrete. */
export async function cargarLogoPdf(url = '/logo-cooprinsem.png'): Promise<{ dataUrl: string; ancho: number; alto: number }> {
  const blob = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Logo no disponible (${r.status})`)
    return r.blob()
  })
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result))
    lector.onerror = () => reject(lector.error)
    lector.readAsDataURL(blob)
  })
  const { ancho, alto } = await new Promise<{ ancho: number; alto: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ ancho: img.naturalWidth, alto: img.naturalHeight })
    img.onerror = () => reject(new Error('Logo inválido'))
    img.src = dataUrl
  })
  return { dataUrl, ancho, alto }
}
