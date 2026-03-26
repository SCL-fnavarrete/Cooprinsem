import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Title,
  FlexBox,
  MessageBox,
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
  const navigate = useNavigate()
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
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)

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
      await grabar()
      setShowSuccess(true)
    } catch {
      setShowError(true)
    }
  }, [grabar])

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

      {/* Mensaje de éxito */}
      {showSuccess && resultado && (
        <MessageBox
          type="Success"
          open
          onClose={() => {
            setShowSuccess(false)
            limpiar()
            navigate('/pedidos')
          }}
        >
          {`Pedido N° ${resultado.VBELN} creado correctamente`}
        </MessageBox>
      )}

      {/* Mensaje de error */}
      {showError && error && (
        <MessageBox
          type="Error"
          open
          onClose={() => setShowError(false)}
        >
          {error}
        </MessageBox>
      )}
    </div>
  )
}
