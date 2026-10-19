import { useState } from 'react'
import { Title, Button, FlexBox } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/navigation-down-arrow.js'
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js'

// Aviso para quien prueba Caja > Home ("Listado documentos"): qué va fijo, qué
// falta definir y qué asumimos (mismo criterio que PendientesCtaCte).
// Contenido estático — mantener alineado con server/src/routes/sapCtaCte.ts
// (GET /documentos-home), ListadoDocumentosCaja.tsx y CajaPage.tsx. Se puede
// contraer (más limpio para las capturas que se envían a Arquitectura); el
// estado se recuerda en el navegador. Quitar este bloque cuando no queden pendientes.

const PENDIENTES = [
  'Confirmar con Arquitectura que BusinessPlace es la sucursal de venta y que su código es el centro del POS (D190 = Osorno).',
  'Los asientos que crea el POS (aperturas, egresos, pagos — usuario SCLPOS_01, ZCOOP_JOURNALENTRY_SRV / ZCOOP_PAYMENT_SRV) no traen BusinessPlace y por eso NO aparecen. Consultado a Arquitectura si esos servicios pueden aceptar el lugar comercial (BUPLA).',
  '¿Los abonos (H) deben verse en el Home aunque no se paguen ahí?',
  '¿Se limita a tipos D1 / D4 / D6? Hoy también aparecen K1 y AB cuando traen sucursal.',
  'Rango por defecto fijo desde el 01-10-2026: confirmar si pasa a "últimos N días".',
  'Filtros IsCleared / SpecialGeneralLedgerCode / $top 500 aplicados el 16-10-2026 (recomendación enviada a José/Arquitectura): pendiente su validación.',
]

const FIJOS = [
  'Servicio FAR_CUSTOMER_LINE_ITEMS/Items (mandante del parámetro MANDANTE, sap-language ES).',
  "$filter: PostingDate entre desde y hasta · CompanyCode eq 'COOP' · IsCleared eq ' ' (solo abiertas) · SpecialGeneralLedgerCode eq ' ' (sin CME) · BusinessPlace eq <sucursal del usuario>.",
  '$orderby=PostingDate desc y $top 501: se muestran 500; si llega la 501 se avisa que hay más y que se acoten las fechas.',
  'Columnas: Sel., Estado, Sucursal (BusinessPlace), Tipo documento (descripción de tipo_documento), Folio (N° de documento si no hay folio SII), Rut (TaxID1), Cliente (CustomerName), Moneda Doc., Monto Doc., Moneda, Monto, Fecha (fecha del documento), Bloqueo pago.',
  'Sin seleccionar (se muestran con el motivo al pasar el mouse): abonos (H), con bloqueo de pago, en cuotas y pagados con el servicio anterior sin compensar ("PAGO FACT").',
  'Pagos: misma pantalla de pago de Pago Cta. Cte. (ZCOOP_PAYMENT_SRV). El backend vuelve a validar en SAP que cada partida siga abierta para el cliente; los montos salen de SAP.',
  'Pago parcial (residual, 19-10-2026): con UNA factura se puede cobrar menos que el total; la factura se compensa y queda una partida pendiente por la diferencia (aparece de nuevo en este listado). Habilitado en DEV.',
]

const DINAMICOS = [
  'Sucursal ← sucursal del usuario logueado (sin sucursal asignada no se consulta y se muestra un error).',
  'Desde / Hasta ← por defecto 01-10-2026 a hoy (Chile); al cambiarlos se vuelve a consultar SAP. Botón "Actualizar" repite la consulta.',
  'Filtros sobre lo ya cargado (no consultan SAP): Cliente (código, contiene), Nombre (contiene, sin mayúsculas) y Estado.',
  'Paginación: 10 filas por página (10/30/50/100). La selección se mantiene al cambiar de página.',
  'Pago múltiple ← parámetro PAGO_MULTIPLE ("N" = un documento por pago).',
]

const ASUMIDOS = [
  'Estado: Vencida si NetDueArrearsDays > 0; Por vencer si vence en 7 días o menos; Vigente en otro caso. "Pagada" ya no tiene resultados (no llegan pagadas).',
  'Solo se pagan juntos documentos de un mismo cliente (Customer): si se elige otro cliente se avisa y no se agrega.',
  'Orden en pantalla: fecha del documento, más reciente primero.',
  'Montos en CLP enteros, sin decimales.',
]

const CLAVE_ABIERTO = 'cooprinsem.aviso.home-caja.abierto'

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

export function PendientesHomeCaja() {
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
    <div style={estiloCaja} data-testid="pendientes-home-caja">
      <FlexBox alignItems="Center" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={alternar}>
        <Button
          design="Transparent"
          icon={abierto ? 'navigation-down-arrow' : 'navigation-right-arrow'}
          tooltip={abierto ? 'Contraer' : 'Expandir'}
          accessibleName={abierto ? 'Contraer pendientes' : 'Expandir pendientes'}
          data-testid="pendientes-home-caja-toggle"
        />
        <Title level="H5">Pendientes — Caja: Listado documentos</Title>
      </FlexBox>
      {abierto && (
        <div style={{ paddingTop: '0.25rem' }} data-testid="pendientes-home-caja-detalle">
          <p style={{ margin: '0 0 0.75rem' }}>
            Réplica de la grilla "Listado de Documentos" del WebDynpro de Caja: documentos abiertos de la sucursal del
            usuario en SAP (consulta de José, 15-10-2026, con los filtros acordados el 16-10-2026).
          </p>
          <Lista titulo="Pendiente / por definir" items={PENDIENTES} />
          <Lista titulo="Fijo (hardcodeado)" items={FIJOS} />
          <Lista titulo="Dinámico" items={DINAMICOS} />
          <Lista titulo="Asumido" items={ASUMIDOS} />
        </div>
      )}
    </div>
  )
}
