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
  'FOLIO: ZPOS_PRINT_SRV responde siempre "Timeout: folio no asignado para <factura> en 60 seg" (Zcodigo ???), también al repetir (prueba 16-10-2026, factura 90000050). El job de SAP que pide el folio al SII no termina: revisar en SAP (SM37 / proceso IDCP). Mientras tanto no hay folio.',
  'Preguntas a José (22-10-2026): (1) las boletas ZV01/ZV02 ¿generan algún documento o folio desde el POS (ZGENERA_FOLIO_BOLETA) o terminan en el pedido? (2) las ventas factura ZV04/ZV06/ZV07/ZV15 ¿se facturan con estos mismos 3 pasos y con qué clase?',
  '"Imprimir el DTE": no se imprime nada. El POS solo muestra el folio. Pendiente saber si imprime SAP (impresora del usuario) o el POS.',
  'Doble facturación: falta que SAP confirme si CreateFromSDDocument rechaza un segundo intento. Igual el POS busca antes la factura del pedido (ReferenceSDDocument) y no crea otra.',
  'Datos del pedido (paso 1) sin cambios: RequestedDeliveryDate y CustomerPaymentTerms siguen sin enviarse; PurchaseOrderByCustomer sigue siendo POS-<timestamp> (propuesto POS-<sucursal>-<N° local>).',
  'La action CreateFromSDDocument responde HTTP 200 con los campos de la factura VACÍOS (sin número): el POS lo obtiene buscando la factura del pedido. Avisar a SAP por si debe devolverla.',
  'IndExencion: fijo "0" hasta que SAP indique de dónde sale.',
]

const FIJOS = [
  'Desde el 22-10-2026 NO se factura automáticamente ninguna clase: ZV01 y ZV02 son boleta (no se facturan) y las ventas factura (ZV04, ZV06, ZV07, ZV15) esperan que SAP confirme el proceso. Se habilitan en CLASES_FACTURACION_AUTOMATICA (src/config/comprobante.ts y server/src/routes/comprobante.ts). El backend lo vuelve a validar. Se quitó el select Boleta / Factura.',
  'Paso 2: API_BILLINGDOCUMENT (OData V4), action CreateFromSDDocument. Token CSRF propio desde su $metadata. Referencia MÍNIMA: solo SDDocument (pedido, 10 dígitos) y SDDocumentCategory "C"; factura el pedido completo. Clase y fecha en _Control; AutomPostingToAcctgIsDisabled false (queda contabilizada).',
  'Probado en DEV (16-10-2026): con los campos del ejemplo de la guía en la referencia (BillingDocumentType, BillingDocumentDate, SalesOrganization, DestinationCountry, _Item) SAP responde SDBIL_BD_RAP/001; con _Item la unidad debe ir en el código del idioma ES ("UN"; PCE y ST dan BM/305).',
  'Paso 3: ZPOS_PRINT_SRV/PrintInvoiceSet (V2), espera hasta 90 s. Fkart = clase del pedido (según José: ZV01 → ZGENERA_FOLIO, ZV02 → ZGENERA_FOLIO_BOLETA; a revisar ahora que ZV01 es boleta). Vkorg "COOP". Solo se da por bueno Zcodigo DOK con MsgType S.',
  'Parámetros (pos_parametro_general): FACTURA_SAP_HABILITADO (N = solo muestra el JSON), FACTURA_CLASE_SAP, FOLIO_SAP_HABILITADO (N = se detiene tras la factura). Valores en DEV desde el 16-10-2026: S / ZV01 / S.',
  'Clase de factura = clase del pedido: ZV01. ZF2 de la guía da VF/007 "Clase de facturación ZF2 no prevista"; en DEV todas las facturas de pedidos ZV01 son clase ZV01 (lo mismo ZV04, ZV06, ZV07).',
]

const DINAMICOS = [
  'Pedido ← SalesOrder que devuelve SAP al crear el pedido (10 dígitos con ceros en la V4).',
  'Posiciones ← se leen desde SAP (A_SalesOrder?$expand=to_Item) solo para validar que el pedido tenga algo que facturar; la factura toma el pedido completo.',
  'Fecha de factura ← hoy en hora de Chile.',
  'Folio: Vbeln ← BillingDocument del paso 2 (sin ceros), Werks ← sucursal del usuario, Vtweg ← código del canal, Pedido ← SalesOrder (sin ceros).',
  'Cada resultado se graba en pedidos_venta apenas llega (factura_sap, factura_clase, factura_doc_contable, factura_ejercicio, factura_estado, factura_mensaje, folio, folio_codigo, folio_mensaje, facturado_en).',
]

const DATOS = [
  'Reintentar continúa desde el primer paso que falte: si la factura ya está registrada o existe en SAP (no anulada), no se crea otra; si el folio ya es DOK, no se vuelve a pedir.',
  'Antes de crear, siempre se busca la factura del pedido: BillingDocumentItem?$filter=ReferenceSDDocument eq <pedido> (y se descartan las anuladas).',
  'Con FACTURA_SAP_HABILITADO = S cada factura es un documento real en SAP (SD y FI) y aparece como partida en Caja. Se puede anular con la action CreateCancellationDocument del mismo servicio.',
  'Primera factura real: 90000050 (clase ZV01) del pedido 83, contabilizada (doc. contable 1800000051), 16-10-2026. Registrada en pedidos_venta 8000000014. Sin folio (timeout de SAP).',
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
