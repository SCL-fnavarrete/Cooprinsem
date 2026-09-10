import { useEffect, useCallback, useState } from 'react'
import {
  Title,
  FlexBox,
  MessageBox,
  Dialog,
  Bar,
  Button,
  MessageStrip,
} from '@ui5/webcomponents-react'
import { usePedido } from '@/hooks/usePedido'
import { useUser } from '@/stores/userContext'
import { getStockPorCentro } from '@/services/api/stock'
import { PedidoHeader } from '@/components/pos/PedidoHeader'
import { ArticuloSearch } from '@/components/pos/ArticuloSearch'
import { ArticuloGrid } from '@/components/pos/ArticuloGrid'
import { PedidoTotals } from '@/components/pos/PedidoTotals'
import type { IArticulo } from '@/types/articulo'

export function PedidoPage() {
  const { usuario } = useUser()
  const sucursal = usuario?.sucursal ?? 'D190'

  const {
    header,
    lineas,
    clienteSeleccionado,
    setHeader,
    seleccionarCliente,
    deseleccionarCliente,
    agregarArticulo,
    actualizarCantidad,
    cambiarLinea,
    eliminarLinea,
    limpiar,
    // TEMPORAL — el botón "Grabar" usa previsualizar() en vez de grabar() mientras
    // se hacen pruebas manuales de datos (ver PROGRESS.md). Para volver al
    // comportamiento real: destructurar grabar/resultado en vez de
    // previsualizar/previewResultado, usarlos en handleGrabar/el MessageBox de éxito
    // (ver commit anterior para el JSX exacto), y volver a importar useNavigate de
    // 'react-router-dom' (se usaba para navigate('/pedidos') al cerrar el mensaje).
    previsualizar,
    isGrabando,
    error,
    previewResultado,
    subtotal,
    totalIVA,
    total,
  } = usePedido()

  const [stockPorCentro, setStockPorCentro] = useState<Record<string, number> | undefined>()
  const [stockInfo, setStockInfo] = useState<Record<string, number>>({})
  const [showError, setShowError] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Cargar stock al agregar artículo
  const handleArticuloSeleccionado = useCallback(
    (articulo: IArticulo) => {
      agregarArticulo(articulo)
      setStockInfo((prev) => ({
        ...prev,
        [articulo.codigoMaterial]: articulo.stockDisponible,
      }))
      // Cargar stock por centro para el último artículo seleccionado
      getStockPorCentro(articulo.codigoMaterial)
        .then(setStockPorCentro)
        .catch(() => setStockPorCentro(undefined))
    },
    [agregarArticulo]
  )

  const handleGrabar = useCallback(async () => {
    try {
      // TEMPORAL — previsualizar() en vez de grabar(), ver nota arriba.
      // "sucursal" es el mismo valor que se muestra en el campo "Centro" (solo
      // lectura) de la cabecera del pedido — ver PedidoHeader.tsx.
      await previsualizar(usuario?.idVendedor, sucursal, stockInfo)
      setShowPreview(true)
    } catch {
      setShowError(true)
    }
  }, [previsualizar, usuario?.idVendedor, sucursal, stockInfo])

  // Atajo de teclado F9 para grabar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault()
        if (!isGrabando && clienteSeleccionado && lineas.length > 0) {
          handleGrabar()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleGrabar, isGrabando, clienteSeleccionado, lineas.length])

  const canGrabar = !!clienteSeleccionado && lineas.length > 0

  return (
    <div style={{ padding: '1rem', display: 'grid', gap: '1.5rem' }}>
      <Title level="H3">Crear Venta (Mesón)</Title>

      <PedidoHeader
        header={header}
        onHeaderChange={setHeader}
        clienteSeleccionado={clienteSeleccionado}
        onClienteSeleccionado={seleccionarCliente}
        onClienteDeseleccionado={deseleccionarCliente}
        sucursal={sucursal}
        vendedor={usuario ? { id: usuario.id, nombre: usuario.nombre, idVendedor: usuario.idVendedor } : undefined}
      />

      <FlexBox direction="Column" style={{ gap: '1rem' }}>
        <ArticuloSearch
          onArticuloSeleccionado={handleArticuloSeleccionado}
          centro={sucursal}
          disabled={!clienteSeleccionado}
        />

        <ArticuloGrid
          lineas={lineas}
          onCantidadChange={actualizarCantidad}
          onLineaChange={cambiarLinea}
          onEliminarLinea={eliminarLinea}
          stockInfo={stockInfo}
        />
      </FlexBox>

      <PedidoTotals
        subtotal={subtotal}
        totalIVA={totalIVA}
        total={total}
        observaciones={header.observaciones}
        onObservacionesChange={(obs) => setHeader({ observaciones: obs })}
        ubicacionPredio={header.ubicacionPredio}
        onUbicacionPredioChange={(val) => setHeader({ ubicacionPredio: val })}
        onGrabar={handleGrabar}
        onLimpiar={limpiar}
        isGrabando={isGrabando}
        canGrabar={canGrabar}
        stockPorCentro={stockPorCentro}
      />

      {/* TEMPORAL — preview del JSON que se enviaría a SAP, sin tocar SAP. Para
          revertir a la simulación real, ver la nota junto al destructuring de
          usePedido() más arriba y PROGRESS.md. */}
      {showPreview && previewResultado && (
        <Dialog
          open
          headerText="Preview JSON — Grabar Pedido (no se envía a SAP)"
          onClose={() => setShowPreview(false)}
          style={{ width: '700px', maxHeight: '80vh' }}
          footer={
            <Bar
              endContent={
                <FlexBox style={{ gap: '0.5rem' }}>
                  <Button
                    design="Transparent"
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(previewResultado.body, null, 2)).catch(() => {})
                    }}
                  >
                    Copiar JSON
                  </Button>
                  <Button design="Emphasized" onClick={() => setShowPreview(false)}>Cerrar</Button>
                </FlexBox>
              }
            />
          }
        >
          <div style={{ padding: '1rem' }}>
            {previewResultado.advertencias && previewResultado.advertencias.length > 0 && (
              <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                {previewResultado.advertencias.map((a) => <div key={a}>{a}</div>)}
              </MessageStrip>
            )}
            <pre style={{ maxHeight: '50vh', overflow: 'auto', fontSize: '0.75rem', background: 'var(--sapList_Background)', padding: '0.75rem', borderRadius: '4px' }}>
              {JSON.stringify(previewResultado.body, null, 2)}
            </pre>
          </div>
        </Dialog>
      )}

      {/* Mensaje de error — casi siempre validación de datos, no un error de SAP
          en sí (ver pedidoValidation.ts), de ahí el título neutral. */}
      {showError && error && (
        <MessageBox
          type="Error"
          open
          titleText="No se pudo continuar"
          onClose={() => setShowError(false)}
        >
          {error}
        </MessageBox>
      )}
    </div>
  )
}
