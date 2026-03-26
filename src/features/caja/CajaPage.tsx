import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Title,
  FlexBox,
  Button,
  MessageStrip,
  Card,
  CardHeader,
  Label,
  MessageBox,
  Input,
  Select,
  Option,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/money-bills.js'
import '@ui5/webcomponents-icons/dist/credit-card.js'
import '@ui5/webcomponents-icons/dist/receipt.js'
import '@ui5/webcomponents-icons/dist/customer.js'
import '@ui5/webcomponents-icons/dist/account.js'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/bar-chart.js'
import '@ui5/webcomponents-icons/dist/log.js'
import '@ui5/webcomponents-icons/dist/decline.js'
import { ListPagaresPanel } from '@/features/caja/ListPagaresPanel'
import { AntClientePanel } from '@/features/caja/AntClientePanel'
import { ArqueoCajaPanel } from '@/features/caja/ArqueoCajaPanel'
import { ClienteSearch } from '@/components/pos/ClienteSearch'
import { CajaFacturaList } from '@/components/pos/CajaFacturaList'
import { useCaja } from '@/hooks/useCaja'
import { useUser } from '@/stores/userContext'
import { SUCURSALES, SAP_SOCIEDAD, CLIENTE_BOLETA } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'
import type { IPartidaAbierta, Semaforo } from '@/types/caja'
import { CLIENTES_MOCK } from '@/test/factories'

// Botones del menú de caja (8 funciones según PRD)
const MENU_CAJA = [
  { id: 'pago-cta-cte', label: 'Pago Cta. Cte.', icon: 'money-bills', habilitado: true },
  { id: 'egreso-caja', label: 'Egr. de Caja', icon: 'credit-card', habilitado: false },
  { id: 'list-pagares', label: 'List. Pagarés', icon: 'receipt', habilitado: true },
  { id: 'ant-cliente', label: 'Ant. Cliente', icon: 'customer', habilitado: true },
  { id: 'estado-cuenta', label: 'E° de Cuenta', icon: 'account', habilitado: false },
  { id: 'consulta-pago', label: 'Consulta Pago', icon: 'search', habilitado: false },
  { id: 'arqueo-caja', label: 'Arqueo Caja', icon: 'bar-chart', habilitado: true },
  { id: 'salir-caja', label: 'Salir de la Caja', icon: 'log', habilitado: true },
] as const

// Mapa kunnr → nombre para mostrar en la tabla
const CLIENTE_NOMBRES_MAP: Record<string, string> = {}
for (const c of CLIENTES_MOCK) {
  CLIENTE_NOMBRES_MAP[c.codigoCliente] = c.nombre
}

