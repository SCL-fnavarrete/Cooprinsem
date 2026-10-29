import { useState, useEffect, useCallback } from 'react'
import {
  Title,
  Button,
  Input,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Dialog,
  Label,
  Select,
  Option,
  MessageStrip,
  BusyIndicator,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/add.js'
import '@ui5/webcomponents-icons/dist/edit.js'
import '@ui5/webcomponents-icons/dist/delete.js'
import '@ui5/webcomponents-icons/dist/save.js'
import '@ui5/webcomponents-icons/dist/refresh.js'
import type { InputDomRef } from '@ui5/webcomponents-react'
import {
  getDocumentosVenta, createDocumentoVenta, updateDocumentoVenta, deleteDocumentoVenta,
  getOficinasVenta, createOficinaVenta, updateOficinaVenta, deleteOficinaVenta,
  getCentrosSuministrador, createCentroSuministrador, updateCentroSuministrador, deleteCentroSuministrador,
  getCanalesDistribucion, createCanalDistribucion, updateCanalDistribucion, deleteCanalDistribucion,
  getGruposCuenta, createGrupoCuenta, updateGrupoCuenta, deleteGrupoCuenta,
  getClasesInterlocutor, createClaseInterlocutor, updateClaseInterlocutor, deleteClaseInterlocutor,
  getCondicionesExpedicion, createCondicionExpedicion, updateCondicionExpedicion, deleteCondicionExpedicion,
  getCondicionesPago, createCondicionPago, updateCondicionPago, deleteCondicionPago,
  getTiposDocumento, createTipoDocumento, updateTipoDocumento, deleteTipoDocumento,
  getUnidadesMedida, createUnidadMedida, updateUnidadMedida, deleteUnidadMedida,
  getParametros, updateParametro, createParametro,
  type IDocumentoVenta, type IOficinaVenta, type ICentroSuministrador, type ICanalDistribucion,
  type IParametroGeneral, type ITipoDocumento, type IUnidadMedida,
} from '@/services/api/posMaestros'
import { useUser } from '@/stores/userContext'
import { ExportarTabla } from '@/components/common/ExportarTabla'
import type { ColumnaExport } from '@/utils/exportarTabla'
import { ROLES } from '@/config/sap'
import { useSoloLectura, TEXTO_SOLO_LECTURA } from '@/hooks/useSoloLectura'

type SubTab = 'documentos' | 'oficinas' | 'centros' | 'canales' | 'grupos-cuenta' | 'clases-interlocutor' | 'condiciones-expedicion' | 'condiciones-pago' | 'tipos-documento' | 'unidades-medida' | 'parametros'

export function PosMaestrosPanel() {
  const [subTab, setSubTab] = useState<SubTab>('documentos')

  return (
    <div>
      <Title level="H3" style={{ marginBottom: '1rem' }}>Maestros POS</Title>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        <Button design={subTab === 'documentos' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('documentos')}>Documentos de Venta</Button>
        <Button design={subTab === 'oficinas' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('oficinas')}>Oficinas de Ventas</Button>
        <Button design={subTab === 'centros' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('centros')}>Centros Suministrador</Button>
        <Button design={subTab === 'canales' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('canales')}>Canal Distribución</Button>
        <Button design={subTab === 'grupos-cuenta' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('grupos-cuenta')}>Grupo Cuenta</Button>
        <Button design={subTab === 'clases-interlocutor' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('clases-interlocutor')}>Clase Interlocutor</Button>
        <Button design={subTab === 'condiciones-expedicion' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('condiciones-expedicion')}>Cond. Expedición</Button>
        <Button design={subTab === 'condiciones-pago' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('condiciones-pago')}>Cond. Pago</Button>
        <Button design={subTab === 'tipos-documento' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('tipos-documento')}>Tipo Documento</Button>
        <Button design={subTab === 'unidades-medida' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('unidades-medida')}>Unidad Medida</Button>
        <Button design={subTab === 'parametros' ? 'Emphasized' : 'Default'} onClick={() => setSubTab('parametros')}>Parámetros</Button>
      </div>
      {subTab === 'documentos' && <DocumentosVentaTab />}
      {subTab === 'oficinas' && <OficinasVentaTab />}
      {subTab === 'centros' && <CentrosSuministradorTab />}
      {subTab === 'canales' && <CanalesDistribucionTab />}
      {subTab === 'grupos-cuenta' && <GruposCuentaTab />}
      {subTab === 'clases-interlocutor' && <ClasesInterlocutorTab />}
      {subTab === 'condiciones-expedicion' && <CondicionesExpedicionTab />}
      {subTab === 'condiciones-pago' && <CondicionesPagoTab />}
      {subTab === 'tipos-documento' && <TiposDocumentoTab />}
      {subTab === 'unidades-medida' && <UnidadesMedidaTab />}
      {subTab === 'parametros' && <ParametrosTab />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS DE VENTA
// ═══════════════════════════════════════════════════════════════════════════════

// Columnas de "Exportar tabla" (las de cada grilla, sin Acciones)
const COLUMNAS_EXPORT_DOCUMENTOS_VENTA: ColumnaExport<IDocumentoVenta>[] = [
  { titulo: 'Clase Doc', valor: (d) => d.clase_documento },
  { titulo: 'Descripción', valor: (d) => d.descripcion },
  { titulo: 'Tipo', valor: (d) => d.tipo_documento },
  { titulo: 'Categoría', valor: (d) => d.tipo_documento_desc },
  { titulo: 'API Relacionada', valor: (d) => d.api_relacionada },
  { titulo: 'Org. Ventas', valor: (d) => d.org_ventas },
  { titulo: 'Canal', valor: (d) => d.canal_distribucion },
  { titulo: 'Sector', valor: (d) => d.sector },
]

type FilaCodigoNombre = { id: number; codigo: string; nombre: string; org_ventas: string; canal_distribucion: string; sector: string }
const COLUMNAS_EXPORT_CODIGO_NOMBRE: ColumnaExport<FilaCodigoNombre>[] = [
  { titulo: 'Código', valor: (d) => d.codigo },
  { titulo: 'Nombre', valor: (d) => d.nombre },
  { titulo: 'Org. Ventas', valor: (d) => d.org_ventas },
  { titulo: 'Canal', valor: (d) => d.canal_distribucion },
  { titulo: 'Sector', valor: (d) => d.sector },
]

const COLUMNAS_EXPORT_PARAMETROS: ColumnaExport<IParametroGeneral>[] = [
  { titulo: 'Clave', valor: (p) => p.clave },
  { titulo: 'Valor', valor: (p) => p.valor },
  { titulo: 'Descripción', valor: (p) => p.descripcion },
]

const COLUMNAS_EXPORT_TIPOS_DOCUMENTO: ColumnaExport<ITipoDocumento>[] = [
  { titulo: 'Código', valor: (d) => d.blart },
  { titulo: 'Descripción', valor: (d) => d.ltext },
]

const COLUMNAS_EXPORT_UNIDADES_MEDIDA: ColumnaExport<IUnidadMedida>[] = [
  { titulo: 'Código SAP', valor: (u) => u.msehi },
  { titulo: 'Código comercial', valor: (u) => u.mseh3 },
  { titulo: 'Código técnico', valor: (u) => u.mseh6 ?? '' },
  { titulo: 'Texto corto', valor: (u) => u.texto_corto ?? '' },
  { titulo: 'Texto largo', valor: (u) => u.texto_largo ?? '' },
]

function DocumentosVentaTab() {
  const soloLectura = useSoloLectura()
  const [datos, setDatos] = useState<IDocumentoVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<IDocumentoVenta | null>(null)

  // Form fields
  const [fClase, setFClase] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fTipo, setFTipo] = useState('C')
  const [fTipoDesc, setFTipoDesc] = useState('Pedido')
  const [fApi, setFApi] = useState('API_SALES_ORDER_SRV')
  const [formError, setFormError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      setDatos(await getDocumentosVenta())
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleNuevo = () => {
    setEditando(null); setFClase(''); setFDesc(''); setFTipo('C'); setFTipoDesc('Pedido'); setFApi('API_SALES_ORDER_SRV'); setFormError(null)
    setShowModal(true)
  }

  const handleEditar = (item: IDocumentoVenta) => {
    setEditando(item); setFClase(item.clase_documento); setFDesc(item.descripcion); setFTipo(item.tipo_documento); setFTipoDesc(item.tipo_documento_desc); setFApi(item.api_relacionada); setFormError(null)
    setShowModal(true)
  }

  const handleEliminar = async (item: IDocumentoVenta) => {
    if (!confirm(`¿Eliminar ${item.clase_documento} - ${item.descripcion}?`)) return
    try {
      await deleteDocumentoVenta(item.id)
      cargar()
    } catch (e: any) { setError(e.message) }
  }

  const handleGuardar = async () => {
    if (!fClase.trim() || !fDesc.trim()) { setFormError('Clase y descripción son obligatorios'); return }
    try {
      const data = { clase_documento: fClase.trim(), descripcion: fDesc.trim(), tipo_documento: fTipo, tipo_documento_desc: fTipoDesc, api_relacionada: fApi }
      if (editando) {
        await updateDocumentoVenta(editando.id, data)
      } else {
        await createDocumentoVenta(data)
      }
      setShowModal(false)
      cargar()
    } catch (e: any) { setFormError(e.message) }
  }

  if (loading) return <BusyIndicator active size="M" />

  return (
    <div>
      {error && <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '1rem' }}>{error}</MessageStrip>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <ExportarTabla filas={datos} columnas={COLUMNAS_EXPORT_DOCUMENTOS_VENTA} nombreArchivo="Maestros POS documentos de venta" nombreHoja="Documentos de Venta" data-testid="exportar-documentos-venta" />
        <Button icon="add" design="Emphasized" onClick={handleNuevo} disabled={soloLectura} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : undefined}>Nuevo Documento</Button>
      </div>
      <Table headerRow={<TableHeaderRow><TableHeaderCell>Clase Doc</TableHeaderCell><TableHeaderCell>Descripción</TableHeaderCell><TableHeaderCell>Tipo</TableHeaderCell><TableHeaderCell>Categoría</TableHeaderCell><TableHeaderCell>API Relacionada</TableHeaderCell><TableHeaderCell>Org. Ventas</TableHeaderCell><TableHeaderCell>Canal</TableHeaderCell><TableHeaderCell>Sector</TableHeaderCell><TableHeaderCell>Acciones</TableHeaderCell></TableHeaderRow>}>
        {datos.map((d) => (
          <TableRow key={d.id}>
            <TableCell>{d.clase_documento}</TableCell>
            <TableCell>{d.descripcion}</TableCell>
            <TableCell>{d.tipo_documento}</TableCell>
            <TableCell>{d.tipo_documento_desc}</TableCell>
            <TableCell style={{ fontSize: '0.75rem' }}>{d.api_relacionada}</TableCell>
            <TableCell>{d.org_ventas}</TableCell>
            <TableCell>{d.canal_distribucion}</TableCell>
            <TableCell>{d.sector}</TableCell>
            <TableCell>
              <Button icon="edit" design="Transparent" onClick={() => handleEditar(d)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Editar"} disabled={soloLectura} />
              <Button icon="delete" design="Transparent" onClick={() => handleEliminar(d)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Eliminar"} disabled={soloLectura} />
            </TableCell>
          </TableRow>
        ))}
      </Table>

      <Dialog open={showModal} headerText={editando ? 'Editar Documento' : 'Nuevo Documento'} onClose={() => setShowModal(false)} style={{ width: '500px' }}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.5rem' }}><Button design="Transparent" onClick={() => setShowModal(false)}>Cancelar</Button><Button design="Emphasized" onClick={handleGuardar}>Guardar</Button></div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
          {formError && <MessageStrip design="Negative" hideCloseButton>{formError}</MessageStrip>}
          <div><Label>Clase Documento *</Label><Input value={fClase} onInput={(e) => setFClase((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="ZV01" /></div>
          <div><Label>Descripción *</Label><Input value={fDesc} onInput={(e) => setFDesc((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Venta normal" /></div>
          <div><Label>Tipo Documento</Label>
            <Select value={fTipo} onChange={(e) => {
              const val = (e.detail?.selectedOption as HTMLElement)?.dataset?.id ?? 'C'
              setFTipo(val)
              const map: Record<string, string> = { B: 'Oferta', C: 'Pedido', H: 'Devolución', K: 'Abonos', L: 'Nota de cargo' }
              setFTipoDesc(map[val] ?? val)
              const apiMap: Record<string, string> = { B: 'API_SALES_QUOTATION_SRV', C: 'API_SALES_ORDER_SRV', H: 'API_CREDIT_MEMO_REQUEST_SRV', K: 'API_CREDIT_MEMO_REQUEST_SRV', L: 'API_DEBIT_MEMO_REQUEST_SRV' }
              setFApi(apiMap[val] ?? '')
            }} style={{ width: '100%' }}>
              <Option data-id="B" selected={fTipo === 'B'}>B — Oferta</Option>
              <Option data-id="C" selected={fTipo === 'C'}>C — Pedido</Option>
              <Option data-id="H" selected={fTipo === 'H'}>H — Devolución</Option>
              <Option data-id="K" selected={fTipo === 'K'}>K — Abonos</Option>
              <Option data-id="L" selected={fTipo === 'L'}>L — Nota de cargo</Option>
            </Select>
          </div>
          <div><Label>API Relacionada</Label><Input value={fApi} onInput={(e) => setFApi((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} /></div>
        </div>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFICINAS DE VENTAS (reutilizable con Centros)
// ═══════════════════════════════════════════════════════════════════════════════

function TablaCodigoNombre({
  titulo,
  getData,
  createData,
  updateData,
  deleteData,
}: {
  titulo: string
  getData: () => Promise<{ id: number; codigo: string; nombre: string; org_ventas: string; canal_distribucion: string; sector: string }[]>
  createData: (data: any) => Promise<any>
  updateData: (id: number, data: any) => Promise<any>
  deleteData: (id: number) => Promise<void>
}) {
  const soloLectura = useSoloLectura()
  const [datos, setDatos] = useState<{ id: number; codigo: string; nombre: string; org_ventas: string; canal_distribucion: string; sector: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)
  const [fCodigo, setFCodigo] = useState('')
  const [fNombre, setFNombre] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { setDatos(await getData()); setError(null) } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [getData])

  useEffect(() => { cargar() }, [cargar])

  const handleNuevo = () => { setEditando(null); setFCodigo(''); setFNombre(''); setFormError(null); setShowModal(true) }
  const handleEditar = (item: any) => { setEditando(item); setFCodigo(item.codigo); setFNombre(item.nombre); setFormError(null); setShowModal(true) }
  const handleEliminar = async (item: any) => {
    if (!confirm(`¿Eliminar ${item.codigo} - ${item.nombre}?`)) return
    try { await deleteData(item.id); cargar() } catch (e: any) { setError(e.message) }
  }

  const handleGuardar = async () => {
    if (!fCodigo.trim() || !fNombre.trim()) { setFormError('Código y nombre son obligatorios'); return }
    try {
      const data = { codigo: fCodigo.trim(), nombre: fNombre.trim() }
      if (editando) { await updateData(editando.id, data) } else { await createData(data) }
      setShowModal(false); cargar()
    } catch (e: any) { setFormError(e.message) }
  }

  if (loading) return <BusyIndicator active size="M" />

  return (
    <div>
      {error && <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '1rem' }}>{error}</MessageStrip>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <ExportarTabla filas={datos} columnas={COLUMNAS_EXPORT_CODIGO_NOMBRE} nombreArchivo={`Maestros POS ${titulo}`} nombreHoja={titulo} data-testid="exportar-maestro" />
        <Button icon="add" design="Emphasized" onClick={handleNuevo} disabled={soloLectura} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : undefined}>Nuevo</Button>
      </div>
      <Table headerRow={<TableHeaderRow><TableHeaderCell>Código</TableHeaderCell><TableHeaderCell>Nombre</TableHeaderCell><TableHeaderCell>Org. Ventas</TableHeaderCell><TableHeaderCell>Canal</TableHeaderCell><TableHeaderCell>Sector</TableHeaderCell><TableHeaderCell>Acciones</TableHeaderCell></TableHeaderRow>}>
        {datos.map((d) => (
          <TableRow key={d.id}>
            <TableCell>{d.codigo}</TableCell>
            <TableCell>{d.nombre}</TableCell>
            <TableCell>{d.org_ventas}</TableCell>
            <TableCell>{d.canal_distribucion}</TableCell>
            <TableCell>{d.sector}</TableCell>
            <TableCell>
              <Button icon="edit" design="Transparent" onClick={() => handleEditar(d)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Editar"} disabled={soloLectura} />
              <Button icon="delete" design="Transparent" onClick={() => handleEliminar(d)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Eliminar"} disabled={soloLectura} />
            </TableCell>
          </TableRow>
        ))}
      </Table>

      <Dialog open={showModal} headerText={editando ? `Editar ${titulo}` : `Nuevo ${titulo}`} onClose={() => setShowModal(false)} style={{ width: '400px' }}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.5rem' }}><Button design="Transparent" onClick={() => setShowModal(false)}>Cancelar</Button><Button design="Emphasized" onClick={handleGuardar}>Guardar</Button></div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
          {formError && <MessageStrip design="Negative" hideCloseButton>{formError}</MessageStrip>}
          <div><Label>Código *</Label><Input value={fCodigo} onInput={(e) => setFCodigo((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="D190" /></div>
          <div><Label>Nombre *</Label><Input value={fNombre} onInput={(e) => setFNombre((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Osorno" /></div>
        </div>
      </Dialog>
    </div>
  )
}

function OficinasVentaTab() {
  return <TablaCodigoNombre titulo="Oficina" getData={getOficinasVenta} createData={createOficinaVenta} updateData={updateOficinaVenta} deleteData={deleteOficinaVenta} />
}

function CentrosSuministradorTab() {
  return <TablaCodigoNombre titulo="Centro" getData={getCentrosSuministrador} createData={createCentroSuministrador} updateData={updateCentroSuministrador} deleteData={deleteCentroSuministrador} />
}

function CanalesDistribucionTab() {
  return <TablaCodigoNombre
    titulo="Canal"
    getData={async () => {
      const data = await getCanalesDistribucion()
      return data.map(d => ({ id: d.id, codigo: d.codigo, nombre: d.descripcion, org_ventas: '', canal_distribucion: '', sector: '' }))
    }}
    createData={(data: any) => createCanalDistribucion({ codigo: data.codigo, descripcion: data.nombre })}
    updateData={(id: number, data: any) => updateCanalDistribucion(id, { codigo: data.codigo, descripcion: data.nombre })}
    deleteData={deleteCanalDistribucion}
  />
}

function GruposCuentaTab() {
  return <TablaCodigoNombre
    titulo="Grupo Cuenta"
    getData={async () => { const d = await getGruposCuenta(); return d.map(i => ({ id: i.id, codigo: i.codigo, nombre: i.descripcion, org_ventas: '', canal_distribucion: '', sector: '' })) }}
    createData={(data: any) => createGrupoCuenta({ codigo: data.codigo, descripcion: data.nombre })}
    updateData={(id: number, data: any) => updateGrupoCuenta(id, { codigo: data.codigo, descripcion: data.nombre })}
    deleteData={deleteGrupoCuenta}
  />
}

function ClasesInterlocutorTab() {
  return <TablaCodigoNombre
    titulo="Clase Interlocutor"
    getData={async () => { const d = await getClasesInterlocutor(); return d.map(i => ({ id: i.id, codigo: i.codigo, nombre: i.descripcion, org_ventas: '', canal_distribucion: '', sector: '' })) }}
    createData={(data: any) => createClaseInterlocutor({ codigo: data.codigo, descripcion: data.nombre })}
    updateData={(id: number, data: any) => updateClaseInterlocutor(id, { codigo: data.codigo, descripcion: data.nombre })}
    deleteData={deleteClaseInterlocutor}
  />
}

function CondicionesExpedicionTab() {
  return <TablaCodigoNombre
    titulo="Condición Expedición"
    getData={async () => { const d = await getCondicionesExpedicion(); return d.map(i => ({ id: i.id, codigo: i.codigo, nombre: i.descripcion, org_ventas: '', canal_distribucion: '', sector: '' })) }}
    createData={(data: any) => createCondicionExpedicion({ codigo: data.codigo, descripcion: data.nombre })}
    updateData={(id: number, data: any) => updateCondicionExpedicion(id, { codigo: data.codigo, descripcion: data.nombre })}
    deleteData={deleteCondicionExpedicion}
  />
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARÁMETROS GENERALES
// ═══════════════════════════════════════════════════════════════════════════════

function ParametrosTab() {
  const soloLectura = useSoloLectura()
  const { usuario } = useUser()
  const esAdministrador = usuario?.rolCod === ROLES.ADMINISTRADOR

  const [datos, setDatos] = useState<IParametroGeneral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [valorTemp, setValorTemp] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [fClave, setFClave] = useState('')
  const [fValor, setFValor] = useState('')
  const [fDescripcion, setFDescripcion] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { setDatos(await getParametros()); setError(null) } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleEditar = (param: IParametroGeneral) => {
    setEditando(param.clave)
    setValorTemp(param.valor)
    setSuccess(null)
  }

  const handleCancelar = () => {
    setEditando(null)
    setValorTemp('')
  }

  const handleGuardar = async (clave: string) => {
    if (!valorTemp.trim()) { setError('El valor no puede estar vacío'); return }
    try {
      await updateParametro(clave, valorTemp.trim())
      setEditando(null)
      setSuccess(`Parámetro ${clave} actualizado a "${valorTemp.trim()}"`)
      setError(null)
      cargar()
    } catch (e: any) { setError(e.message) }
  }

  const handleNuevoParametro = () => {
    setFClave(''); setFValor(''); setFDescripcion(''); setFormError(null)
    setShowModal(true)
  }

  const handleGuardarNuevo = async () => {
    if (!fClave.trim() || !fValor.trim()) { setFormError('Clave y valor son obligatorios'); return }
    setIsSaving(true)
    try {
      await createParametro(fClave.trim(), fValor.trim(), fDescripcion.trim())
      setShowModal(false)
      setSuccess(`Parámetro ${fClave.trim().toUpperCase()} creado correctamente`)
      setError(null)
      cargar()
    } catch (e: any) { setFormError(e.message) } finally { setIsSaving(false) }
  }

  if (loading) return <BusyIndicator active size="M" />

  return (
    <div>
      {error && <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '1rem' }}>{error}</MessageStrip>}
      {success && <MessageStrip design="Positive" hideCloseButton style={{ marginBottom: '1rem' }}>{success}</MessageStrip>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <ExportarTabla filas={datos} columnas={COLUMNAS_EXPORT_PARAMETROS} nombreArchivo="Maestros POS parametros" nombreHoja="Parámetros" data-testid="exportar-parametros" />
        {esAdministrador && (
          <Button icon="add" design="Emphasized" onClick={handleNuevoParametro} disabled={soloLectura} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : undefined}>Crear Parámetro</Button>
        )}
      </div>
      <Table headerRow={
        <TableHeaderRow>
          <TableHeaderCell>Clave</TableHeaderCell>
          <TableHeaderCell>Valor</TableHeaderCell>
          <TableHeaderCell>Descripción</TableHeaderCell>
          <TableHeaderCell>Acciones</TableHeaderCell>
        </TableHeaderRow>
      }>
        {datos.map((p) => (
          <TableRow key={p.clave}>
            <TableCell><strong>{p.clave}</strong></TableCell>
            <TableCell>
              {editando === p.clave ? (
                <Input
                  value={valorTemp}
                  onInput={(e) => setValorTemp((e.target as unknown as InputDomRef).value)}
                  style={{ width: '120px' }}
                />
              ) : (
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{p.valor}</span>
              )}
            </TableCell>
            <TableCell>{p.descripcion}</TableCell>
            <TableCell>
              {editando === p.clave ? (
                <>
                  <Button icon="save" design="Emphasized" onClick={() => handleGuardar(p.clave)} tooltip="Guardar" />
                  <Button design="Transparent" onClick={handleCancelar}>Cancelar</Button>
                </>
              ) : (
                <Button icon="edit" design="Transparent" onClick={() => handleEditar(p)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Editar"} disabled={soloLectura} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </Table>

      {esAdministrador && (
        <Dialog open={showModal} headerText="Crear Parámetro" onClose={() => setShowModal(false)} style={{ width: '450px' }}
          footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.5rem' }}><Button design="Transparent" onClick={() => setShowModal(false)} disabled={isSaving}>Cancelar</Button><Button design="Emphasized" onClick={handleGuardarNuevo} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button></div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            {formError && <MessageStrip design="Negative" hideCloseButton>{formError}</MessageStrip>}
            <div><Label>Clave *</Label><Input value={fClave} onInput={(e) => setFClave((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Ej: MANDANTE (máx. 50 caracteres)" maxlength={50} /></div>
            <div><Label>Valor *</Label><Input value={fValor} onInput={(e) => setFValor((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Máx. 100 caracteres" maxlength={100} /></div>
            <div><Label>Descripción</Label><Input value={fDescripcion} onInput={(e) => setFDescripcion((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Máx. 200 caracteres" maxlength={200} /></div>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function CondicionesPagoTab() {
  return <TablaCodigoNombre
    titulo="Condición Pago"
    getData={async () => { const d = await getCondicionesPago(); return d.map(i => ({ id: i.id, codigo: i.codigo, nombre: i.descripcion, org_ventas: '', canal_distribucion: '', sector: '' })) }}
    createData={(data: any) => createCondicionPago({ codigo: data.codigo, descripcion: data.nombre })}
    updateData={(id: number, data: any) => updateCondicionPago(id, { codigo: data.codigo, descripcion: data.nombre })}
    deleteData={deleteCondicionPago}
  />
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPO DOCUMENTO (tabla tipo_documento — llave = código, sin id numérico)
// ═══════════════════════════════════════════════════════════════════════════════

function TiposDocumentoTab() {
  const soloLectura = useSoloLectura()
  const [datos, setDatos] = useState<ITipoDocumento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<ITipoDocumento | null>(null)
  const [fCodigo, setFCodigo] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { setDatos(await getTiposDocumento()); setError(null) } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const texto = filtro.trim().toLowerCase()
  const visibles = texto ? datos.filter((d) => d.blart.toLowerCase().includes(texto) || d.ltext.toLowerCase().includes(texto)) : datos

  const handleNuevo = () => { setEditando(null); setFCodigo(''); setFDesc(''); setFormError(null); setShowModal(true) }
  const handleEditar = (item: ITipoDocumento) => { setEditando(item); setFCodigo(item.blart); setFDesc(item.ltext); setFormError(null); setShowModal(true) }
  const handleEliminar = async (item: ITipoDocumento) => {
    if (!confirm(`¿Eliminar ${item.blart} - ${item.ltext}?`)) return
    try { await deleteTipoDocumento(item.blart); cargar() } catch (e: any) { setError(e.message) }
  }

  const handleGuardar = async () => {
    const codigo = fCodigo.trim().toUpperCase()
    const descripcion = fDesc.trim()
    if (!/^[A-Z0-9]{1,2}$/.test(codigo)) { setFormError('El código debe tener 1 o 2 caracteres (letras o números)'); return }
    if (!descripcion || descripcion.length > 50) { setFormError('La descripción es obligatoria (máximo 50 caracteres)'); return }
    try {
      if (editando) { await updateTipoDocumento(editando.blart, descripcion) } else { await createTipoDocumento({ blart: codigo, ltext: descripcion }) }
      setShowModal(false); cargar()
    } catch (e: any) { setFormError(e.message) }
  }

  if (loading) return <BusyIndicator active size="M" />

  return (
    <div>
      <MessageStrip design="Information" hideCloseButton style={{ marginBottom: '1rem' }}>
        Descripción que se muestra en Caja &gt; Pago Cta. Cte. (columna Tipo documento). Esta tabla también la carga un proceso de Arquitectura SAP, que puede reemplazar los cambios hechos aquí.
      </MessageStrip>
      {error && <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '1rem' }}>{error}</MessageStrip>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Input value={filtro} placeholder="Buscar por código o descripción" onInput={(e) => setFiltro((e.target as unknown as InputDomRef).value)} style={{ width: '18rem' }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ExportarTabla filas={visibles} columnas={COLUMNAS_EXPORT_TIPOS_DOCUMENTO} nombreArchivo="Maestros POS tipos de documento" nombreHoja="Tipo Documento" data-testid="exportar-tipos-documento" />
          <Button icon="add" design="Emphasized" onClick={handleNuevo} disabled={soloLectura} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : undefined}>Nuevo</Button>
        </div>
      </div>
      <Table headerRow={<TableHeaderRow><TableHeaderCell>Código</TableHeaderCell><TableHeaderCell>Descripción</TableHeaderCell><TableHeaderCell>Acciones</TableHeaderCell></TableHeaderRow>}>
        {visibles.map((d) => (
          <TableRow key={d.blart}>
            <TableCell>{d.blart}</TableCell>
            <TableCell>{d.ltext}</TableCell>
            <TableCell>
              <Button icon="edit" design="Transparent" onClick={() => handleEditar(d)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Editar"} disabled={soloLectura} />
              <Button icon="delete" design="Transparent" onClick={() => handleEliminar(d)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Eliminar"} disabled={soloLectura} />
            </TableCell>
          </TableRow>
        ))}
      </Table>

      <Dialog open={showModal} headerText={editando ? 'Editar Tipo Documento' : 'Nuevo Tipo Documento'} onClose={() => setShowModal(false)} style={{ width: '400px' }}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.5rem' }}><Button design="Transparent" onClick={() => setShowModal(false)}>Cancelar</Button><Button design="Emphasized" onClick={handleGuardar}>Guardar</Button></div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
          {formError && <MessageStrip design="Negative" hideCloseButton>{formError}</MessageStrip>}
          <div><Label>Código *</Label><Input value={fCodigo} maxlength={2} disabled={!!editando} onInput={(e) => setFCodigo((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="D6" /></div>
          <div><Label>Descripción *</Label><Input value={fDesc} maxlength={50} onInput={(e) => setFDesc((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Boleta Electronica" /></div>
        </div>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIDAD DE MEDIDA (tabla sap_unidad_medida — llave = código SAP, idioma "S")
// ═══════════════════════════════════════════════════════════════════════════════

const CODIGO_UNIDAD = /^[A-Z0-9]{1,3}$/
const mensajeError = (e: unknown) => (e instanceof Error ? e.message : String(e))

function UnidadesMedidaTab() {
  const soloLectura = useSoloLectura()
  const [datos, setDatos] = useState<IUnidadMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<IUnidadMedida | null>(null)
  const [fSap, setFSap] = useState('')
  const [fComercial, setFComercial] = useState('')
  const [fTecnico, setFTecnico] = useState('')
  const [fCorto, setFCorto] = useState('')
  const [fLargo, setFLargo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try { setDatos(await getUnidadesMedida()); setError(null) } catch (e) { setError(mensajeError(e)) } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const texto = filtro.trim().toLowerCase()
  const visibles = texto
    ? datos.filter((u) => [u.msehi, u.mseh3, u.mseh6, u.texto_corto, u.texto_largo].some((v) => (v ?? '').toLowerCase().includes(texto)))
    : datos

  const abrir = (u: IUnidadMedida | null) => {
    setEditando(u)
    setFSap(u?.msehi ?? ''); setFComercial(u?.mseh3 ?? ''); setFTecnico(u?.mseh6 ?? '')
    setFCorto(u?.texto_corto ?? ''); setFLargo(u?.texto_largo ?? '')
    setFormError(null); setShowModal(true)
  }
  const handleEliminar = async (u: IUnidadMedida) => {
    if (!confirm(`¿Eliminar ${u.msehi} - ${u.texto_largo ?? u.mseh3}?`)) return
    try { await deleteUnidadMedida(u.msehi); cargar() } catch (e) { setError(mensajeError(e)) }
  }

  // Mismas reglas que el backend (server/src/routes/unidadMedida.ts): largos de la tabla
  const handleGuardar = async () => {
    const msehi = fSap.trim().toUpperCase()
    const mseh3 = fComercial.trim().toUpperCase()
    const mseh6 = fTecnico.trim().toUpperCase() || null
    const texto_corto = fCorto.trim() || null
    const texto_largo = fLargo.trim() || null
    if (!CODIGO_UNIDAD.test(msehi)) { setFormError('El código SAP debe tener de 1 a 3 caracteres (letras o números)'); return }
    if (!CODIGO_UNIDAD.test(mseh3)) { setFormError('El código comercial es obligatorio: de 1 a 3 caracteres (letras o números)'); return }
    if (mseh6 && !/^[A-Z0-9]{1,6}$/.test(mseh6)) { setFormError('El código técnico debe tener hasta 6 caracteres (letras o números)'); return }
    try {
      if (editando) await updateUnidadMedida(editando.msehi, { mseh3, mseh6, texto_corto, texto_largo })
      else await createUnidadMedida({ msehi, mseh3, mseh6, texto_corto, texto_largo })
      setShowModal(false); cargar()
    } catch (e) { setFormError(mensajeError(e)) }
  }

  if (loading) return <BusyIndicator active size="M" />

  return (
    <div>
      <MessageStrip design="Information" hideCloseButton style={{ marginBottom: '1rem' }}>
        Código interno de SAP (ej. ST) y su código comercial (ej. UN). Esta tabla también la carga un proceso de Arquitectura SAP, que puede reemplazar los cambios hechos aquí.
      </MessageStrip>
      {error && <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '1rem' }}>{error}</MessageStrip>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Input value={filtro} placeholder="Buscar por código o texto" onInput={(e) => setFiltro((e.target as unknown as InputDomRef).value)} style={{ width: '18rem' }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ExportarTabla filas={visibles} columnas={COLUMNAS_EXPORT_UNIDADES_MEDIDA} nombreArchivo="Maestros POS unidades de medida" nombreHoja="Unidad Medida" data-testid="exportar-unidades-medida" />
          <Button icon="add" design="Emphasized" onClick={() => abrir(null)} disabled={soloLectura} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : undefined}>Nuevo</Button>
        </div>
      </div>
      <Table headerRow={<TableHeaderRow><TableHeaderCell>Código SAP</TableHeaderCell><TableHeaderCell>Código comercial</TableHeaderCell><TableHeaderCell>Código técnico</TableHeaderCell><TableHeaderCell>Texto corto</TableHeaderCell><TableHeaderCell>Texto largo</TableHeaderCell><TableHeaderCell>Acciones</TableHeaderCell></TableHeaderRow>}>
        {visibles.map((u) => (
          <TableRow key={u.msehi}>
            <TableCell>{u.msehi}</TableCell>
            <TableCell>{u.mseh3}</TableCell>
            <TableCell>{u.mseh6 ?? ''}</TableCell>
            <TableCell>{u.texto_corto ?? ''}</TableCell>
            <TableCell>{u.texto_largo ?? ''}</TableCell>
            <TableCell>
              <Button icon="edit" design="Transparent" onClick={() => abrir(u)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Editar"} disabled={soloLectura} />
              <Button icon="delete" design="Transparent" onClick={() => handleEliminar(u)} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : "Eliminar"} disabled={soloLectura} />
            </TableCell>
          </TableRow>
        ))}
      </Table>

      <Dialog open={showModal} headerText={editando ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'} onClose={() => setShowModal(false)} style={{ width: '420px' }}
        footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.5rem' }}><Button design="Transparent" onClick={() => setShowModal(false)}>Cancelar</Button><Button design="Emphasized" onClick={handleGuardar}>Guardar</Button></div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
          {formError && <MessageStrip design="Negative" hideCloseButton>{formError}</MessageStrip>}
          <div><Label>Código SAP *</Label><Input value={fSap} maxlength={3} disabled={!!editando} onInput={(e) => setFSap((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="ST" /></div>
          <div><Label>Código comercial *</Label><Input value={fComercial} maxlength={3} onInput={(e) => setFComercial((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="UN" /></div>
          <div><Label>Código técnico</Label><Input value={fTecnico} maxlength={6} onInput={(e) => setFTecnico((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Opcional, hasta 6" /></div>
          <div><Label>Texto corto</Label><Input value={fCorto} maxlength={10} onInput={(e) => setFCorto((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Unidad" /></div>
          <div><Label>Texto largo</Label><Input value={fLargo} maxlength={30} onInput={(e) => setFLargo((e.target as unknown as InputDomRef).value)} style={{ width: '100%' }} placeholder="Unidad de medida" /></div>
        </div>
      </Dialog>
    </div>
  )
}
