import '@ui5/webcomponents-icons/dist/nav-back.js'
import '@ui5/webcomponents-icons/dist/pdf-attachment.js'
import '@ui5/webcomponents-icons/dist/download.js'
import '@ui5/webcomponents-icons/dist/print.js'
import { useRef, useState, useEffect, useCallback } from 'react'
import type { jsPDF } from 'jspdf'
import {
  Card,
  CardHeader,
  FlexBox,
  Label,
  Button,
  MessageStrip,
  Icon,
  BusyIndicator,
} from '@ui5/webcomponents-react'
import { formatRUT, formatCLP, formatFecha } from '@/utils/format'
import { ExportarTabla } from '@/components/common/ExportarTabla'
import { ResumenFlotante } from '@/components/common/ResumenFlotante'
import { useFueraDeVista } from '@/hooks/useFueraDeVista'
import { useBusquedaCtaCte } from './useBusquedaCtaCte'
import { FormularioCuentaCorriente } from './FormularioCuentaCorriente'
import { TablaPartidasCtaCte } from './TablaPartidasCtaCte'
import { SoloModoTecnico } from '@/components/common/SoloModoTecnico'
import { PendientesEstadoCuenta } from './PendientesEstadoCuenta'
import { COLUMNAS_EXPORT_PARTIDAS } from './columnasPartidasCtaCte'
import { getEncabezadoEstadoCuenta } from '@/services/api/sapCtaCte'
import { filasCuentaCorriente, consolidadoDeuda, hoyChileISO } from './estadoCuentaCalculos'
import { generarPdfEstadoCuenta, cargarLogoPdf } from './estadoCuentaPdf'

// Dos columnas desde 1100 px (buscador fijo al bajar); una sola columna en pantallas angostas.
const ESTILOS_DISENO = `
.ec-diseno { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; align-items: start; }
@media (min-width: 1100px) {
  .ec-diseno { grid-template-columns: minmax(260px, 300px) minmax(0, 1fr); }
  .ec-buscador { position: sticky; top: 0; }
}
`

interface EstadoCuentaPanelProps {
  onVolver: () => void
}

/**
 * Caja > E° de Cuenta (22-10-2026): mismo buscador, servicio y columnas que
 * Pago Cta. Cte. (useBusquedaCtaCte, FormularioCuentaCorriente,
 * TablaPartidasCtaCte), pero de solo consulta: sin columna "Sel." ni botón
 * "Pagos". Por ahora trae los mismos datos (partidas abiertas normales del
 * cliente). "Generar PDF" arma el estado de cuenta con el formato de Cooprinsem
 * (estadoCuentaPdf.ts): Cuenta Corriente = las filas de la tabla en el orden en
 * pantalla; Documentos protestados y en cartera, por ahora vacíos.
 */