export function CajaPage() {
  const { usuario } = useUser()
  const navigate = useNavigate()
  const sucursal = usuario?.sucursal ?? 'D190'
  const [moduloActivo, setModuloActivo] = useState('pago-cta-cte')
  const [showSalirConfirm, setShowSalirConfirm] = useState(false)
  const [filtroInput, setFiltroInput] = useState('')

  const {
    clienteSeleccionado,
    seleccionarCliente,
    deseleccionarCliente,
    filtrarPorTexto,
    filtroEstado,
    setFiltroEstado,
    partidas,
    isLoadingPartidas,
    errorPartidas,
    resetear,
  } = useCaja()

  // ¿Hay un filtro activo (cliente o texto)?
  const hayFiltroActivo = !!clienteSeleccionado || filtroInput.trim().length > 0

  // Determinar si mostrar columna Cliente (cuando no hay cliente seleccionado)
  const mostrarColumnaCliente = !clienteSeleccionado

  // Mapa de nombres de clientes (incluye los del mock)
  const clienteNombres = useMemo(() => CLIENTE_NOMBRES_MAP, [])

  const handleFiltroChange = useCallback((e: CustomEvent) => {
    const value = (e.target as HTMLInputElement).value ?? ''
    setFiltroInput(value)
    filtrarPorTexto(value)
  }, [filtrarPorTexto])

  const handleLimpiarFiltro = useCallback(() => {
    setFiltroInput('')
    deseleccionarCliente()
  }, [deseleccionarCliente])

  const handleClienteBoletaClick = useCallback(() => {
    const boleta = CLIENTES_MOCK.find((c) => c.codigoCliente === CLIENTE_BOLETA)
    if (boleta) {
      seleccionarCliente(boleta)
      setFiltroInput('')
    }
  }, [seleccionarCliente])

  // Confirmación de salida de caja
  const handleSalirClick = useCallback(() => {
    setShowSalirConfirm(true)
  }, [])

  const handleSalirConfirm = useCallback((action: string | undefined) => {
    setShowSalirConfirm(false)
    if (action === 'OK') {
      resetear()
      navigate('/home')
    }
  }, [resetear, navigate])

  // Clic en partida → navegar a pantalla detalle de pago
  const handleClickPartida = useCallback((partida: IPartidaAbierta) => {
    navigate(`/caja/pago/${partida.belnr}?kunnr=${partida.kunnr}`)
  }, [navigate])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Menú lateral */}
      <nav
        style={{
          width: '200px',
          borderRight: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)',
          padding: '1rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
        aria-label="Menú de Caja"
      >
        {MENU_CAJA.map((item) => (
          <Button
            key={item.id}
            icon={item.icon}
            design={moduloActivo === item.id && item.habilitado ? 'Emphasized' : 'Default'}
            disabled={!item.habilitado}
            onClick={() => {
              if (!item.habilitado) return
              if (item.id === 'salir-caja') {
                handleSalirClick()
              } else {
                setModuloActivo(item.id)
              }
            }}
            style={{ width: '100%', justifyContent: 'flex-start' }}
            tooltip={item.habilitado ? undefined : 'Próximamente'}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Contenido principal */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
        {/* Panel info usuario/sucursal/sociedad */}
        <Card
          header={<CardHeader titleText="Sesión de Caja" />}
          style={{ marginBottom: '1rem' }}
        >
          <FlexBox style={{ padding: '0.75rem 1rem', gap: '2rem' }} wrap="Wrap">
            <FlexBox direction="Column" style={{ gap: '0.15rem' }}>
              <Label style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>Usuario</Label>
              <Label>{usuario?.id} — {usuario?.nombre}</Label>
            </FlexBox>
            <FlexBox direction="Column" style={{ gap: '0.15rem' }}>
              <Label style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>Sucursal</Label>
              <Label>{usuario?.sucursal} — {SUCURSALES[usuario?.sucursal as CodigoSucursal] ?? usuario?.sucursal}</Label>
            </FlexBox>
            <FlexBox direction="Column" style={{ gap: '0.15rem' }}>
              <Label style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>Sociedad</Label>
              <Label>{SAP_SOCIEDAD} — COOPRINSEM LTDA.</Label>
            </FlexBox>
          </FlexBox>
        </Card>

        {moduloActivo === 'pago-cta-cte' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <Title level="H3">Pago Cuenta Corriente — Cobro Efectivo</Title>

            {/* Barra de filtro: buscador de cliente + filtro texto + botón limpiar */}
            <FlexBox style={{ gap: '0.75rem', alignItems: 'flex-end' }} wrap="Wrap">
              <div style={{ flex: '1 1 300px' }}>
                <ClienteSearch
                  onClienteSeleccionado={(cliente) => {
                    seleccionarCliente(cliente)
                    setFiltroInput('')
                  }}
                  onClienteDeseleccionado={deseleccionarCliente}
                  sucursal={sucursal}
                />
              </div>
              <Input
                placeholder="Filtrar por Nº Doc o código cliente..."
                value={filtroInput}
                onInput={handleFiltroChange}
                disabled={!!clienteSeleccionado}
                style={{ flex: '0 1 250px' }}
                data-testid="filtro-partidas"
              />
              <Select
                onChange={(e) => {
                  const val = (e.detail?.selectedOption as HTMLElement)?.getAttribute('data-value') ?? ''
                  setFiltroEstado(val as Semaforo | '')
                }}
                style={{ width: '160px' }}
                data-testid="filtro-estado"
              >
                <Option data-value="" selected={filtroEstado === ''}>Todos</Option>
                <Option data-value="verde" selected={filtroEstado === 'verde'}>Vigente</Option>
                <Option data-value="amarillo" selected={filtroEstado === 'amarillo'}>Por vencer</Option>
                <Option data-value="rojo" selected={filtroEstado === 'rojo'}>Vencida</Option>
                <Option data-value="pagada" selected={filtroEstado === 'pagada'}>Pagada</Option>
              </Select>
              {hayFiltroActivo && (
                <Button
                  icon="decline"
                  design="Transparent"
                  onClick={handleLimpiarFiltro}
                  tooltip="Limpiar filtro"
                  data-testid="limpiar-filtro"
                >
                  Limpiar
                </Button>
              )}
              <Button
                design="Default"
                icon="customer"
                onClick={handleClienteBoletaClick}
                data-testid="btn-cliente-boleta"
              >
                Cliente Boleta
              </Button>
            </FlexBox>

            {/* Info filtro activo */}
            {clienteSeleccionado && (
              <MessageStrip design="Information" hideCloseButton>
                Mostrando partidas de: {clienteSeleccionado.nombre} ({clienteSeleccionado.codigoCliente})
              </MessageStrip>
            )}

            {/* Error cargando partidas */}
            {errorPartidas && (
              <MessageStrip design="Negative">{errorPartidas}</MessageStrip>
            )}

            {/* Grilla de partidas — clic navega a detalle de pago */}
            <CajaFacturaList
              partidas={partidas}
              partidasSeleccionadas={[]}
              onTogglePartida={() => {}}
              isLoading={isLoadingPartidas}
              mostrarColumnaCliente={mostrarColumnaCliente}
              clienteNombres={clienteNombres}
              onClickPartida={handleClickPartida}
            />
          </div>
        )}

        {/* Listado de Pagarés */}
        {moduloActivo === 'list-pagares' && <ListPagaresPanel />}

        {/* Anticipo de Cliente */}
        {moduloActivo === 'ant-cliente' && <AntClientePanel />}

        {/* Arqueo de Caja */}
        {moduloActivo === 'arqueo-caja' && <ArqueoCajaPanel />}

        {/* Confirmación salir de caja */}
        {showSalirConfirm && (
          <MessageBox
            type="Confirm"
            open
            onClose={handleSalirConfirm}
          >
            ¿Desea salir de la Caja? Se perderán los datos no guardados.
          </MessageBox>
        )}
      </main>
    </div>
  )
}
