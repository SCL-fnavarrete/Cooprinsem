import { useState } from 'react'
import { Title, Button, FlexBox } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/navigation-down-arrow.js'
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js'

// Aviso para quien prueba la facturación del pedido (pasos 2 y 3 del documento
// de José Castillo, 16-10-2026): qué va fijo, qué es dinámico y qué falta
// definir. Contenido estático — mantener alineado con
// server/src/routes/sapFacturas.ts y sapFacturasBody.ts. Se puede contraer y
// recuerda el estado en el navegador. Quitar cuando no queden pendientes.

const PENDIENTES = [
  'Clase de factura (BillingDocumentType): se usa ZF2 de la guía, en el parámetro FACTURA_CLASE_SAP. Por confirmar con SAP la clase real de factura (y de boleta).',
  'Folio en DEV: no está confirmado si ZPOS_PRINT_SRV pide el folio al SII real o a certificación. Por eso el paso 3 tiene su propio parámetro (FOLIO_SAP_HABILITADO).',
  '"Imprimir el DTE": no se imprime nada. El POS solo muestra el folio. Pendiente saber si imprime SAP (impresora del usuario) o el POS.',
  'Doble facturación: falta que SAP confirme si CreateFromSDDocument rechaza un segundo intento. Igual el POS busca antes la factura del pedido (ReferenceSDDocument) y no crea otra.',
  'Datos del pedido (paso 1) sin cambios: RequestedDeliveryDate y CustomerPaymentTerms siguen sin enviarse; PurchaseOrderByCustomer sigue siendo POS-<timestamp> (propuesto POS-<sucursal>-<N° local>).',
  'Autorización del usuario técnico SCLPOS_01 para crear facturas en la V4: se confirma en la primera prueba real.',
  'Boleta (ZV02) y consumidor final: fuera de alcance por ahora.',
  'IndExencion: fijo "0" hasta que SAP indique de dónde sale.',
]

const FIJOS = [
  'Solo se factura un pedido nuevo con Tipo Documento "Venta normal" (ZV01) y Boleta/Factura = "Factura" (José, 16-10-2026). El backend lo vuelve a validar.',
  'Paso 2: API_BILLINGDOCUMENT (OData V4), action CreateFromSDDocument. Token CSRF propio desde su $metadata. SDDocumentCategory "C", DestinationCountry "CL", AutomPostingToAcctgIsDisabled false, SalesOrganization "COOP".',
  'Paso 3: ZPOS_PRINT_SRV/PrintInvoiceSet (V2), espera hasta 90 s. Fkart = clase del pedido (ZV01 = factura → ZGENERA_FOLIO). Vkorg "COOP". Solo se da por bueno Zcodigo DOK con MsgType S.',
  'Parámetros (pos_parametro_general): FACTURA_SAP_HABILITADO (N = solo muestra el JSON), FACTURA_CLASE_SAP (ZF2), FOLIO_SAP_HABILITADO (N = se detiene tras la factura). Arrancan en N / ZF2 / N.',
]

const DINAMICOS = [
  'Pedido ← SalesOrder que devuelve SAP al crear el pedido (10 dígitos con ceros en la V4).',
  'Posiciones a facturar ← leídas desde SAP (A_SalesOrder?$expand=to_Item), no desde el carro: SalesOrderItem a 6 dígitos (10 → 000010), cantidad completa y unidad de SAP. Se omiten las rechazadas.',
  'Fecha de factura ← hoy en hora de Chile.',
  'Folio: Vbeln ← BillingDocument del paso 2 (sin ceros), Werks ← sucursal del usuario, Vtweg ← código del canal, Pedido ← SalesOrder (sin ceros).',
  'Cada resultado se graba en pedidos_venta apenas llega (factura_sap, factura_clase, factura_doc_contable, factura_ejercicio, factura_estado, factura_mensaje, folio, folio_codigo, folio_mensaje, facturado_en).',
]

const DATOS = [
  'Reintentar continúa desde el primer paso que falte: si la factura ya está registrada o existe en SAP (no anulada), no se crea otra; si el folio ya es DOK, no se vuelve a pedir.',
  'Antes de crear, siempre se busca la factura del pedido: BillingDocumentItem?$filter=ReferenceSDDocument eq <pedido> (y se descartan las anuladas).',
  'Con FACTURA_SAP_HABILITADO = S cada factura es un documento real en SAP (SD y FI) y aparece como partida en Caja. Se puede anular con la action CreateCancellationDocument del mismo servicio.',
  'Cada llamada a SAP se muestra con su URL, el JSON enviado y la respuesta (botón Copiar), para depurar.',
]

const CLAVE_ABIERTO = 'cooprinsem.aviso.facturacion.abierto'

function leerAbierto(): boolean {
  try {
    return localStorage.getItem(CLAVE_ABIERTO) !== 'N'
  } catch {
    return true
  }
}

const estiloCaja = {
  padding: '0.5rem 1rem',
  background: 'var(--sapWarningBackground, #fff8d6)',
  border: '1px solid var(--sapWarningBorderColor, #e9730c)',
  borderRadius: '0.5rem',
  color: 'var(--sapTextColor)',
  fontSize: '0.8125rem',
}

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <>
      <strong>{titulo}</strong>
      <ul style={{ margin: '0.25rem 0 0.75rem', paddingLeft: '1.25rem' }}>
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </>
  )
}

export function PendientesFacturacion() {
  const [abierto, setAbierto] = useState(leerAbierto)

  const alternar = () => {
    const nuevo = !abierto
    setAbierto(nuevo)
    try {
      localStorage.setItem(CLAVE_ABIERTO, nuevo ? 'S' : 'N')
    } catch {
      // Sin almacenamiento (modo privado): solo se pierde recordar el estado
    }
  }

  return (
    <div style={estiloCaja} data-testid="pendientes-facturacion">
      <FlexBox alignItems="Center" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={alternar}>
        <Button
          design="Transparent"
          icon={abierto ? 'navigation-down-arrow' : 'navigation-right-arrow'}
          tooltip={abierto ? 'Contraer' : 'Expandir'}
          accessibleName={abierto ? 'Contraer pendientes' : 'Expandir pendientes'}
        />
        <Title level="H5">Pendientes — Facturación del pedido</Title>
      </FlexBox>
      {abierto && (
        <div style={{ paddingTop: '0.25rem' }} data-testid="pendientes-facturacion-detalle">
          <p style={{ margin: '0 0 0.75rem' }}>
            Pasos 2 (factura) y 3 (folio) del documento "Creación de factura POS — ejemplo de los 3 pasos SAP" (José Castillo, 16-10-2026).
          </p>
          <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
          <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
          <Lista titulo="Dinámico" items={DINAMICOS} />
          <Lista titulo="Datos importantes" items={DATOS} />
        </div>
      )}
    </div>
  )
}
