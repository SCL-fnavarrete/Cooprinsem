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
    grabar,
    isGrabando,
    error,
    resultado,
    subtotal,
    totalIVA,
    total,
  } = usePedido()

  const [stockPorCentro, setStockPorCentro] = useState<Record<string, number> | undefined>()
  const [stockInfo, setStockInfo] = useState<Record<string, number>>({})
  const [showError, setShowError] = useState(false)
  const [showResultado, setShowResultado] = useState(false)

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
      // "sucursal" es el mismo valor que se muestra en el campo "Centro" (solo
      // lectura) de la cabecera del pedido — ver PedidoHeader.tsx.
      await grabar(usuario?.idVendedor, sucursal, stockInfo)
      setShowResultado(true)
    } catch (err) {
      // Si SAP respondió (aunque haya rechazado el pedido), usePedido.ts ya dejó
      // el JSON crudo en `resultado` — se muestra en el mismo Dialog que el
      // éxito. Solo va al MessageBox simple un error de validación local (sin
      // JSON que mostrar) o de red.
      if (err && typeof err === 'object' && 'sapRespondio' in err) {
        setShowResultado(true)
      } else {
        setShowError(true)
      }
    }
  }, [grabar, usuario?.idVendedor, sucursal, stockInfo])

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

      {showResultado && resultado && (
        <Dialog
          open
          headerText={resultado.success ? 'Respuesta SAP — Simulación + Creación de Pedido' : 'Respuesta SAP — Pedido rechazado'}
          onClose={() => setShowResultado(false)}
          style={{ width: '700px', maxHeight: '80vh' }}
          footer={
            <Bar
              endContent={
                <FlexBox style={{ gap: '0.5rem' }}>
                  <Button
                    design="Transparent"
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(resultado, null, 2)).catch(() => {})
                    }}
                  >
                    Copiar JSON
                  </Button>
                  <Button design="Emphasized" onClick={() => setShowResultado(false)}>Cerrar</Button>
                </FlexBox>
              }
            />
          }
        >
          <div style={{ padding: '1rem' }}>
            {resultado.success ? (
              <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                Este pedido SÍ se crea en SAP (fase 2, A_SalesOrder) — no es solo una simulación. Ver "data.creacion.SalesOrder" en el JSON para el número real generado.
              </MessageStrip>
            ) : (
              <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                {resultado.message}
              </MessageStrip>
            )}
            {resultado.advertencias && resultado.advertencias.length > 0 && (
              <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                {resultado.advertencias.map((a) => <div key={a}>{a}</div>)}
              </MessageStrip>
            )}
            {/* JSON crudo completo de la respuesta del backend (éxito o error) —
                incluye success/message/data/detalle/simulacion según el caso. */}
            <pre style={{ maxHeight: '50vh', overflow: 'auto', fontSize: '0.75rem', background: 'var(--sapList_Background)', padding: '0.75rem', borderRadius: '4px' }}>
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        </Dialog>
      )}

      {/* Mensaje de error — puede ser validación de datos local (pedidoValidation.ts)
          o un rechazo real de SAP al simular (ej. crédito bloqueado, material
          inválido), de ahí el título neutral. */}
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
