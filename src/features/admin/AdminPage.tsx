import { useState, useEffect, useCallback } from 'react'
import {
  Title,
  FlexBox,
  Button,
  MessageStrip,
  MessageBox,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Tag,
  Dialog,
  Form,
  FormItem,
  Input,
  Select,
  Option,
  Label,
  BusyIndicator,
} from '@ui5/webcomponents-react'
import type { InputDomRef } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/employee.js'
import '@ui5/webcomponents-icons/dist/role.js'
import '@ui5/webcomponents-icons/dist/building.js'
import '@ui5/webcomponents-icons/dist/add-employee.js'
import '@ui5/webcomponents-icons/dist/edit.js'
import '@ui5/webcomponents-icons/dist/activate.js'
import '@ui5/webcomponents-icons/dist/decline.js'
import '@ui5/webcomponents-icons/dist/connected.js'
import '@ui5/webcomponents-icons/dist/database.js'
import '@ui5/webcomponents-icons/dist/legend.js'
import type { IUsuarioAdmin, ICreateUsuarioRequest, IUpdateUsuarioRequest, IRol, ISucursal } from '@/types/admin'
import type { IInterfaz, ISapBanco, ISapCentro, ISapCentroCosto, ISapSociedad, ISapRegion } from '@/types/sapMaestro'
import { getUsuarios, createUsuario, updateUsuario, toggleEstadoUsuario, getRoles, getSucursales, getCentrosUsuario, setCentrosUsuario, getSociedadesUsuario, setSociedadesUsuario } from '@/services/api/admin'
import { PosMaestrosPanel } from './PosMaestrosPanel'
import { getInterfases, getSapBancos, getSapCentros, getSapCentrosCosto, getSapSociedades, getSapRegiones } from '@/services/api/sapMaestro'

type TabActiva = 'usuarios' | 'roles' | 'sucursales' | 'interfases' | 'tablas-sap' | 'maestros-pos'
type TabSap = 'bancos' | 'centros' | 'centros-costo' | 'sociedades' | 'regiones'

const MENU_ADMIN = [
  { id: 'usuarios' as TabActiva, label: 'Usuarios', icon: 'employee' },
  { id: 'roles' as TabActiva, label: 'Roles', icon: 'role' },
  { id: 'sucursales' as TabActiva, label: 'Sucursales', icon: 'building' },
  { id: 'interfases' as TabActiva, label: 'Interfases', icon: 'connected' },
  { id: 'tablas-sap' as TabActiva, label: 'Tablas SAP', icon: 'database' },
  { id: 'maestros-pos' as TabActiva, label: 'Maestros POS', icon: 'legend' },
] as const

const TIPOS_INTERFAZ: Record<number, string> = {
  1: 'Sync Productos',
  2: 'Sync Bancos',
  3: 'Sync Sociedades',
  4: 'Sync Centros',
  5: 'Sync Centro Costo',
}

function rolDesign(rolCod: number): 'Set1' | 'Set2' | 'Set3' {
  switch (rolCod) {
    case 1: return 'Set1'
    case 2: return 'Set2'
    case 3: return 'Set3'
    default: return 'Set1'
  }
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleString('es-CL')
}

