import { useEffect, useCallback, useState } from 'react'
import {
  Title,
  FlexBox,
  MessageBox,
  Dialog,
  Bar,
  Button,
  MessageStrip,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
} from '@ui5/webcomponents-react'
import { usePedido } from '@/hooks/usePedido'
import { useUser } from '@/stores/userContext'
import { getStockPorCentro } from '@/services/api/stock'
import { formatCLP } from '@/utils/format'
import { PedidoHeader } from '@/components/pos/PedidoHeader'
import { ArticuloSearch } from '@/components/pos/ArticuloSearch'
import { ArticuloGrid } from '@/components/pos/ArticuloGrid'
import { PedidoTotals } from '@/components/pos/PedidoTotals'
import type { IArticulo } from '@/types/articulo'

// Controla qué contenido muestra el único Dialog del flujo de 2 pasos
// (simular -> confirmar -> crear), más los 3 estados de "Cotizar" (una sola
// fase: confirmar -> crear directo, sin simulación — ver usePedido.ts).
// `null` = cerrado.
type ModalPedido =
  | 'confirmar' | 'creado' | 'error-simulacion' | 'error-creacion'
  | 'confirmar-cotizacion' | 'cotizado' | 'error-cotizacion'
  | null

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
    simular,
    crearPedido,
    cotizar,
    isGrabando,
    isCotizando,
    error,
    resultadoSimulacion,
    resultadoCreacion,
    resultadoCotizacion,
    subtotal,
    totalIVA,
    total,
  } = usePedido()

  const [stockPorCentro, setStockPorCentro] = useState<Record<string, number> | undefined>()
  const [stockInfo, setStockInfo] = useState<Record<string, number>>({})
  const [showError, setShowError] = useState(false)
  const [modal, setModal] = useState<ModalPedido>(null)

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

  // Paso 1: click en "Grabar" -> solo simula. Si SAP la acepta, se abre el
  // modal de confirmación (ver PedidoTotals -> onGrabar). La creación real
  // (fase 2) requiere que el usuario confirme explícitamente en ese modal.
  const handleGrabar = useCallback(async () => {
    // "sucursal" es el mismo valor que se muestra en el campo "Centro" (solo
    // lectura) de la cabecera del pedido — ver PedidoHeader.tsx.
    const resultado = await simular(usuario?.idVendedor, sucursal, stockInfo, usuario?.nombre)
    if (!resultado) {
      // Validación local (pedidoValidation.ts) o error de red — sin JSON que mostrar.
      setShowError(true)
      return
    }
    setModal(resultado.success ? 'confirmar' : 'error-simulacion')
  }, [simular, usuario?.idVendedor, sucursal, stockInfo])

  // Paso 2: confirmar en el modal -> recién ahí se llama a la creación real.
  const handleConfirmarCreacion = useCallback(async () => {
    const resultado = await crearPedido()
    if (!resultado) {
      setModal(null)
      setShowError(true)
      return
    }
    setModal(resultado.success ? 'creado' : 'error-creacion')
  }, [crearPedido])

  // "Cotizar" es de una sola fase (no hay simulación de cotización
  // confirmada) — el click solo abre el modal de confirmación; recién al
  // confirmar ahí se llama a SAP.
  const handleCotizarClick = useCallback(() => {
    setModal('confirmar-cotizacion')
  }, [])

  const handleConfirmarCotizacion = useCallback(async () => {
    const resultado = await cotizar(usuario?.idVendedor, sucursal)
    if (!resultado) {
      setModal(null)
      setShowError(true)
      return
    }
    setModal(resultado.success ? 'cotizado' : 'error-cotizacion')
  }, [cotizar, usuario?.idVendedor, sucursal])

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

  // Cotización normal usa su propio botón "Cotizar" — mientras el tipo
  // documento sea ese, "Grabar" queda deshabilitado (son mutuamente excluyentes).
  const esCotizacion = header.tipoDocumento === 'Cotización normal'
  const canGrabar = !esCotizacion && !!clienteSeleccionado && lineas.length > 0
  const canCotizar = esCotizacion && !!clienteSeleccionado && lineas.length > 0

  const numeroPedidoCreado = resultadoCreacion?.data?.creacion?.SalesOrder
  // BORRADOR — nombre de campo sin confirmar (ver construirBodyCotizacion en
  // server/src/routes/sapPedidos.ts); se ajusta cuando se confirme la
  // respuesta real de A_SalesQuotation.
  const numeroCotizacionCreada = resultadoCotizacion?.data?.cotizacion?.SalesQuotation

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
        onCotizar={handleCotizarClick}
        isGrabando={isGrabando}
        canGrabar={canGrabar}
        isCotizando={isCotizando}
        canCotizar={canCotizar}
        stockPorCentro={stockPorCentro}
      />

      {/* Único Dialog para las 4 fases posibles del flujo de 2 pasos — el
          contenido cambia según `modal`. UI5 Dialog es modal por naturaleza
          (bloquea interacción con el formulario de fondo mientras está abierto). */}
      {modal && (
        <Dialog
          open
          headerText={
            modal === 'confirmar' ? 'Confirmar creación de pedido'
              : modal === 'creado' ? 'Pedido creado exitosamente'
              : modal === 'error-simulacion' ? 'Simulación rechazada por SAP'
              : modal === 'error-creacion' ? 'Creación rechazada por SAP'
              : modal === 'confirmar-cotizacion' ? 'Confirmar creación de cotización'
              : modal === 'cotizado' ? 'Cotización creada exitosamente'
              : 'Cotización rechazada por SAP'
          }
          onClose={() => setModal(null)}
          style={{ width: '720px', maxHeight: '85vh' }}
          footer={
            <Bar
              endContent={
                <FlexBox style={{ gap: '0.5rem' }}>
                  {modal === 'confirmar' && (
                    <>
                      <Button design="Transparent" onClick={() => setModal(null)}>Cancelar</Button>
                      <Button design="Emphasized" onClick={handleConfirmarCreacion} disabled={isGrabando}>
                        Confirmar
                      </Button>
                    </>
                  )}
                  {modal === 'creado' && (
                    <Button
                      design="Emphasized"
                      onClick={() => {
                        limpiar()
                        setModal(null)
                      }}
                    >
                      Nuevo Pedido
                    </Button>
                  )}
                  {(modal === 'error-simulacion' || modal === 'error-creacion' || modal === 'error-cotizacion') && (
                    <Button design="Emphasized" onClick={() => setModal(null)}>Cerrar</Button>
                  )}
                  {modal === 'confirmar-cotizacion' && (
                    <>
                      <Button design="Transparent" onClick={() => setModal(null)}>Cancelar</Button>
                      <Button design="Emphasized" onClick={handleConfirmarCotizacion} disabled={isCotizando}>
                        Confirmar
                      </Button>
                    </>
                  )}
                  {modal === 'cotizado' && (
                    <Button
                      design="Emphasized"
                      onClick={() => {
                        limpiar()
                        setModal(null)
                      }}
                    >
                      Nueva Cotización
                    </Button>
                  )}
                </FlexBox>
              }
            />
          }
        >
          <div style={{ padding: '1rem' }}>
            {modal === 'confirmar' && resultadoSimulacion && (
              <>
                <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                  La simulación fue exitosa. Revisa el resumen — al confirmar se crea un pedido real en SAP (A_SalesOrder).
                </MessageStrip>
                {resultadoSimulacion.advertencias && resultadoSimulacion.advertencias.length > 0 && (
                  <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                    {resultadoSimulacion.advertencias.map((a) => <div key={a}>{a}</div>)}
                  </MessageStrip>
                )}
                <div style={{ display: 'grid', gap: '0.2rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                  <div><b>Cliente:</b> {clienteSeleccionado?.nombre} ({header.codigoCliente})</div>
                  <div><b>Destinatario Mercancía:</b> {header.destinatarioMercancia || '(no seleccionado)'}</div>
                  <div><b>Tipo Documento:</b> {header.tipoDocumento} — <b>Canal:</b> {header.canalDistribucion}</div>
                </div>
                <Table
                  style={{ marginBottom: '0.75rem' }}
                  headerRow={
                    <TableHeaderRow>
                      <TableHeaderCell>Material</TableHeaderCell>
                      <TableHeaderCell>Descripción</TableHeaderCell>
                      <TableHeaderCell>Cantidad</TableHeaderCell>
                    </TableHeaderRow>
                  }
                >
                  {lineas.map((l) => (
                    <TableRow key={l.posicion}>
                      <TableCell>{l.codigoMaterial}</TableCell>
                      <TableCell>{l.descripcion}</TableCell>
                      <TableCell>{l.cantidad}</TableCell>
                    </TableRow>
                  ))}
                </Table>
                <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                  <div>Subtotal: {formatCLP(subtotal)}</div>
                  <div>IVA: {formatCLP(totalIVA)}</div>
                  <div style={{ fontWeight: 'bold' }}>Total: {formatCLP(total)}</div>
                </div>
              </>
            )}

            {modal === 'creado' && (
              <MessageStrip design="Positive" hideCloseButton>
                Pedido creado exitosamente en SAP — N° <b>{numeroPedidoCreado || '(sin número)'}</b>
              </MessageStrip>
            )}

            {modal === 'error-simulacion' && resultadoSimulacion && (
              <>
                <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                  {resultadoSimulacion.message}
                </MessageStrip>
                <div style={{ marginBottom: '0.5rem' }}>
                  <b>Código SAP:</b> {resultadoSimulacion.detalle?.error?.code ?? '—'}
                </div>
                <pre style={{ maxHeight: '45vh', overflow: 'auto', fontSize: '0.75rem', background: 'var(--sapList_Background)', padding: '0.75rem', borderRadius: '4px' }}>
                  {JSON.stringify({ requestSimulacion: resultadoSimulacion.bodySimulacion, detalle: resultadoSimulacion.detalle }, null, 2)}
                </pre>
              </>
            )}

            {modal === 'error-creacion' && resultadoCreacion && (
              <>
                <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                  {resultadoCreacion.message}
                </MessageStrip>
                <div style={{ marginBottom: '0.5rem' }}>
                  <b>Código SAP:</b> {resultadoCreacion.detalle?.error?.code ?? '—'}
                </div>
                <pre style={{ maxHeight: '45vh', overflow: 'auto', fontSize: '0.75rem', background: 'var(--sapList_Background)', padding: '0.75rem', borderRadius: '4px' }}>
                  {JSON.stringify({ requestCreacion: resultadoCreacion.bodyCreacion, detalle: resultadoCreacion.detalle }, null, 2)}
                </pre>
              </>
            )}

            {modal === 'confirmar-cotizacion' && (
              <>
                <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                  Función en borrador, pendiente de confirmación con el equipo SAP (clase de
                  documento, vigencia y nombres de campo aún no confirmados). Al confirmar se
                  crea una cotización real en SAP (A_SalesQuotation).
                </MessageStrip>
                <div style={{ display: 'grid', gap: '0.2rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                  <div><b>Cliente:</b> {clienteSeleccionado?.nombre} ({header.codigoCliente})</div>
                  <div><b>Destinatario Mercancía:</b> {header.destinatarioMercancia || '(no seleccionado)'}</div>
                  <div><b>Tipo Documento:</b> {header.tipoDocumento} — <b>Canal:</b> {header.canalDistribucion}</div>
                </div>
                <Table
                  style={{ marginBottom: '0.75rem' }}
                  headerRow={
                    <TableHeaderRow>
                      <TableHeaderCell>Material</TableHeaderCell>
                      <TableHeaderCell>Descripción</TableHeaderCell>
                      <TableHeaderCell>Cantidad</TableHeaderCell>
                    </TableHeaderRow>
                  }
                >
                  {lineas.map((l) => (
                    <TableRow key={l.posicion}>
                      <TableCell>{l.codigoMaterial}</TableCell>
                      <TableCell>{l.descripcion}</TableCell>
                      <TableCell>{l.cantidad}</TableCell>
                    </TableRow>
                  ))}
                </Table>
                <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                  <div>Subtotal: {formatCLP(subtotal)}</div>
                  <div>IVA: {formatCLP(totalIVA)}</div>
                  <div style={{ fontWeight: 'bold' }}>Total: {formatCLP(total)}</div>
                </div>
              </>
            )}

            {modal === 'cotizado' && (
              <MessageStrip design="Positive" hideCloseButton>
                Cotización creada exitosamente en SAP — N° <b>{numeroCotizacionCreada || '(sin número)'}</b>
              </MessageStrip>
            )}

            {modal === 'error-cotizacion' && resultadoCotizacion && (
              <>
                <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '0.75rem' }}>
                  {resultadoCotizacion.message}
                </MessageStrip>
                <div style={{ marginBottom: '0.5rem' }}>
                  <b>Código SAP:</b> {resultadoCotizacion.detalle?.error?.code ?? '—'}
                </div>
                <pre style={{ maxHeight: '45vh', overflow: 'auto', fontSize: '0.75rem', background: 'var(--sapList_Background)', padding: '0.75rem', borderRadius: '4px' }}>
                  {JSON.stringify({ requestCotizacion: resultadoCotizacion.body, detalle: resultadoCotizacion.detalle }, null, 2)}
                </pre>
              </>
            )}
          </div>
        </Dialog>
      )}

      {/* Mensaje de error — validación de datos local (pedidoValidation.ts) o
          error de red antes de llegar a SAP, sin JSON que mostrar. */}
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
