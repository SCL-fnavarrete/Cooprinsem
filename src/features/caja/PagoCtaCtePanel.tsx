import '@ui5/webcomponents-icons/dist/nav-back.js'
import '@ui5/webcomponents-icons/dist/payment-approval.js'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card,
  CardHeader,
  FlexBox,
  Label,
  Button,
  MessageStrip,
} from '@ui5/webcomponents-react'
import { formatRUT, formatCLP, formatFecha } from '@/utils/format'
import { PendientesCtaCte } from './PendientesCtaCte'
import { ExportarTabla } from '@/components/common/ExportarTabla'
import type { ColumnaExport } from '@/utils/exportarTabla'
import { clavePartidaCtaCte, motivoNoPagable, type IPartidaCtaCte } from '@/types/ctaCte'
import { SoloModoTecnico } from '@/components/common/SoloModoTecnico'
import { ResumenFlotante } from '@/components/common/ResumenFlotante'
import { useFueraDeVista } from '@/hooks/useFueraDeVista'
import { useBusquedaCtaCte } from './useBusquedaCtaCte'
import { FormularioCuentaCorriente } from './FormularioCuentaCorriente'
import { TablaPartidasCtaCte } from './TablaPartidasCtaCte'
import { COLUMNAS_EXPORT_PARTIDAS } from './columnasPartidasCtaCte'

interface PagoCtaCtePanelProps {
  onVolver: () => void
}

// Columnas para "Exportar tabla": las de la grilla + motivo por el que no se puede pagar.
const COLUMNAS_EXPORT_CTACTE: ColumnaExport<IPartidaCtaCte>[] = [
  ...COLUMNAS_EXPORT_PARTIDAS,
  { titulo: 'No seleccionable', valor: (p) => motivoNoPagable(p) ?? '' },
]

/**
 * Caja > Pago Cta. Cte. — formulario "Cuenta Corriente" (réplica del WebDynpro).
 *
 * El botón Buscar (o salir del campo RUT / Cliente) identifica al cliente en el
 * maestro local Sap_cliente; con el cliente identificado se cargan sus partidas
 * abiertas desde SAP (FAR_CUSTOMER_LINE_ITEMS) y se recargan al cambiar la
 * fecha de vencimiento. Formulario, búsqueda y grilla son compartidos con
 * E° de Cuenta (useBusquedaCtaCte, FormularioCuentaCorriente, TablaPartidasCtaCte).
 */