export function AdminPage() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('usuarios')
  const [usuarios, setUsuarios] = useState<IUsuarioAdmin[]>([])
  const [roles, setRoles] = useState<IRol[]>([])
  const [sucursales, setSucursales] = useState<ISucursal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal usuario
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<IUsuarioAdmin | null>(null)
  const [formRut, setFormRut] = useState('')
  const [formNombre, setFormNombre] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRol, setFormRol] = useState<1 | 2 | 3 | 4>(1)
  const [formSucursal, setFormSucursal] = useState('D190')
  const [formEstado, setFormEstado] = useState<1 | 2>(1)
  const [formIdVendedor, setFormIdVendedor] = useState('')
  const [todosCentros, setTodosCentros] = useState<ISapCentro[]>([])
  const [todasSociedades, setTodasSociedades] = useState<ISapSociedad[]>([])
  const [centrosSeleccionados, setCentrosSeleccionados] = useState<string[]>([])
  const [sociedadesSeleccionadas, setSociedadesSeleccionadas] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showDesactivarConfirm, setShowDesactivarConfirm] = useState(false)
  const [userToToggle, setUserToToggle] = useState<IUsuarioAdmin | null>(null)

  // Interfases
  const [interfases, setInterfases] = useState<IInterfaz[]>([])
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  // Tablas SAP
  const [tabSap, setTabSap] = useState<TabSap>('bancos')
  const [bancos, setBancos] = useState<ISapBanco[]>([])
  const [centros, setCentros] = useState<ISapCentro[]>([])
  const [centrosCosto, setCentrosCosto] = useState<ISapCentroCosto[]>([])
  const [sociedades, setSociedades] = useState<ISapSociedad[]>([])
  const [regiones, setRegiones] = useState<ISapRegion[]>([])
  const [searchSap, setSearchSap] = useState('')

  // Cargar datos según tab activa
  useEffect(() => {
    setError(null)
    setIsLoading(true)

    if (tabActiva === 'usuarios') {
      getUsuarios()
        .then(setUsuarios)
        .catch((e: Error) => setError(e.message))
        .finally(() => setIsLoading(false))
    } else if (tabActiva === 'roles') {
      getRoles()
        .then(setRoles)
        .catch((e: Error) => setError(e.message))
        .finally(() => setIsLoading(false))
    } else if (tabActiva === 'sucursales') {
      getSucursales()
        .then(setSucursales)
        .catch((e: Error) => setError(e.message))
        .finally(() => setIsLoading(false))
    } else if (tabActiva === 'interfases') {
      getInterfases()
        .then(setInterfases)
        .catch((e: Error) => setError(e.message))
        .finally(() => setIsLoading(false))
    } else if (tabActiva === 'tablas-sap') {
      getSapBancos()
        .then(setBancos)
        .catch((e: Error) => setError(e.message))
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [tabActiva])

  // Cargar datos SAP según subtab
  useEffect(() => {
    if (tabActiva !== 'tablas-sap') return
    setIsLoading(true)
    setError(null)
    setSearchSap('')

    if (tabSap === 'bancos') {
      getSapBancos().then(setBancos).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    } else if (tabSap === 'centros') {
      getSapCentros().then(setCentros).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    } else if (tabSap === 'centros-costo') {
      getSapCentrosCosto().then(setCentrosCosto).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    } else if (tabSap === 'sociedades') {
      getSapSociedades().then(setSociedades).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    } else if (tabSap === 'regiones') {
      getSapRegiones().then(setRegiones).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    }
  }, [tabSap, tabActiva])

  // Buscar en tablas SAP
  const handleBuscarSap = useCallback(() => {
    setIsLoading(true)
    setError(null)
    if (tabSap === 'bancos') {
      getSapBancos(searchSap).then(setBancos).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    } else if (tabSap === 'centros') {
      getSapCentros(searchSap).then(setCentros).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    } else if (tabSap === 'centros-costo') {
      getSapCentrosCosto(searchSap).then(setCentrosCosto).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    } else if (tabSap === 'sociedades') {
      getSapSociedades(searchSap).then(setSociedades).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    } else if (tabSap === 'regiones') {
      getSapRegiones(searchSap).then(setRegiones).catch((e: Error) => setError(e.message)).finally(() => setIsLoading(false))
    }
  }, [tabSap, searchSap])

  // Filtrar interfases
  const handleFiltrarInterfases = useCallback(() => {
    setIsLoading(true)
    setError(null)
    getInterfases({
      tipo: filtroTipo ? Number(filtroTipo) : undefined,
      desde: filtroDesde || undefined,
      hasta: filtroHasta || undefined,
    })
      .then(setInterfases)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [filtroTipo, filtroDesde, filtroHasta])

  const handleNuevoUsuario = useCallback(() => {
    setEditingUser(null)
    setFormRut('')
    setFormNombre('')
    setFormUsername('')
    setFormPassword('')
    setFormEmail('')
    setFormRol(1)
    setFormSucursal('D190')
    setFormEstado(1)
    setFormIdVendedor('')
    setFormError(null)
    setCentrosSeleccionados([])
    setSociedadesSeleccionadas([])
    getSapCentros().then(setTodosCentros).catch(() => { })
    getSapSociedades().then(setTodasSociedades).catch(() => { })
    setShowModal(true)
  }, [])
  const handleEditarUsuario = useCallback((user: IUsuarioAdmin) => {
    setEditingUser(user)
    setFormRut(user.rut ?? '')
    setFormNombre(user.nombreCompleto)
    setFormUsername(user.username)
    setFormPassword('')
    setFormEmail(user.email)
    setFormRol(user.rolCod)
    setFormSucursal(user.sucursalId)
    setFormEstado(user.estado)
    setFormIdVendedor(user.idVendedor ?? '')
    setFormError(null)
    setCentrosSeleccionados([])
    setSociedadesSeleccionadas([])
    getSapCentros().then(setTodosCentros).catch(() => { })
    getCentrosUsuario(user.username).then(setCentrosSeleccionados).catch(() => { })
    getSapSociedades().then(setTodasSociedades).catch(() => { })
    getSociedadesUsuario(user.username).then(setSociedadesSeleccionadas).catch(() => { })
    setShowModal(true)
  }, [])

  const handleGuardar = useCallback(async () => {
    if (!formNombre.trim()) { setFormError('El nombre completo es obligatorio'); return }
    if (!editingUser && !formUsername.trim()) { setFormError('El usuario (login) es obligatorio'); return }
    if (!editingUser && !formPassword.trim()) { setFormError('La contraseña es obligatoria'); return }
    if (formIdVendedor.trim() && !/^\d{3,15}$/.test(formIdVendedor.trim())) {
      setFormError('Id Vendedor debe ser numérico, entre 3 y 15 dígitos')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      let usernameGuardado = ''
      if (editingUser) {
        const data: IUpdateUsuarioRequest = { rut: formRut, nombreCompleto: formNombre, email: formEmail, rolCod: formRol, sucursalId: formSucursal, estado: formEstado, idVendedor: formIdVendedor }
        const updated = await updateUsuario(editingUser.id, data)
        setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
        usernameGuardado = editingUser.username
      } else {
        const data: ICreateUsuarioRequest = { username: formUsername, password: formPassword, rut: formRut, nombreCompleto: formNombre, email: formEmail, rolCod: formRol, sucursalId: formSucursal, estado: formEstado, idVendedor: formIdVendedor }
        const created = await createUsuario(data)
        setUsuarios((prev) => [...prev, created])
        usernameGuardado = formUsername
      }
      await setCentrosUsuario(usernameGuardado, centrosSeleccionados)
      await setSociedadesUsuario(usernameGuardado, sociedadesSeleccionadas)
      setShowModal(false)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar usuario')
    } finally {
      setIsSaving(false)
    }
  }, [editingUser, formRut, formNombre, formUsername, formPassword, formEmail, formRol, formSucursal, formEstado, formIdVendedor, centrosSeleccionados, sociedadesSeleccionadas])

  const handleToggleEstado = useCallback((user: IUsuarioAdmin) => {
    if (user.estado === 1) {
      setUserToToggle(user)
      setShowDesactivarConfirm(true)
    } else {
      toggleEstadoUsuario(user.id, 1)
        .then((updated) => setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u))))
        .catch((e: Error) => setError(e.message))
    }
  }, [])

  const handleDesactivarConfirm = useCallback((action: string | undefined) => {
    setShowDesactivarConfirm(false)
    if (action === 'OK' && userToToggle) {
      toggleEstadoUsuario(userToToggle.id, 2)
        .then((updated) => setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u))))
        .catch((e: Error) => setError(e.message))
    }
    setUserToToggle(null)
  }, [userToToggle])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Menú lateral */}
      <nav style={{ width: '200px', borderRight: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)', padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} aria-label="Menú de Administración">
        {MENU_ADMIN.map((item) => (
          <Button key={item.id} icon={item.icon} design={tabActiva === item.id ? 'Emphasized' : 'Default'} onClick={() => setTabActiva(item.id)} style={{ width: '100%', justifyContent: 'flex-start' }}>
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Contenido principal */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
        {error && <MessageStrip design="Negative" style={{ marginBottom: '1rem' }}>{error}</MessageStrip>}

        <BusyIndicator active={isLoading} style={{ width: '100%' }}>

          {/* ============= TAB USUARIOS ============= */}
          {tabActiva === 'usuarios' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <FlexBox justifyContent="SpaceBetween" alignItems="Center">
                <Title level="H3">Gestión de Usuarios</Title>
                <Button icon="add-employee" design="Emphasized" onClick={handleNuevoUsuario}>Nuevo Usuario</Button>
              </FlexBox>
              <Table headerRow={<TableHeaderRow><TableHeaderCell>Usuario</TableHeaderCell><TableHeaderCell>RUT</TableHeaderCell><TableHeaderCell>Nombre Completo</TableHeaderCell><TableHeaderCell>Email</TableHeaderCell><TableHeaderCell>Rol</TableHeaderCell><TableHeaderCell>Oficina Venta</TableHeaderCell><TableHeaderCell>Estado</TableHeaderCell><TableHeaderCell>Acciones</TableHeaderCell></TableHeaderRow>}>
                {usuarios.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.rut}</TableCell>
                    <TableCell>{user.nombreCompleto}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Tag colorScheme={rolDesign(user.rolCod)}>{user.rolNombre}</Tag></TableCell>
                    <TableCell>{user.sucursalNombre}</TableCell>
                    <TableCell><Tag colorScheme={user.estado === 1 ? '8' : '1'}>{user.estado === 1 ? 'Activo' : 'Inactivo'}</Tag></TableCell>
                    <TableCell>
                      <FlexBox style={{ gap: '0.25rem' }}>
                        <Button icon="edit" design="Transparent" tooltip="Editar usuario" onClick={() => handleEditarUsuario(user)} />
                        <Button icon={user.estado === 1 ? 'decline' : 'activate'} design="Transparent" tooltip={user.estado === 1 ? 'Desactivar' : 'Activar'} onClick={() => handleToggleEstado(user)} />
                      </FlexBox>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          )}

          {/* ============= TAB ROLES ============= */}
          {tabActiva === 'roles' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Title level="H3">Roles del Sistema</Title>
              <Table headerRow={<TableHeaderRow><TableHeaderCell>Código</TableHeaderCell><TableHeaderCell>Nombre</TableHeaderCell><TableHeaderCell>Administración</TableHeaderCell><TableHeaderCell>Pedidos</TableHeaderCell><TableHeaderCell>Caja</TableHeaderCell><TableHeaderCell>Descripción</TableHeaderCell></TableHeaderRow>}>
                {roles.map((rol) => (
                  <TableRow key={rol.codigo}>
                    <TableCell>{rol.codigo}</TableCell>
                    <TableCell>{rol.nombre}</TableCell>
                    <TableCell>{rol.accesoAdmin ? '✅' : '❌'}</TableCell>
                    <TableCell>{rol.accesoPedidos ? '✅' : '❌'}</TableCell>
                    <TableCell>{rol.accesoCaja ? '✅' : '❌'}</TableCell>
                    <TableCell>{rol.descripcion}</TableCell>
                  </TableRow>
                ))}
              </Table>
              <MessageStrip design="Information" hideCloseButton>Los roles son fijos del sistema. No se pueden crear ni modificar.</MessageStrip>
            </div>
          )}

          {/* ============= TAB SUCURSALES ============= */}
          {tabActiva === 'sucursales' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Title level="H3">Sucursales</Title>
              <Table headerRow={<TableHeaderRow><TableHeaderCell>Código</TableHeaderCell><TableHeaderCell>Nombre</TableHeaderCell><TableHeaderCell>Sociedad</TableHeaderCell><TableHeaderCell>Oficina de Ventas</TableHeaderCell></TableHeaderRow>}>
                {sucursales.map((suc) => (
                  <TableRow key={suc.codigo}>
                    <TableCell>{suc.codigo}</TableCell>
                    <TableCell>{suc.nombre}</TableCell>
                    <TableCell>{suc.sociedad}</TableCell>
                    <TableCell>{suc.oficinaVentas}</TableCell>
                  </TableRow>
                ))}
              </Table>
              <MessageStrip design="Information" hideCloseButton>Las sucursales se gestionan desde SAP S/4HANA.</MessageStrip>
            </div>
          )}

          {/* ============= TAB INTERFASES ============= */}
          {tabActiva === 'interfases' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Title level="H3">Interfases SAP</Title>

              {/* Filtros */}
              <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }} alignItems="End">
                <div>
                  <Label>Desde</Label>
                  <Input
                    type="Date"
                    value={filtroDesde}
                    onInput={(e) => setFiltroDesde((e.target as unknown as InputDomRef).value)}
                  />
                </div>
                <div>
                  <Label>Hasta</Label>
                  <Input
                    type="Date"
                    value={filtroHasta}
                    onInput={(e) => setFiltroHasta((e.target as unknown as InputDomRef).value)}
                  />
                </div>
                <div>
                  <Label>Tipo de carga</Label>
                  <Select key={filtroTipo === '' ? 'reset' : 'active'} onChange={(e) => setFiltroTipo(e.detail.selectedOption?.getAttribute('data-id') ?? '')}>
                    <Option data-id="">Todos</Option>
                    {Object.entries(TIPOS_INTERFAZ).map(([key, val]) => (
                      <Option key={key} data-id={key}>{val}</Option>
                    ))}
                  </Select>
                </div>
                <Button design="Emphasized" onClick={handleFiltrarInterfases}>Buscar</Button>
                <Button design="Default" onClick={() => { setFiltroDesde(''); setFiltroHasta(''); setFiltroTipo(''); getInterfases().then(setInterfases).catch((e: Error) => setError(e.message)) }}>Limpiar</Button>
              </FlexBox>

              <Table headerRow={
                <TableHeaderRow>
                  <TableHeaderCell style={{ width: '60px' }}>ID</TableHeaderCell>
                  <TableHeaderCell style={{ width: '160px' }}>Tipo</TableHeaderCell>
                  <TableHeaderCell style={{ width: '180px' }}>Fecha Inicio</TableHeaderCell>
                  <TableHeaderCell style={{ width: '180px' }}>Fecha Término</TableHeaderCell>
                  <TableHeaderCell style={{ width: '120px' }}>Cant. Registros</TableHeaderCell>
                  <TableHeaderCell style={{ width: '80px' }}>Estado</TableHeaderCell>
                  <TableHeaderCell>Observación</TableHeaderCell>
                </TableHeaderRow>
              }>
                {interfases.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.id}</TableCell>
                    <TableCell>{i.nombre ?? '—'}</TableCell>
                    <TableCell>{formatFecha(i.fechaInicio)}</TableCell>
                    <TableCell>{formatFecha(i.fechaTermino)}</TableCell>
                    <TableCell>{i.cantActualiza ?? 0}</TableCell>
                    <TableCell>
                      <Tag colorScheme={i.estado === 'Okey' ? '8' : '1'}>{i.estado ?? '—'}</Tag>
                    </TableCell>
                    <TableCell>{i.observacion ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </Table>
              <MessageStrip design="Information" hideCloseButton>
                Solo lectura. Los registros son generados automáticamente por los procesos de sincronización SAP.
              </MessageStrip>
            </div>
          )}

          {/* ============= TAB TABLAS SAP ============= */}
          {tabActiva === 'tablas-sap' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Title level="H3">Tablas Maestras SAP</Title>

              {/* Submenú SAP */}
              <FlexBox style={{ gap: '0.5rem', borderBottom: '1px solid var(--sapGroup_TitleBorderColor)', paddingBottom: '0.5rem' }}>
                {(['bancos', 'centros', 'centros-costo', 'sociedades', 'regiones'] as TabSap[]).map((tab) => (
                  <Button key={tab} design={tabSap === tab ? 'Emphasized' : 'Default'} onClick={() => setTabSap(tab)}>
                    {tab === 'bancos' ? 'Bancos' : tab === 'centros' ? 'Centros' : tab === 'centros-costo' ? 'Centros de Costo' : tab === 'sociedades' ? 'Sociedades' : 'Regiones'}
                  </Button>
                ))}
              </FlexBox>

              {/* Buscador */}
              <FlexBox style={{ gap: '0.5rem' }} alignItems="End">
                <Input
                  placeholder="Buscar..."
                  value={searchSap}
                  onInput={(e) => setSearchSap((e.target as unknown as InputDomRef).value)}
                  style={{ width: '300px' }}
                />
                <Button design="Emphasized" onClick={handleBuscarSap}>Buscar</Button>
                <Button design="Default" onClick={() => {
                  setSearchSap('');
                  if (tabSap === 'bancos') getSapBancos().then(setBancos)
                  else if (tabSap === 'centros') getSapCentros().then(setCentros)
                  else if (tabSap === 'centros-costo') getSapCentrosCosto().then(setCentrosCosto)
                  else if (tabSap === 'sociedades') getSapSociedades().then(setSociedades)
                  else if (tabSap === 'regiones') getSapRegiones().then(setRegiones)
                }}>Limpiar</Button>
              </FlexBox>

              {/* Tabla Bancos */}
              {tabSap === 'bancos' && (
                <Table headerRow={<TableHeaderRow><TableHeaderCell>País</TableHeaderCell><TableHeaderCell>Clave Banco</TableHeaderCell><TableHeaderCell>Nombre</TableHeaderCell><TableHeaderCell>Ciudad</TableHeaderCell><TableHeaderCell>SWIFT</TableHeaderCell></TableHeaderRow>}>
                  {bancos.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.BankCountry}</TableCell>
                      <TableCell>{b.BankKey}</TableCell>
                      <TableCell>{b.BankName}</TableCell>
                      <TableCell>{b.City}</TableCell>
                      <TableCell>{b.SwiftCode || '—'}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}

              {/* Tabla Centros */}
              {tabSap === 'centros' && (
                <Table headerRow={<TableHeaderRow><TableHeaderCell>Código</TableHeaderCell><TableHeaderCell>Nombre</TableHeaderCell><TableHeaderCell>Org. Ventas</TableHeaderCell><TableHeaderCell>Archivado</TableHeaderCell></TableHeaderRow>}>
                  {centros.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.Plant}</TableCell>
                      <TableCell>{c.PlantName}</TableCell>
                      <TableCell>{c.SalesOrganization || '—'}</TableCell>
                      <TableCell><Tag colorScheme={c.IsMarkedForArchiving ? '1' : '8'}>{c.IsMarkedForArchiving ? 'Sí' : 'No'}</Tag></TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}

              {/* Tabla Centros de Costo */}
              {tabSap === 'centros-costo' && (
                <Table headerRow={<TableHeaderRow><TableHeaderCell>Área Control</TableHeaderCell><TableHeaderCell>Centro Costo</TableHeaderCell><TableHeaderCell>Empresa</TableHeaderCell><TableHeaderCell>Depto.</TableHeaderCell><TableHeaderCell>Bloqueado</TableHeaderCell></TableHeaderRow>}>
                  {centrosCosto.length === 0
                    ? <TableRow><TableCell>Sin datos disponibles</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell></TableRow>
                    : centrosCosto.map((cc) => (
                      <TableRow key={cc.id}>
                        <TableCell>{cc.ControllingArea}</TableCell>
                        <TableCell>{cc.CostCenter}</TableCell>
                        <TableCell>{cc.CompanyCode}</TableCell>
                        <TableCell>{cc.Department || '—'}</TableCell>
                        <TableCell><Tag colorScheme={cc.IsBlocked ? '1' : '8'}>{cc.IsBlocked ? 'Sí' : 'No'}</Tag></TableCell>
                      </TableRow>
                    ))
                  }
                </Table>
              )}

              {/* Tabla Sociedades */}
              {tabSap === 'sociedades' && (
                <Table headerRow={<TableHeaderRow><TableHeaderCell>Código</TableHeaderCell><TableHeaderCell>Nombre</TableHeaderCell><TableHeaderCell>Ciudad</TableHeaderCell><TableHeaderCell>País</TableHeaderCell><TableHeaderCell>Moneda</TableHeaderCell></TableHeaderRow>}>
                  {sociedades.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.CompanyCode}</TableCell>
                      <TableCell>{s.CompanyCodeName}</TableCell>
                      <TableCell>{s.CityName}</TableCell>
                      <TableCell>{s.Country}</TableCell>
                      <TableCell>{s.Currency}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}

              {/* Tabla Regiones */}
              {tabSap === 'regiones' && (
                <Table headerRow={<TableHeaderRow><TableHeaderCell>Código</TableHeaderCell><TableHeaderCell>Descripción</TableHeaderCell></TableHeaderRow>}>
                  {regiones.length === 0
                    ? <TableRow><TableCell>Sin datos disponibles</TableCell><TableCell>—</TableCell></TableRow>
                    : regiones.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.Codigo}</TableCell>
                        <TableCell>{r.Descripcion}</TableCell>
                      </TableRow>
                    ))
                  }
                </Table>
              )}

              <MessageStrip design="Information" hideCloseButton>
                Solo lectura. Datos sincronizados desde SAP S/4HANA.
              </MessageStrip>
            </div>
          )}

          {tabActiva === 'maestros-pos' && <PosMaestrosPanel />}

        </BusyIndicator>

        {/* Modal crear/editar usuario */}
        <Dialog open={showModal} headerText={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'} onClose={() => setShowModal(false)} style={{ width: '600px' }}
          footer={
            <FlexBox justifyContent="End" style={{ padding: '0.5rem', gap: '0.5rem', width: '100%' }}>
              <Button design="Transparent" onClick={() => setShowModal(false)} disabled={isSaving}>Cancelar</Button>
              <Button design="Emphasized" onClick={handleGuardar} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button>
            </FlexBox>
          }
        >
          <Form style={{ padding: '1rem' }}>
            {formError && <FormItem><MessageStrip design="Negative">{formError}</MessageStrip></FormItem>}
            <FormItem><Label>RUT</Label><Input value={formRut} onInput={(e) => setFormRut((e.target as unknown as InputDomRef).value)} placeholder="12.345.678-9" /></FormItem>
            <FormItem><Label>Nombre Completo *</Label><Input value={formNombre} onInput={(e) => setFormNombre((e.target as unknown as InputDomRef).value)} placeholder="Nombre y apellido" /></FormItem>
            <FormItem><Label>Usuario SAP (login) *</Label><Input value={formUsername} onInput={(e) => setFormUsername((e.target as unknown as InputDomRef).value)} placeholder="nombre de usuario" disabled={!!editingUser} /></FormItem>
            {!editingUser && <FormItem><Label>Contraseña *</Label><Input type="Password" value={formPassword} onInput={(e) => setFormPassword((e.target as unknown as InputDomRef).value)} placeholder="contraseña" /></FormItem>}
            <FormItem><Label>Email</Label><Input value={formEmail} onInput={(e) => setFormEmail((e.target as unknown as InputDomRef).value)} placeholder="email@cooprinsem.cl" /></FormItem>
            <FormItem>
              <Label>Rol</Label>
              <Select onChange={(e) => { const val = Number(e.detail.selectedOption?.getAttribute('data-id')); if (val >= 1 && val <= 4) setFormRol(val as 1 | 2 | 3 | 4) }}>
                <Option data-id="1" selected={formRol === 1}>Administrador</Option>
                <Option data-id="2" selected={formRol === 2}>Ventas</Option>
                <Option data-id="3" selected={formRol === 3}>Caja</Option>
                <Option data-id="4" selected={formRol === 4}>Consultas</Option>
              </Select>
            </FormItem>
            <FormItem>
              <Label>Oficina Venta</Label>
              <Select onChange={(e) => { const val = e.detail.selectedOption?.getAttribute('data-id'); if (val) setFormSucursal(val) }}>
                <Option data-id="D190" selected={formSucursal === 'D190'}>D190 — Osorno</Option>
                <Option data-id="D052" selected={formSucursal === 'D052'}>D052 — Puerto Montt</Option>
                <Option data-id="D014" selected={formSucursal === 'D014'}>D014 — Temuco</Option>
              </Select>
            </FormItem>
            <FormItem>
              <Label>Estado</Label>
              <Select onChange={(e) => { const val = Number(e.detail.selectedOption?.getAttribute('data-id')); if (val === 1 || val === 2) setFormEstado(val) }}>
                <Option data-id="1" selected={formEstado === 1}>Activo</Option>
                <Option data-id="2" selected={formEstado === 2}>Inactivo</Option>
              </Select>
            </FormItem>
            <FormItem>
              <Label>Centro Suministro</Label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--sapField_BorderColor)', borderRadius: '4px', padding: '0.5rem', width: '100%' }}>
                {todosCentros.length === 0 ? (
                  <span style={{ color: 'var(--sapNeutralColor)', fontSize: '0.875rem' }}>Cargando centros...</span>
                ) : (
                  todosCentros.map((centro) => (
                    <div key={centro.Plant} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                      <input
                        type="checkbox"
                        id={`centro-${centro.Plant}`}
                        checked={centrosSeleccionados.includes(centro.Plant)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCentrosSeleccionados((prev) => [...prev, centro.Plant])
                          } else {
                            setCentrosSeleccionados((prev) => prev.filter((p) => p !== centro.Plant))
                          }
                        }}
                      />
                      <label htmlFor={`centro-${centro.Plant}`} style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                        {centro.Plant} — {centro.PlantName}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </FormItem>
            <FormItem>
              <Label>Sociedades</Label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--sapField_BorderColor)', borderRadius: '4px', padding: '0.5rem', width: '100%' }}>
                {todasSociedades.length === 0 ? (
                  <span style={{ color: 'var(--sapNeutralColor)', fontSize: '0.875rem' }}>Cargando sociedades...</span>
                ) : (
                  todasSociedades.map((soc) => (
                    <div key={soc.CompanyCode} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                      <input
                        type="checkbox"
                        id={`soc-${soc.CompanyCode}`}
                        checked={sociedadesSeleccionadas.includes(soc.CompanyCode)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSociedadesSeleccionadas((prev) => [...prev, soc.CompanyCode])
                          } else {
                            setSociedadesSeleccionadas((prev) => prev.filter((c) => c !== soc.CompanyCode))
                          }
                        }}
                      />
                      <label htmlFor={`soc-${soc.CompanyCode}`} style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                        {soc.CompanyCode} — {soc.CompanyCodeName}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </FormItem>
            <FormItem><Label>Id Vendedor</Label><Input value={formIdVendedor} onInput={(e) => setFormIdVendedor((e.target as unknown as InputDomRef).value)} placeholder="Numérico, 3 a 15 dígitos" /></FormItem>
            {editingUser && <FormItem><Label style={{ fontStyle: 'italic', color: 'var(--sapNeutralColor)' }}>El usuario y contraseña no se pueden modificar desde aquí.</Label></FormItem>}
          </Form>
        </Dialog>

        {showDesactivarConfirm && userToToggle && (
          <MessageBox type="Confirm" open onClose={handleDesactivarConfirm}>
            ¿Desactivar al usuario {userToToggle.nombreCompleto}? No podrá iniciar sesión.
          </MessageBox>
        )}
      </main>
    </div>
  )
}