export function EstadoCuentaPanel({ onVolver }: EstadoCuentaPanelProps) {
  const busqueda = useBusquedaCtaCte()
  const { cliente, rut, partidas, partidasOrdenadas, totalPartidas, sucursal, nombreSucursal, fechaVencimiento } = busqueda
  const refFormulario = useRef<HTMLDivElement>(null)

  // PDF del estado de cuenta: se arma en el navegador y se previsualiza en un iframe
  const [pdf, setPdf] = useState<{ doc: jsPDF; url: string; nombreArchivo: string } | null>(null)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [errorPdf, setErrorPdf] = useState<string | null>(null)
  const refVisor = useRef<HTMLIFrameElement>(null)

  // Si cambian el cliente o las partidas, el PDF anterior ya no corresponde
  useEffect(() => {
    setPdf((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior.url)
      return null
    })
    setErrorPdf(null)
  }, [partidas])

  const generarPdf = useCallback(async () => {
    if (!cliente) return
    setGenerandoPdf(true)
    setErrorPdf(null)
    try {
      const encabezado = await getEncabezadoEstadoCuenta(cliente.codigoCliente)
      if (!encabezado.success) throw new Error(encabezado.message ?? 'No se pudieron obtener los datos del estado de cuenta')
      // Sin logo el PDF igual se genera (membrete con el nombre)
      const logo = await cargarLogoPdf().catch(() => undefined)
      const fecha = hoyChileISO()
      const doc = generarPdfEstadoCuenta({
        encabezado,
        codigoCliente: cliente.codigoCliente,
        nombreCliente: cliente.nombre,
        fecha,
        filas: filasCuentaCorriente(partidasOrdenadas, (codigo) => busqueda.centros.find((c) => c.Plant === codigo)?.PlantName ?? ''),
        consolidado: consolidadoDeuda({ protestados: [], cuentaCorriente: partidasOrdenadas, cartera: [], fecha }),
        logo,
      })
      const url = URL.createObjectURL(doc.output('blob'))
      setPdf((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior.url)
        return { doc, url, nombreArchivo: `Estado de cuenta ${cliente.codigoCliente} al ${fecha}.pdf` }
      })
    } catch (err) {
      setErrorPdf(err instanceof Error ? err.message : 'No se pudo generar el PDF')
    } finally {
      setGenerandoPdf(false)
    }
  }, [cliente, partidasOrdenadas, busqueda.centros])

  // Al bajar por el listado, los datos de la búsqueda quedan flotando arriba
  const fueraDeVista = useFueraDeVista(refFormulario)

  return (
    <>
      <ResumenFlotante
        visible={fueraDeVista && !!cliente}
        titulo="E° de Cuenta"
        datos={[
          { etiqueta: 'Rut', valor: cliente?.rut ? formatRUT(cliente.rut) : rut || '—' },
          { etiqueta: 'Cliente', valor: cliente?.codigoCliente ?? '—' },
          { etiqueta: 'Nombre', valor: cliente?.nombre ?? '—' },
          { etiqueta: 'Sucursal', valor: sucursal ? `${sucursal}${nombreSucursal ? ` — ${nombreSucursal}` : ''}` : 'Todas' },
          { etiqueta: 'Vence hasta', valor: fechaVencimiento ? formatFecha(fechaVencimiento) : 'Sin filtro' },
          { etiqueta: 'Total', valor: `${partidas.length} partida${partidas.length === 1 ? '' : 's'} — ${formatCLP(totalPartidas)}` },
        ]}
        onVolverArriba={() => refFormulario.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        top="-1rem"  // padding del <main> de CajaPage
        data-testid="resumen-estado-cuenta"
      />
      {/* Diseño anterior: buscador a la izquierda (fijo al bajar) y a la derecha el
          listado con la previsualización del PDF debajo. En pantallas angostas el
          buscador pasa arriba y la barra flotante muestra los datos al bajar. */}
      <style>{ESTILOS_DISENO}</style>
      <div className="ec-diseno">
        <div ref={refFormulario} className="ec-buscador">
          <FormularioCuentaCorriente busqueda={busqueda} titulo="E° de Cuenta" vertical />
        </div>

        {/* minmax(0, 1fr): la tabla usa su propio scroll horizontal sin desbordar la página */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem', minWidth: 0 }}>
        <Card header={<CardHeader titleText="Listado de documentos" />}>
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.75rem' }} data-testid="estado-cuenta-listado">
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button icon="nav-back" onClick={onVolver} data-testid="estado-cuenta-volver">Volver</Button>
              <ExportarTabla
                filas={partidasOrdenadas}
                columnas={COLUMNAS_EXPORT_PARTIDAS}
                nombreArchivo={`Caja estado de cuenta ${cliente?.codigoCliente ?? ''}`}
                nombreHoja="E° de Cuenta"
                data-testid="exportar-estado-cuenta"
              />
              <Button
                icon="pdf-attachment"
                design="Emphasized"
                onClick={() => void generarPdf()}
                disabled={!cliente || busqueda.isCargandoPartidas || generandoPdf}
                tooltip={!cliente ? 'Identifique al cliente para generar su estado de cuenta' : undefined}
                data-testid="estado-cuenta-generar-pdf"
              >
                {generandoPdf ? 'Generando…' : 'Generar PDF'}
              </Button>
            </FlexBox>
            {busqueda.errorPartidas && <MessageStrip design="Negative" hideCloseButton>{busqueda.errorPartidas}</MessageStrip>}
            {busqueda.partidasTruncadas && (
              <MessageStrip design="Critical" hideCloseButton>
                Se muestran las primeras {partidas.length} partidas. Use la fecha de vencimiento para acotar.
              </MessageStrip>
            )}
            {partidas.length > 0 && (
              <Label data-testid="estado-cuenta-total">
                {partidas.length} partida{partidas.length === 1 ? '' : 's'} abierta{partidas.length === 1 ? '' : 's'} — Total: {formatCLP(totalPartidas)}
              </Label>
            )}
            <TablaPartidasCtaCte busqueda={busqueda} />
          </div>
        </Card>

        <Card header={<CardHeader titleText="Previsualización PDF" />}>
          <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }} data-testid="estado-cuenta-previsualizacion">
            {errorPdf && <MessageStrip design="Negative" hideCloseButton data-testid="estado-cuenta-error-pdf">{errorPdf}</MessageStrip>}
            {pdf ? (
              <>
                <FlexBox style={{ gap: '0.5rem' }} justifyContent="End">
                  <Button icon="download" onClick={() => pdf.doc.save(pdf.nombreArchivo)} data-testid="estado-cuenta-descargar">
                    Descargar
                  </Button>
                  <Button icon="print" onClick={() => refVisor.current?.contentWindow?.print()} data-testid="estado-cuenta-imprimir">
                    Imprimir
                  </Button>
                </FlexBox>
                <iframe
                  ref={refVisor}
                  src={pdf.url}
                  title="Previsualización del estado de cuenta"
                  style={{ width: '100%', height: '75vh', border: '1px solid var(--sapGroup_ContentBorderColor, #d9d9d9)', borderRadius: '4px' }}
                  data-testid="estado-cuenta-visor"
                />
              </>
            ) : (
              <FlexBox
                direction="Column"
                style={{
                  minHeight: '240px',
                  border: '1px dashed var(--sapGroup_ContentBorderColor, #c0c0c0)',
                  borderRadius: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {generandoPdf
                  ? <BusyIndicator active size="M" />
                  : <Icon name="pdf-attachment" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--sapContent_IconColor, #c0c0c0)' }} />}
                <Label>
                  {generandoPdf
                    ? 'Generando el estado de cuenta…'
                    : cliente
                      ? 'Presione "Generar PDF" para ver el estado de cuenta del cliente.'
                      : 'Identifique al cliente y presione "Generar PDF".'}
                </Label>
              </FlexBox>
            )}
          </div>
        </Card>

        <SoloModoTecnico><PendientesEstadoCuenta /></SoloModoTecnico>
        </div>
      </div>
    </>
  )
}