export function PagoCtaCtePanel({ onVolver }: PagoCtaCtePanelProps) {
  const navigate = useNavigate()
  // ?cliente=… al volver desde la pantalla de pago: se vuelve a identificar.
  const [searchParams] = useSearchParams()
  const busqueda = useBusquedaCtaCte(searchParams.get('cliente') ?? '')
  const { cliente, rut, partidas, partidasOrdenadas, totalPartidas, pagoMultiple } = busqueda
  const refFormulario = useRef<HTMLDivElement>(null)

  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  // Al recargar las partidas (otro cliente o "vence hasta") se limpia la selección
  useEffect(() => { setSeleccionadas([]) }, [partidas])

  const totalSeleccionado = partidas
    .filter((p) => seleccionadas.includes(clavePartidaCtaCte(p)))
    .reduce((suma, p) => suma + p.monto, 0)

  // Selección de partidas a pagar (no se pueden elegir bloqueadas, en cuotas
  // ni abonos). Sin pago múltiple, elegir otra factura reemplaza la anterior.
  const toggleSeleccion = (p: IPartidaCtaCte) => {
    if (motivoNoPagable(p)) return
    const clave = clavePartidaCtaCte(p)
    setSeleccionadas((prev) => {
      if (prev.includes(clave)) return prev.filter((c) => c !== clave)
      return pagoMultiple ? [...prev, clave] : [clave]
    })
  }

  // Pantalla de pago existente (PagoDetallePage) con fuente SAP: permite elegir
  // vía de pago y monto; "Ejecutar Pago" queda deshabilitado hasta tener la API.
  const irAPagar = () => {
    if (!cliente || seleccionadas.length === 0) return
    navigate(`/caja/pago?fuente=sap&kunnr=${encodeURIComponent(cliente.codigoCliente)}&docs=${encodeURIComponent(seleccionadas.join(','))}`)
  }

  // Al bajar por el listado, los datos de la búsqueda quedan flotando arriba
  const fueraDeVista = useFueraDeVista(refFormulario)
  const { sucursal, nombreSucursal, fechaVencimiento } = busqueda

  return (
    <>
      <ResumenFlotante
        visible={fueraDeVista && !!cliente}
        titulo="Cuenta Corriente"
        datos={[
          { etiqueta: 'Rut', valor: cliente?.rut ? formatRUT(cliente.rut) : rut || '—' },
          { etiqueta: 'Cliente', valor: cliente?.codigoCliente ?? '—' },
          { etiqueta: 'Nombre', valor: cliente?.nombre ?? '—' },
          { etiqueta: 'Sucursal', valor: sucursal ? `${sucursal}${nombreSucursal ? ` — ${nombreSucursal}` : ''}` : 'Todas' },
          { etiqueta: 'Vence hasta', valor: fechaVencimiento ? formatFecha(fechaVencimiento) : 'Sin filtro' },
          {
            etiqueta: 'Seleccionadas',
            valor: seleccionadas.length > 0 ? `${seleccionadas.length} — ${formatCLP(totalSeleccionado)}` : 'ninguna',
          },
        ]}
        acciones={
          <Button
            icon="payment-approval"
            design="Emphasized"
            disabled={seleccionadas.length === 0}
            onClick={irAPagar}
            data-testid="resumen-ctacte-pagos"
          >
            Pagos{seleccionadas.length > 0 ? ` (${seleccionadas.length})` : ''}
          </Button>
        }
        onVolverArriba={() => refFormulario.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        top="-1rem"  // padding del <main> de CajaPage
        data-testid="resumen-ctacte"
      />
      {/* Formulario arriba y listado abajo, ambos a todo el ancho (más espacio
          para los campos y para las columnas del listado). */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1rem' }}>
        {/* ── Cuenta Corriente ── (ref: detecta cuándo sale de la vista) */}
        <div ref={refFormulario}>
          <FormularioCuentaCorriente busqueda={busqueda} />
        </div>

        {/* ── Listado de Documentos ── */}
        <Card header={<CardHeader titleText="Listado de Documentos" />}>
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.75rem' }}>
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button icon="nav-back" onClick={onVolver}>Volver</Button>
              <Button
                icon="payment-approval"
                design="Emphasized"
                disabled={seleccionadas.length === 0}
                onClick={irAPagar}
                tooltip={seleccionadas.length === 0 ? 'Seleccione al menos una partida' : undefined}
                data-testid="ctacte-pagos"
              >
                Pagos{seleccionadas.length > 0 ? ` (${seleccionadas.length})` : ''}
              </Button>
              <ExportarTabla
                filas={partidasOrdenadas}
                columnas={COLUMNAS_EXPORT_CTACTE}
                nombreArchivo={`Caja pago cta cte ${cliente?.codigoCliente ?? ''}`}
                nombreHoja="Pago Cta. Cte."
                data-testid="exportar-ctacte"
              />
            </FlexBox>
            {busqueda.errorPartidas && <MessageStrip design="Negative" hideCloseButton>{busqueda.errorPartidas}</MessageStrip>}
            {busqueda.partidasTruncadas && (
              <MessageStrip design="Critical" hideCloseButton>
                Se muestran las primeras {partidas.length} partidas. Use la fecha de vencimiento para acotar.
              </MessageStrip>
            )}
            {partidas.length > 0 && !pagoMultiple && (
              <MessageStrip design="Information" hideCloseButton data-testid="ctacte-una-factura">
                Por ahora se paga una factura por cobro: el pago de varias facturas está en validación con SAP.
              </MessageStrip>
            )}
            {partidas.length > 0 && (
              <Label data-testid="ctacte-total">
                {partidas.length} partida{partidas.length === 1 ? '' : 's'} abierta{partidas.length === 1 ? '' : 's'} — Total: {formatCLP(totalPartidas)}
                {seleccionadas.length > 0 && ` · Seleccionadas: ${seleccionadas.length} — ${formatCLP(totalSeleccionado)}`}
              </Label>
            )}
            <TablaPartidasCtaCte busqueda={busqueda} seleccion={{ seleccionadas, onToggle: toggleSeleccion }} />
          </div>
        </Card>

        <SoloModoTecnico><PendientesCtaCte /></SoloModoTecnico>
      </div>
    </>
  )
}
