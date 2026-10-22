import { useState } from 'react'
import { Title, Button, FlexBox } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/navigation-down-arrow.js'
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js'

// Aviso para quien prueba Caja > E° de Cuenta. Contenido estático — mantener
// alineado con EstadoCuentaPanel.tsx y useBusquedaCtaCte.ts. Se puede contraer
// y recuerda el estado en el navegador.

const FUNCIONA = [
  'Mismo buscador, servicio y columnas que Pago Cta. Cte. (22-10-2026): piezas compartidas useBusquedaCtaCte, FormularioCuentaCorriente y TablaPartidasCtaCte. Un cambio en el buscador o en las columnas aplica a las dos pantallas.',
  'Solo consulta: sin columna "Sel." ni botón "Pagos". Con "Exportar tabla" y la barra flotante al bajar.',
  'Datos: GET /api/sap-cta-cte/partidas → FAR_CUSTOMER_LINE_ITEMS del cliente, solo partidas abiertas y normales (IsCleared vacío, SpecialGeneralLedgerCode vacío), máximo 500, filtro opcional "vence hasta".',
  'PDF (22-10-2026): "Generar PDF" lo arma en el navegador (jsPDF) con el formato de los ejemplos de Cooprinsem y lo muestra en "Previsualización PDF" con Descargar e Imprimir. Si cambia el cliente o la búsqueda, el PDF se descarta.',
  'Cuenta Corriente del PDF = las filas de la tabla en el mismo orden de pantalla, con saldo acumulado. Documentos protestados y en cartera salen con "Sin documentos".',
  'Detalle Consolidado de Deuda calculado: vencida = vence antes de la fecha del estado de cuenta; por vencer = el resto; Total General = protestados + vencida + por vencer + cartera.',
  'Encabezado: GET /api/sap-cta-cte/estado-cuenta/encabezado → nombre, dirección y ciudad del cliente (Sap_cliente + Sap_clientes_direccion); Casa Matriz desde Sap_sociedad COOP; dirección, fono, fax y web desde los parámetros ESTADO_CUENTA_CASA_MATRIZ_* (Admin > Parámetros, hoy vacíos).',
  'Dato sin fuente: en las tablas la celda va en blanco; fuera de las tablas se imprime "DATO PENDIENTE".',
]

const PENDIENTES = [
  'Sin fuente en el PDF: columnas Destin. y ACC. (en blanco), Total CP01 / CP02 (DATO PENDIENTE) — qué son y de dónde salen: Arquitectura; dirección, fono, fax y web de Casa Matriz (DATO PENDIENTE: llenar los parámetros ESTADO_CUENTA_CASA_MATRIZ_* o indicar la tabla SAP).',
  'Documentos protestados y Documentos en cartera: sin fuente todavía (cheques protestados / en cartera). Mientras tanto salen vacíos y suman 0 en el consolidado.',
  'Cuotas fijo "1 de 1": los documentos en cuotas no se listan (su pago está pendiente de definir).',
  'Contenido del estado de cuenta: hoy trae lo mismo que Pago Cta. Cte. Un estado de cuenta suele incluir también abonos, notas de crédito, anticipos a favor (CME A) y lo pagado en un período: definir con José antes del PDF.',
  'El campo Sucursal se muestra pero no filtra la consulta (igual que en Pago Cta. Cte.).',
]

const CLAVE_ABIERTO = 'cooprinsem.aviso.estado-cuenta.abierto'

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

export function PendientesEstadoCuenta() {
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
    <div style={estiloCaja} data-testid="pendientes-estado-cuenta">
      <FlexBox alignItems="Center" style={{ gap: '0.25rem', cursor: 'pointer' }} onClick={alternar}>
        <Button
          design="Transparent"
          icon={abierto ? 'navigation-down-arrow' : 'navigation-right-arrow'}
          tooltip={abierto ? 'Contraer' : 'Expandir'}
          accessibleName={abierto ? 'Contraer pendientes' : 'Expandir pendientes'}
        />
        <Title level="H5">Pendientes — E° de Cuenta</Title>
      </FlexBox>
      {abierto && (
        <div style={{ paddingTop: '0.25rem' }} data-testid="pendientes-estado-cuenta-detalle">
          <Lista titulo="Cómo funciona" items={FUNCIONA} />
          <Lista titulo="Pendientes" items={PENDIENTES} />
        </div>
      )}
    </div>
  )
}
