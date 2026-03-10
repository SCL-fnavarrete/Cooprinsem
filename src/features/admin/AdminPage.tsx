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
import type { IUsuarioAdmin, ICreateUsuarioRequest, IUpdateUsuarioRequest, IRol, ISucursal } from '@/types/admin'
import { getUsuarios, createUsuario, updateUsuario, toggleEstadoUsuario, getRoles, getSucursales } from '@/services/api/admin'

type TabActiva = 'usuarios' | 'roles' | 'sucursales'

const MENU_ADMIN = [
  { id: 'usuarios' as TabActiva, label: 'Usuarios', icon: 'employee' },
  { id: 'roles' as TabActiva, label: 'Roles', icon: 'role' },
  { id: 'sucursales' as TabActiva, label: 'Sucursales', icon: 'building' },
] as const

// Colores de tag por rol
function rolDesign(rolCod: number): 'Set1' | 'Set2' | 'Set3' {
  switch (rolCod) {
    case 1: return 'Set1' // azul — Administrador
    case 2: return 'Set2' // verde — Ventas
    case 3: return 'Set3' // naranja — Caja
    default: return 'Set1' // gris — Consultas
  }
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
  const [formNombre, setFormNombre] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRol, setFormRol] = useState<1 | 2 | 3 | 4>(1)
  const [formSucursal, setFormSucursal] = useState('D190')
  const [formEstado, setFormEstado] = useState<1 | 2>(1)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Confirmación desactivar
  const [showDesactivarConfirm, setShowDesactivarConfirm] = useState(false)
  const [userToToggle, setUserToToggle] = useState<IUsuarioAdmin | null>(null)

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
    } else {
      getSucursales()
        .then(setSucursales)
        .catch((e: Error) => setError(e.message))
        .finally(() => setIsLoading(false))
    }
  }, [tabActiva])

  // Abrir modal para nuevo usuario
  const handleNuevoUsuario = useCallback(() => {
    setEditingUser(null)
    setFormNombre('')
    setFormUsername('')
    setFormPassword('')
    setFormEmail('')
    setFormRol(1)
    setFormSucursal('D190')
    setFormEstado(1)
    setFormError(null)
    setShowModal(true)
  }, [])

  // Abrir modal para editar usuario
  const handleEditarUsuario = useCallback((user: IUsuarioAdmin) => {
    setEditingUser(user)
    setFormNombre(user.nombreCompleto)
    setFormUsername(user.username)
    setFormPassword('')
    setFormEmail(user.email)
    setFormRol(user.rolCod)
    setFormSucursal(user.sucursalId)
    setFormEstado(user.estado)
    setFormError(null)
    setShowModal(true)
  }, [])

  // Guardar usuario (crear o editar)
  const handleGuardar = useCallback(async () => {
    // Validar campos obligatorios
    if (!formNombre.trim()) {
      setFormError('El nombre completo es obligatorio')
      return
    }

    if (!editingUser && !formUsername.trim()) {
      setFormError('El usuario (login) es obligatorio')
      return
    }

    if (!editingUser && !formPassword.trim()) {
      setFormError('La contraseña es obligatoria')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      if (editingUser) {
        // Actualizar usuario existente
        const data: IUpdateUsuarioRequest = {
          nombreCompleto: formNombre,
          email: formEmail,
          rolCod: formRol as 1 | 2 | 3 | 4,
          sucursalId: formSucursal,
          estado: formEstado,
        }
        const updated = await updateUsuario(editingUser.id, data)
        setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      } else {
        // Crear nuevo usuario
        const data: ICreateUsuarioRequest = {
          username: formUsername,
          password: formPassword,
          nombreCompleto: formNombre,
          email: formEmail,
          rolCod: formRol as 1 | 2 | 3 | 4,
          sucursalId: formSucursal,
          estado: formEstado,
        }
        const created = await createUsuario(data)
        setUsuarios((prev) => [...prev, created])
      }
      setShowModal(false)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar usuario')
    } finally {
      setIsSaving(false)
    }
  }, [editingUser, formNombre, formUsername, formPassword, formEmail, formRol, formSucursal, formEstado])

  // Activar/desactivar usuario
  const handleToggleEstado = useCallback((user: IUsuarioAdmin) => {
    if (user.estado === 1) {
      // Desactivar requiere confirmación
      setUserToToggle(user)
      setShowDesactivarConfirm(true)
    } else {
      // Activar directamente
      toggleEstadoUsuario(user.id, 1)
        .then((updated) => {
          setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
        })
        .catch((e: Error) => setError(e.message))
    }
  }, [])

  // Confirmar desactivación — ADR-010: onClose(action: string | undefined)
  const handleDesactivarConfirm = useCallback((action: string | undefined) => {
    setShowDesactivarConfirm(false)
    if (action === 'OK' && userToToggle) {
      toggleEstadoUsuario(userToToggle.id, 2)
        .then((updated) => {
          setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
        })
        .catch((e: Error) => setError(e.message))
    }
    setUserToToggle(null)
  }, [userToToggle])

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
        aria-label="Menú de Administración"
      >
        {MENU_ADMIN.map((item) => (
          <Button
            key={item.id}
            icon={item.icon}
            design={tabActiva === item.id ? 'Emphasized' : 'Default'}
            onClick={() => setTabActiva(item.id)}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Contenido principal */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
        {error && (
          <MessageStrip design="Negative" style={{ marginBottom: '1rem' }}>
            {error}
          </MessageStrip>
        )}

        <BusyIndicator active={isLoading} style={{ width: '100%' }}>
          {/* ============= TAB USUARIOS ============= */}
          {tabActiva === 'usuarios' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <FlexBox justifyContent="SpaceBetween" alignItems="Center">
                <Title level="H3">Gestión de Usuarios</Title>
                <Button icon="add-employee" design="Emphasized" onClick={handleNuevoUsuario}>
                  Nuevo Usuario
                </Button>
              </FlexBox>

              <Table headerRow={
                <TableHeaderRow>
                  <TableHeaderCell>Usuario</TableHeaderCell>
                  <TableHeaderCell>Nombre Completo</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Rol</TableHeaderCell>
                  <TableHeaderCell>Sucursal</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Acciones</TableHeaderCell>
                </TableHeaderRow>
              }>
                {usuarios.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.nombreCompleto}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Tag colorScheme={rolDesign(user.rolCod)}>{user.rolNombre}</Tag>
                    </TableCell>
                    <TableCell>{user.sucursalNombre}</TableCell>
                    <TableCell>
                      <Tag colorScheme={user.estado === 1 ? '8' : '1'}>
                        {user.estado === 1 ? 'Activo' : 'Inactivo'}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <FlexBox style={{ gap: '0.25rem' }}>
                        <Button
                          icon="edit"
                          design="Transparent"
                          tooltip="Editar usuario"
                          onClick={() => handleEditarUsuario(user)}
                        />
                        <Button
                          icon={user.estado === 1 ? 'decline' : 'activate'}
                          design="Transparent"
                          tooltip={user.estado === 1 ? 'Desactivar' : 'Activar'}
                          onClick={() => handleToggleEstado(user)}
                        />
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

              <Table headerRow={
                <TableHeaderRow>
                  <TableHeaderCell>Código</TableHeaderCell>
                  <TableHeaderCell>Nombre</TableHeaderCell>
                  <TableHeaderCell>Administración</TableHeaderCell>
                  <TableHeaderCell>Pedidos</TableHeaderCell>
                  <TableHeaderCell>Caja</TableHeaderCell>
                  <TableHeaderCell>Descripción</TableHeaderCell>
                </TableHeaderRow>
              }>
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

              <MessageStrip design="Information" hideCloseButton>
                Los roles son fijos del sistema. No se pueden crear ni modificar.
              </MessageStrip>
            </div>
          )}

          {/* ============= TAB SUCURSALES ============= */}
          {tabActiva === 'sucursales' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <Title level="H3">Sucursales</Title>

              <Table headerRow={
                <TableHeaderRow>
                  <TableHeaderCell>Código</TableHeaderCell>
                  <TableHeaderCell>Nombre</TableHeaderCell>
                  <TableHeaderCell>Sociedad</TableHeaderCell>
                  <TableHeaderCell>Oficina de Ventas</TableHeaderCell>
                </TableHeaderRow>
              }>
                {sucursales.map((suc) => (
                  <TableRow key={suc.codigo}>
                    <TableCell>{suc.codigo}</TableCell>
                    <TableCell>{suc.nombre}</TableCell>
                    <TableCell>{suc.sociedad}</TableCell>
                    <TableCell>{suc.oficinaVentas}</TableCell>
                  </TableRow>
                ))}
              </Table>

              <MessageStrip design="Information" hideCloseButton>
                Las sucursales se gestionan desde SAP S/4HANA.
              </MessageStrip>
            </div>
          )}
        </BusyIndicator>

        {/* Modal crear/editar usuario */}
        <Dialog
          open={showModal}
          headerText={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          onClose={() => setShowModal(false)}
          footer={
            <FlexBox justifyContent="End" style={{ padding: '0.5rem', gap: '0.5rem', width: '100%' }}>
              <Button design="Transparent" onClick={() => setShowModal(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button design="Emphasized" onClick={handleGuardar} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </FlexBox>
          }
        >
          <Form style={{ padding: '1rem' }}>
            {formError && (
              <FormItem>
                <MessageStrip design="Negative">{formError}</MessageStrip>
              </FormItem>
            )}

            <FormItem>
              <Label>Nombre Completo *</Label>
              <Input
                value={formNombre}
                onInput={(e) => setFormNombre((e.target as unknown as InputDomRef).value)}
                placeholder="Nombre y apellido"
              />
            </FormItem>

            <FormItem>
              <Label>Usuario (login) *</Label>
              <Input
                value={formUsername}
                onInput={(e) => setFormUsername((e.target as unknown as InputDomRef).value)}
                placeholder="nombre de usuario"
                disabled={!!editingUser}
              />
            </FormItem>

            {!editingUser && (
              <FormItem>
                <Label>Contraseña *</Label>
                <Input
                  type="Password"
                  value={formPassword}
                  onInput={(e) => setFormPassword((e.target as unknown as InputDomRef).value)}
                  placeholder="contraseña"
                />
              </FormItem>
            )}

            <FormItem>
              <Label>Email</Label>
              <Input
                value={formEmail}
                onInput={(e) => setFormEmail((e.target as unknown as InputDomRef).value)}
                placeholder="email@cooprinsem.cl"
              />
            </FormItem>

            <FormItem>
              <Label>Rol</Label>
              <Select
                onChange={(e) => {
                  const val = Number(e.detail.selectedOption?.getAttribute('data-id'))
                  if (val >= 1 && val <= 4) setFormRol(val as 1 | 2 | 3 | 4)
                }}
              >
                <Option data-id="1" selected={formRol === 1}>Administrador</Option>
                <Option data-id="2" selected={formRol === 2}>Ventas</Option>
                <Option data-id="3" selected={formRol === 3}>Caja</Option>
                <Option data-id="4" selected={formRol === 4}>Consultas</Option>
              </Select>
            </FormItem>

            <FormItem>
              <Label>Sucursal</Label>
              <Select
                onChange={(e) => {
                  const val = e.detail.selectedOption?.getAttribute('data-id')
                  if (val) setFormSucursal(val)
                }}
              >
                <Option data-id="D190" selected={formSucursal === 'D190'}>D190 — Osorno</Option>
                <Option data-id="D052" selected={formSucursal === 'D052'}>D052 — Puerto Montt</Option>
                <Option data-id="D014" selected={formSucursal === 'D014'}>D014 — Temuco</Option>
              </Select>
            </FormItem>

            <FormItem>
              <Label>Estado</Label>
              <Select
                onChange={(e) => {
                  const val = Number(e.detail.selectedOption?.getAttribute('data-id'))
                  if (val === 1 || val === 2) setFormEstado(val)
                }}
              >
                <Option data-id="1" selected={formEstado === 1}>Activo</Option>
                <Option data-id="2" selected={formEstado === 2}>Inactivo</Option>
              </Select>
            </FormItem>

            {editingUser && (
              <FormItem>
                <Label style={{ fontStyle: 'italic', color: 'var(--sapNeutralColor)' }}>
                  El usuario y contraseña no se pueden modificar desde aquí.
                </Label>
              </FormItem>
            )}
          </Form>
        </Dialog>

        {/* Confirmación desactivar usuario — ADR-010 */}
        {showDesactivarConfirm && userToToggle && (
          <MessageBox
            type="Confirm"
            open
            onClose={handleDesactivarConfirm}
          >
            ¿Desactivar al usuario {userToToggle.nombreCompleto}? No podrá iniciar sesión.
          </MessageBox>
        )}
      </main>
    </div>
  )
}
