import { useState, useCallback } from 'react'
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
import { CajaFacturaList } from '@/components/pos/CajaFacturaList'
import { useCaja } from '@/hooks/useCaja'
import { useUser } from '@/stores/userContext'
import { SUCURSALES, SAP_SOCIEDAD } from '@/config/sap'
import type { CodigoSucursal } from '@/config/sap'
import type { IPartidaAbierta, Semaforo } from '@/types/caja'

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

export function CajaPage() {
  const { usuario } = useUser()
  const navigate = useNavigate()
  const [moduloActivo, setModuloActivo] = useState('pago-cta-cte')
  const [showSalirConfirm, setShowSalirConfirm] = useState(false)

  const {
    filtroCliente,
    setFiltroCliente,
    filtroNombre,
    setFiltroNombre,
    filtroDocumento,
    setFiltroDocumento,
    filtroPedido,
    setFiltroPedido,
    filtroEstado,
    setFiltroEstado,
    limpiarFiltros,
    partidas,
    isLoadingPartidas,
    errorPartidas,
    resetear,
  } = useCaja()

  // ¿Hay algún filtro activo?
  const hayFiltroActivo = filtroCliente.trim().length > 0
    || filtroNombre.trim().length > 0
    || filtroDocumento.trim().length > 0
    || filtroPedido.trim().length > 0
    || filtroEstado !== ''

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
            <Title level="H3">Listado documentos</Title>

            {/* Barra de filtros: 4 inputs + estado + limpiar */}
            <FlexBox style={{ gap: '0.75rem', alignItems: 'flex-end' }} wrap="Wrap">
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Cliente</label>
                <Input
                  placeholder="Código..."
                  value={filtroCliente}
                  onInput={(e: { target: { value: string } }) => setFiltroCliente(e.target.value)}
                  style={{ width: '130px' }}
                  data-testid="filtro-cliente"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Nombre</label>
                <Input
                  placeholder="Nombre cliente..."
                  value={filtroNombre}
                  onInput={(e: { target: { value: string } }) => setFiltroNombre(e.target.value)}
                  style={{ width: '180px' }}
                  data-testid="filtro-nombre"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Nº Documento</label>
                <Input
                  placeholder="Nº Doc..."
                  value={filtroDocumento}
                  onInput={(e: { target: { value: string } }) => setFiltroDocumento(e.target.value)}
                  style={{ width: '140px' }}
                  data-testid="filtro-documento"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Nº Pedido</label>
                <Input
                  placeholder="Nº Pedido..."
                  value={filtroPedido}
                  onInput={(e: { target: { value: string } }) => setFiltroPedido(e.target.value)}
                  style={{ width: '140px' }}
                  data-testid="filtro-pedido"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Estado</label>
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
              </div>
              {hayFiltroActivo && (
                <Button
                  icon="decline"
                  design="Transparent"
                  onClick={limpiarFiltros}
                  tooltip="Limpiar filtros"
                  data-testid="limpiar-filtro"
                >
                  Limpiar
                </Button>
              )}
            </FlexBox>

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
              mostrarColumnaCliente
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
