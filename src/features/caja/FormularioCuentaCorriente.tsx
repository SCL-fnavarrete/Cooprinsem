import '@ui5/webcomponents-icons/dist/value-help.js'
import {
  Card,
  CardHeader,
  FlexBox,
  Label,
  Input,
  Button,
  Select,
  Option,
  DatePicker,
  MessageStrip,
} from '@ui5/webcomponents-react'
import { BusquedaClienteDialog } from '@/components/pos/BusquedaClienteDialog'
import { useUser } from '@/stores/userContext'
import type { IBusquedaCtaCte } from './useBusquedaCtaCte'

const estiloCampo = { display: 'grid', gap: '0.25rem' } as const

interface FormularioCuentaCorrienteProps {
  busqueda: IBusquedaCtaCte
  titulo?: string
  // Campos uno debajo del otro (columna lateral de E° de Cuenta)
  vertical?: boolean
}

/**
 * Formulario "Cuenta Corriente" (réplica del WebDynpro), compartido por
 * Caja > Pago Cta. Cte. y Caja > E° de Cuenta: Rut, Cliente, Nombre, Sucursal,
 * Fecha vencimiento y Buscar, más el buscador avanzado de clientes. La lógica
 * vive en useBusquedaCtaCte.
 */
export function FormularioCuentaCorriente({ busqueda, titulo = 'Cuenta Corriente', vertical = false }: FormularioCuentaCorrienteProps) {
  const { usuario } = useUser()
  const b = busqueda
  return (
    <>
      <Card header={<CardHeader titleText={titulo} />}>
        <div style={{
          padding: '1rem', display: 'grid', gap: '0.75rem 1rem', alignItems: 'start',
          gridTemplateColumns: vertical ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
        }}>
          <div style={estiloCampo}>
            <Label for="ctacte-rut">Rut</Label>
            <FlexBox style={{ gap: '0.25rem' }}>
              <Input
                id="ctacte-rut"
                value={b.rut}
                onInput={(e: { target: { value: string } }) => b.editarRut(e.target.value)}
                onChange={b.alSalirDeRut}
                placeholder="12.345.678-9"
                style={{ flex: 1 }}
                aria-label="Rut"
              />
              <Button icon="value-help" design="Transparent" tooltip="Buscar cliente" onClick={() => b.setShowBuscador(true)} aria-label="Buscar cliente por RUT" />
            </FlexBox>
          </div>

          <div style={estiloCampo}>
            <Label for="ctacte-cliente">Cliente</Label>
            <FlexBox style={{ gap: '0.25rem' }}>
              <Input
                id="ctacte-cliente"
                value={b.codigoCliente}
                onInput={(e: { target: { value: string } }) => b.editarCodigo(e.target.value.trim())}
                onChange={b.alSalirDeCliente}
                placeholder="Código SAP"
                style={{ flex: 1 }}
                aria-label="Cliente"
              />
              <Button icon="value-help" design="Transparent" tooltip="Buscar cliente" onClick={() => b.setShowBuscador(true)} aria-label="Buscar cliente por código" />
            </FlexBox>
          </div>

          <div style={estiloCampo}>
            <Label>Nombre</Label>
            <span style={{ fontWeight: 'bold', minHeight: '1.25rem' }} data-testid="ctacte-nombre">
              {b.cliente?.nombre ?? '—'}
            </span>
          </div>

          <div style={estiloCampo}>
            <Label>Sucursal</Label>
            <Select
              onChange={(e) => b.setSucursal(e.detail.selectedOption?.getAttribute('data-value') ?? '')}
              aria-label="Sucursal"
            >
              <Option data-value="" selected={b.sucursal === ''}>Todas</Option>
              {b.centros.map((c) => (
                <Option key={c.Plant} data-value={c.Plant} selected={c.Plant === b.sucursal}>
                  {c.Plant} — {c.PlantName}
                </Option>
              ))}
            </Select>
          </div>

          <div style={estiloCampo}>
            <Label>Fecha vencimiento</Label>
            {/* PROVISORIO: en SAP es un select; datepicker mientras se confirman sus opciones */}
            <DatePicker
              value={b.fechaVencimiento}
              formatPattern="yyyy-MM-dd"
              onChange={(e) => b.setFechaVencimiento(e.detail.valid ? e.detail.value : '')}
              aria-label="Fecha vencimiento"
            />
          </div>

          <div style={{ alignSelf: 'end' }}>
            <Button design="Emphasized" onClick={() => void b.identificarCliente('ambos')} disabled={b.isBuscando} style={vertical ? { width: '100%' } : undefined} data-testid="ctacte-buscar">
              {b.isBuscando ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>

          {b.error && <MessageStrip design="Negative" hideCloseButton style={{ gridColumn: '1 / -1' }}>{b.error}</MessageStrip>}

          {b.coincidencias.length > 0 && (
            <div style={{ display: 'grid', gap: '0.25rem', gridColumn: '1 / -1' }}>
              <MessageStrip design="Critical" hideCloseButton>
                Hay {b.coincidencias.length} clientes con este RUT. Seleccione uno:
              </MessageStrip>
              {b.coincidencias.map((c) => (
                <Button key={c.codigoCliente} design="Default" onClick={() => b.asignarCliente(c)} style={{ justifyContent: 'flex-start' }}>
                  {c.codigoCliente} — {c.nombre}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <BusquedaClienteDialog
        open={b.showBuscador}
        sucursal={usuario?.sucursal}
        onSeleccionar={(c) => {
          b.asignarCliente(c)
          b.setShowBuscador(false)
        }}
        onCerrar={() => b.setShowBuscador(false)}
      />
    </>
  )
}
