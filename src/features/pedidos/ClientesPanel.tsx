import { useState, useEffect, useRef } from 'react'
import {
  Title,
  FlexBox,
  Button,
  Input,
  Select,
  Option,
  Card,
  CardHeader,
  Label,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  BusyIndicator,
  MessageStrip,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/add.js'
import '@ui5/webcomponents-icons/dist/customer.js'
import '@ui5/webcomponents-icons/dist/save.js'
import '@ui5/webcomponents-icons/dist/decline.js'
import { getCliente, buscarClientes, crearCliente } from '@/services/api/clientes'
import { formatCLP, formatRUT } from '@/utils/format'
import { validarRUT } from '@/utils/validations'
import type { ICliente, ICrearCliente } from '@/types/cliente'

type SubTab = 'buscar' | 'crear' | 'ficha'

// Regiones de Chile para el select
const REGIONES_CHILE = [
  'XV- Arica y Parinacota', 'I- Tarapacá', 'II- Antofagasta', 'III- Atacama',
  'IV- Coquimbo', 'V- Valparaíso', 'VI- O\'Higgins', 'VII- Maule',
  'XVI- Ñuble', 'VIII- Biobío', 'IX- La Araucanía', 'XIV- Los Ríos',
  'X- De los Lagos', 'XI- Aysén', 'XII- Magallanes', 'RM- Metropolitana',
]

const FORM_INICIAL: ICrearCliente = {
  tratamiento: 'Señor',
  rut: '',
  nombre: '',
  nombre2: '',
  conceptoBusqueda: '',
  giro: '',
  direccion: '',
  region: '',
  ciudad: '',
  comuna: '',
  zonaTransporte: 'TIENDA',
  telefono: '',
  celular: '',
  fax: '',
  direccionPostal: '',
  ciudadPostal: '',
  casilla: '',
  correoContacto: '',
  correoFactura: '',
}

export function ClientesPanel() {
  const [subTab, setSubTab] = useState<SubTab>('buscar')

  // --- Estado Buscar ---
  const [buscarCodigo, setBuscarCodigo] = useState('')
  const [clienteBuscado, setClienteBuscado] = useState<ICliente | null>(null)
  const [buscarLoading, setBuscarLoading] = useState(false)
  const [buscarError, setBuscarError] = useState<string | null>(null)
  const [sugerencias, setSugerencias] = useState<ICliente[]>([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Estado Ficha ---
  const [fichaCodigo, setFichaCodigo] = useState('')
  const [fichaGrupoCredito, setFichaGrupoCredito] = useState('1')
  const [clienteFicha, setClienteFicha] = useState<ICliente | null>(null)
  const [fichaLoading, setFichaLoading] = useState(false)
  const [fichaError, setFichaError] = useState<string | null>(null)
  const [fichaSugerencias, setFichaSugerencias] = useState<ICliente[]>([])
  const [mostrarFichaSugerencias, setMostrarFichaSugerencias] = useState(false)
  const fichaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Estado Crear ---
  const [form, setForm] = useState<ICrearCliente>({ ...FORM_INICIAL })
  const [crearLoading, setCrearLoading] = useState(false)
  const [crearError, setCrearError] = useState<string | null>(null)
  const [crearExito, setCrearExito] = useState<string | null>(null)

  const updateForm = (field: keyof ICrearCliente, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Auto-búsqueda después de 3 caracteres con debounce 300ms
  useEffect(() => {
    if (buscarCodigo.trim().length < 3) {
      setSugerencias([])
      setMostrarSugerencias(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const resultados = await buscarClientes(buscarCodigo.trim())
        setSugerencias(resultados)
        setMostrarSugerencias(resultados.length > 0)
      } catch {
        setSugerencias([])
        setMostrarSugerencias(false)
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [buscarCodigo])

  const handleSeleccionarSugerencia = (cliente: ICliente) => {
    setClienteBuscado(cliente)
    setBuscarCodigo(cliente.codigoCliente)
    setMostrarSugerencias(false)
    setSugerencias([])
    setBuscarError(null)
  }

  // --- Handlers ---
  const handleBuscarCliente = async () => {
    if (!buscarCodigo.trim()) return
    setBuscarLoading(true)
    setBuscarError(null)
    setClienteBuscado(null)
    try {
      // Buscar por nombre, RUT o código (case-insensitive)
      const resultados = await buscarClientes(buscarCodigo.trim())
      if (resultados.length === 0) {
        setBuscarError(`Cliente ${buscarCodigo} no encontrado`)
      } else {
        setClienteBuscado(resultados[0])
      }
    } catch {
      setBuscarError(`Cliente ${buscarCodigo} no encontrado`)
    } finally {
      setBuscarLoading(false)
    }
  }

  // Auto-búsqueda en Ficha después de 3 caracteres
  useEffect(() => {
    if (fichaCodigo.trim().length < 3) {
      setFichaSugerencias([])
      setMostrarFichaSugerencias(false)
      return
    }

    if (fichaDebounceRef.current) clearTimeout(fichaDebounceRef.current)
    fichaDebounceRef.current = setTimeout(async () => {
      try {
        const resultados = await buscarClientes(fichaCodigo.trim())
        setFichaSugerencias(resultados)
        setMostrarFichaSugerencias(resultados.length > 0)
      } catch {
        setFichaSugerencias([])
        setMostrarFichaSugerencias(false)
      }
    }, 300)

    return () => { if (fichaDebounceRef.current) clearTimeout(fichaDebounceRef.current) }
  }, [fichaCodigo])

  const handleSeleccionarFichaSugerencia = (cliente: ICliente) => {
    setClienteFicha(cliente)
    setFichaCodigo(cliente.codigoCliente)
    setMostrarFichaSugerencias(false)
    setFichaSugerencias([])
    setFichaError(null)
  }

  const handleVerFicha = async () => {
    if (!fichaCodigo.trim()) return
    setFichaLoading(true)
    setFichaError(null)
    setClienteFicha(null)
    try {
      // Primero buscar por código exacto, si falla buscar por nombre/RUT
      let result: ICliente | null = null
      try {
        result = await getCliente(fichaCodigo.trim())
      } catch {
        const resultados = await buscarClientes(fichaCodigo.trim())
        if (resultados.length > 0) result = resultados[0]
      }
      if (result) {
        setClienteFicha(result)
      } else {
        setFichaError(`Cliente ${fichaCodigo} no encontrado`)
      }
    } catch {
      setFichaError(`Cliente ${fichaCodigo} no encontrado`)
    } finally {
      setFichaLoading(false)
    }
  }

  const handleGuardar = async () => {
    // Validar campos obligatorios
    if (!form.tratamiento || !form.rut || !form.nombre || !form.conceptoBusqueda ||
        !form.giro || !form.direccion || !form.region || !form.ciudad ||
        !form.comuna || !form.zonaTransporte) {
      setCrearError('Complete todos los campos obligatorios (*)')
      return
    }

    // Validar RUT
    if (!validarRUT(form.rut)) {
      setCrearError('RUT inválido. Verifique el dígito verificador.')
      return
    }

    setCrearLoading(true)
    setCrearError(null)
    setCrearExito(null)
    try {
      const nuevo = await crearCliente(form)
      setCrearExito(`Cliente ${nuevo.codigoCliente} — ${nuevo.nombre} creado correctamente`)
      setForm({ ...FORM_INICIAL })
    } catch (err) {
      setCrearError(err instanceof Error ? err.message : 'Error creando cliente')
    } finally {
      setCrearLoading(false)
    }
  }

  const handleCancelar = () => {
    setForm({ ...FORM_INICIAL })
    setCrearError(null)
    setCrearExito(null)
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Sub-tabs: Buscar | Crear | Ficha */}
      <FlexBox style={{ gap: '0.5rem', borderBottom: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)', paddingBottom: '0.5rem' }}>
        <Button
          icon="search"
          design={subTab === 'buscar' ? 'Emphasized' : 'Default'}
          onClick={() => setSubTab('buscar')}
        >
          Buscar
        </Button>
        <Button
          icon="add"
          design={subTab === 'crear' ? 'Emphasized' : 'Default'}
          onClick={() => setSubTab('crear')}
        >
          Crear
        </Button>
        <Button
          icon="customer"
          design={subTab === 'ficha' ? 'Emphasized' : 'Default'}
          onClick={() => setSubTab('ficha')}
        >
          Ficha
        </Button>
      </FlexBox>

      {/* ====== SUB-TAB: BUSCAR ====== */}
      {subTab === 'buscar' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <FlexBox alignItems="End" style={{ gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Input
                value={buscarCodigo}
                onInput={(e) => {
                  const val = (e.target as unknown as { value: string }).value
                  setBuscarCodigo(val)
                  setClienteBuscado(null)
                  setBuscarError(null)
                }}
                placeholder="Nombre, RUT o código cliente"
                style={{ width: '300px' }}
              />
              {/* Lista de sugerencias */}
              {mostrarSugerencias && sugerencias.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '400px',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  background: '#fff',
                  border: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                }}>
                  {sugerencias.map((c) => (
                    <div
                      key={c.codigoCliente}
                      onClick={() => handleSeleccionarSugerencia(c)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '13px',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f0f6ff' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.codigoCliente} — {c.nombre}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>{c.rut || 'Sin RUT'} · {c.condicionPago} · {c.sucursal}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button icon="search" design="Emphasized" onClick={handleBuscarCliente} disabled={!buscarCodigo.trim() || buscarLoading}>
              Buscar cliente
            </Button>
          </FlexBox>

          {buscarError && <MessageStrip design="Negative">{buscarError}</MessageStrip>}

          <BusyIndicator active={buscarLoading} size="L">
            {clienteBuscado && (
              <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
                {/* Panel 1: Datos generales */}
                <Card header={<CardHeader titleText="Datos generales" />} style={{ flex: '1 1 350px', minWidth: '350px' }}>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '0.5rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.25rem' }}>
                      <Label style={{ fontWeight: 'bold' }}>Destinatario</Label>
                    </div>
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {renderCampo('Nº Cliente', clienteBuscado.codigoCliente)}
                      {renderCampo('Tratamiento', clienteBuscado.tratamiento)}
                      {renderCampo('Rut', clienteBuscado.rut ? formatRUT(clienteBuscado.rut) : '')}
                      {renderCampo('Nombre 1', clienteBuscado.nombre)}
                      {renderCampo('Nombre 2', clienteBuscado.nombre2)}
                      {renderCampo('Concepto Busqueda', clienteBuscado.conceptoBusqueda)}
                      {renderCampo('Giro', clienteBuscado.giro)}
                      {renderCampo('Dirección', clienteBuscado.direccion)}
                      {renderCampo('Comuna', clienteBuscado.comuna)}
                      {renderCampo('Región', clienteBuscado.region)}
                      {renderCampo('Ciudad', clienteBuscado.ciudad)}
                      {renderCampo('Zona transporte', clienteBuscado.zonaTransporte)}
                      {renderCampo('Teléfono', clienteBuscado.telefono)}
                      {renderCampo('Celular', clienteBuscado.celular)}
                      {renderCampo('Fax', clienteBuscado.fax)}
                      {renderCampo('Dirección postal', clienteBuscado.direccionPostal)}
                      {renderCampo('Ciudad postal', clienteBuscado.ciudadPostal)}
                      {renderCampo('Casilla', clienteBuscado.casilla)}
                      {renderCampo('Correo contacto', clienteBuscado.correoContacto)}
                      {renderCampo('Correo factura', clienteBuscado.correoFactura)}
                    </div>
                  </div>
                </Card>

                {/* Panel 2: Destinatario mercancía */}
                <Card header={<CardHeader titleText="Destinatario mcia." />} style={{ flex: '1 1 250px', minWidth: '250px' }}>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '0.5rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.25rem' }}>
                      <Label style={{ fontWeight: 'bold' }}>Retira</Label>
                    </div>
                    <Table
                      headerRow={
                        <TableHeaderRow>
                          <TableHeaderCell>Cliente</TableHeaderCell>
                          <TableHeaderCell>Nombre</TableHeaderCell>
                          <TableHeaderCell>Dirección</TableHeaderCell>
                        </TableHeaderRow>
                      }
                    >
                      <TableRow>
                        <TableCell>{clienteBuscado.codigoCliente}</TableCell>
                        <TableCell>{clienteBuscado.nombre}</TableCell>
                        <TableCell>{clienteBuscado.direccion ?? ''}</TableCell>
                      </TableRow>
                    </Table>
                  </div>
                </Card>

                {/* Panel 3: Persona retira */}
                <Card header={<CardHeader titleText="Persona retira" />} style={{ flex: '1 1 250px', minWidth: '250px' }}>
                  <div style={{ padding: '1rem' }}>
                    <Table
                      headerRow={
                        <TableHeaderRow>
                          <TableHeaderCell>RUT</TableHeaderCell>
                          <TableHeaderCell>Nombre 1</TableHeaderCell>
                        </TableHeaderRow>
                      }
                    >
                      <TableRow>
                        <TableCell>{clienteBuscado.rut ? formatRUT(clienteBuscado.rut) : ''}</TableCell>
                        <TableCell>{clienteBuscado.nombre}</TableCell>
                      </TableRow>
                    </Table>
                  </div>
                </Card>
              </FlexBox>
            )}
          </BusyIndicator>
        </div>
      )}

      {/* ====== SUB-TAB: CREAR ====== */}
      {subTab === 'crear' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <Title level="H4">Creación de clientes</Title>
          <Label>Ingrese la información correspondiente</Label>

          {crearError && <MessageStrip design="Negative" hideCloseButton>{crearError}</MessageStrip>}
          {crearExito && <MessageStrip design="Positive" hideCloseButton>{crearExito}</MessageStrip>}

          <Card header={<CardHeader titleText="Datos Generales" />}>
            <div style={{ padding: '1.5rem', display: 'grid', gap: '0.75rem', maxWidth: '600px' }}>
              {/* Tratamiento * */}
              <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
                <Label style={{ width: '150px', color: 'var(--sapNegativeColor)' }}>* Tratamiento:</Label>
                <Select
                  value={form.tratamiento}
                  onChange={(e) => updateForm('tratamiento', (e.detail?.selectedOption as unknown as { dataset: { value: string } })?.dataset?.value ?? 'Señor')}
                  style={{ width: '200px' }}
                >
                  <Option data-value="Señor" selected={form.tratamiento === 'Señor'}>Señor</Option>
                  <Option data-value="Señora" selected={form.tratamiento === 'Señora'}>Señora</Option>
                </Select>
              </FlexBox>

              {/* Rut * */}
              {renderFormInput('* Rut:', form.rut, (v) => updateForm('rut', v), 'Ej: 12.345.678-9')}

              {/* Nombre 1 * */}
              {renderFormInput('* Nombre 1:', form.nombre, (v) => updateForm('nombre', v))}

              {/* Nombre 2 */}
              {renderFormInput('Nombre 2:', form.nombre2 ?? '', (v) => updateForm('nombre2', v))}

              {/* Concepto Busqueda * */}
              {renderFormInput('* Concepto Busqueda:', form.conceptoBusqueda, (v) => updateForm('conceptoBusqueda', v))}

              {/* Giro * */}
              {renderFormInput('* Giro:', form.giro, (v) => updateForm('giro', v))}

              {/* Dirección * */}
              {renderFormInput('* Dirección:', form.direccion, (v) => updateForm('direccion', v))}

              {/* Región * */}
              <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
                <Label style={{ width: '150px', color: 'var(--sapNegativeColor)' }}>* Región:</Label>
                <Select
                  onChange={(e) => updateForm('region', (e.detail?.selectedOption as unknown as { dataset: { value: string } })?.dataset?.value ?? '')}
                  style={{ flex: 1 }}
                >
                  <Option data-value="">Seleccione...</Option>
                  {REGIONES_CHILE.map((r) => (
                    <Option key={r} data-value={r} selected={form.region === r}>{r}</Option>
                  ))}
                </Select>
              </FlexBox>

              {/* Ciudad * */}
              {renderFormInput('* Ciudad:', form.ciudad, (v) => updateForm('ciudad', v))}

              {/* Comuna * */}
              {renderFormInput('* Comuna:', form.comuna, (v) => updateForm('comuna', v))}

              {/* Zona transporte * */}
              {renderFormInput('* Zona transporte:', form.zonaTransporte, (v) => updateForm('zonaTransporte', v))}

              {/* Campos opcionales */}
              {renderFormInput('Teléfono:', form.telefono ?? '', (v) => updateForm('telefono', v))}
              {renderFormInput('Celular:', form.celular ?? '', (v) => updateForm('celular', v))}
              {renderFormInput('Fax:', form.fax ?? '', (v) => updateForm('fax', v))}
              {renderFormInput('Dirección postal:', form.direccionPostal ?? '', (v) => updateForm('direccionPostal', v))}
              {renderFormInput('Ciudad postal:', form.ciudadPostal ?? '', (v) => updateForm('ciudadPostal', v))}
              {renderFormInput('Casilla:', form.casilla ?? '', (v) => updateForm('casilla', v))}
              {renderFormInput('Correo contacto:', form.correoContacto ?? '', (v) => updateForm('correoContacto', v))}
              {renderFormInput('Correo factura:', form.correoFactura ?? '', (v) => updateForm('correoFactura', v))}
            </div>
          </Card>

          <FlexBox style={{ gap: '0.75rem' }}>
            <Button icon="save" design="Emphasized" onClick={handleGuardar} disabled={crearLoading}>
              Guardar
            </Button>
            <Button icon="decline" design="Default" onClick={handleCancelar} disabled={crearLoading}>
              Cancelar
            </Button>
          </FlexBox>

          <BusyIndicator active={crearLoading} size="L"><div /></BusyIndicator>
        </div>
      )}

      {/* ====== SUB-TAB: FICHA ====== */}
      {subTab === 'ficha' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <FlexBox alignItems="End" style={{ gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Label>Cliente</Label>
              <Input
                value={fichaCodigo}
                onInput={(e) => {
                  const val = (e.target as unknown as { value: string }).value
                  setFichaCodigo(val)
                  setClienteFicha(null)
                  setFichaError(null)
                }}
                placeholder="Nombre, RUT o código cliente"
                style={{ width: '300px' }}
              />
              {/* Lista de sugerencias */}
              {mostrarFichaSugerencias && fichaSugerencias.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '400px',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  background: '#fff',
                  border: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                }}>
                  {fichaSugerencias.map((c) => (
                    <div
                      key={c.codigoCliente}
                      onClick={() => handleSeleccionarFichaSugerencia(c)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: '13px',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f0f6ff' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.codigoCliente} — {c.nombre}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>{c.rut || 'Sin RUT'} · {c.condicionPago} · {c.sucursal}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button design="Emphasized" onClick={handleVerFicha} disabled={!fichaCodigo.trim() || fichaLoading}>
              Ver Ficha
            </Button>
            <div>
              <Label>Grupo control crédito</Label>
              <Input
                value={fichaGrupoCredito}
                onInput={(e) => setFichaGrupoCredito((e.target as unknown as { value: string }).value)}
                style={{ width: '80px' }}
              />
            </div>
          </FlexBox>

          {fichaError && <MessageStrip design="Negative">{fichaError}</MessageStrip>}

          <BusyIndicator active={fichaLoading} size="L">
            {clienteFicha && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {/* Datos Generales */}
                <Card header={<CardHeader titleText="Datos Generales" />}>
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                    {renderCampo('Seguro', clienteFicha.seguro)}
                    {renderCampoDoble('Fecha', new Date().toLocaleDateString('es-CL'), 'Cliente', clienteFicha.codigoCliente)}
                    {renderCampoDoble('Rut', clienteFicha.rut ? formatRUT(clienteFicha.rut) : '', 'Nombre', clienteFicha.nombre)}
                    {renderCampo('Razón Social', clienteFicha.razonSocial)}
                    {renderCampo('Giro', clienteFicha.giro)}
                    {renderCampo('Clasificación Comercial', clienteFicha.clasificacionComercial)}
                    {renderCampoDoble('Cond.pago', clienteFicha.condicionPago, '', '')}
                    {renderCampo('Sucursal', clienteFicha.sucursal)}
                    {renderCampo('Representante Legal', clienteFicha.representanteLegal)}
                  </div>

                  {/* Línea de crédito */}
                  <div style={{ padding: '0 1rem 1rem', maxWidth: '300px' }}>
                    <Label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.25rem' }}>
                      Línea de crédito (MS)
                    </Label>
                    <div style={{ display: 'grid', gap: '0.3rem' }}>
                      {renderCampo('Aprobado', formatCLP(clienteFicha.creditoAsignado))}
                      {renderCampo('Disponible', formatCLP(Math.max(0, clienteFicha.creditoAsignado - clienteFicha.creditoUtilizado)))}
                      {renderCampo('Utilizado', formatCLP(clienteFicha.creditoUtilizado))}
                      {renderCampo('Total', formatCLP(clienteFicha.creditoAsignado))}
                    </div>
                  </div>
                </Card>

                {/* Tablas inferiores: Interlocutores, Socios, Empresas Relacionadas */}
                <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
                  <Card header={<CardHeader titleText="Interlocutores" />} style={{ flex: '1 1 350px' }}>
                    <div style={{ padding: '0.5rem' }}>
                      <Table
                        headerRow={
                          <TableHeaderRow>
                            <TableHeaderCell>Cliente</TableHeaderCell>
                            <TableHeaderCell>Nombre</TableHeaderCell>
                            <TableHeaderCell>Nombre 2</TableHeaderCell>
                            <TableHeaderCell>Función Interlocutor</TableHeaderCell>
                          </TableHeaderRow>
                        }
                      >
                        <TableRow>
                          <TableCell>{clienteFicha.codigoCliente}</TableCell>
                          <TableCell>{clienteFicha.nombre}</TableCell>
                          <TableCell>{clienteFicha.nombre2 ?? ''}</TableCell>
                          <TableCell>Destinatario mcía.</TableCell>
                        </TableRow>
                      </Table>
                    </div>
                  </Card>

                  <Card header={<CardHeader titleText="Socios" />} style={{ flex: '1 1 200px' }}>
                    <div style={{ padding: '0.5rem' }}>
                      <Table
                        headerRow={
                          <TableHeaderRow>
                            <TableHeaderCell>Nombre</TableHeaderCell>
                            <TableHeaderCell>% Participación</TableHeaderCell>
                          </TableHeaderRow>
                        }
                      >
                        {/* POC: sin datos — en SAP vendrían de relaciones del maestro deudor */}
                      </Table>
                    </div>
                  </Card>

                  <Card header={<CardHeader titleText="Empresas Relacionadas" />} style={{ flex: '1 1 400px' }}>
                    <div style={{ padding: '0.5rem' }}>
                      <Table
                        headerRow={
                          <TableHeaderRow>
                            <TableHeaderCell>Código</TableHeaderCell>
                            <TableHeaderCell>Rut</TableHeaderCell>
                            <TableHeaderCell>Razón Social</TableHeaderCell>
                            <TableHeaderCell>Deuda</TableHeaderCell>
                            <TableHeaderCell>Cond. Pago</TableHeaderCell>
                            <TableHeaderCell>Línea Aprobada</TableHeaderCell>
                          </TableHeaderRow>
                        }
                      >
                        {/* POC: sin datos — en SAP vendrían de empresas relacionadas */}
                      </Table>
                    </div>
                  </Card>
                </FlexBox>
              </div>
            )}
          </BusyIndicator>
        </div>
      )}
    </div>
  )
}

// --- Helpers de renderizado ---

function renderCampo(label: string, value?: string | null) {
  return (
    <FlexBox style={{ gap: '0.5rem' }}>
      <Label style={{ fontWeight: 'bold', minWidth: '140px' }}>{label}</Label>
      <span>{value ?? ''}</span>
    </FlexBox>
  )
}

function renderCampoDoble(label1: string, value1: string, label2: string, value2: string) {
  return (
    <FlexBox style={{ gap: '1rem', flexWrap: 'wrap' }}>
      <FlexBox style={{ gap: '0.5rem', flex: 1 }}>
        <Label style={{ fontWeight: 'bold', minWidth: '80px' }}>{label1}</Label>
        <span>{value1}</span>
      </FlexBox>
      {label2 && (
        <FlexBox style={{ gap: '0.5rem', flex: 1 }}>
          <Label style={{ fontWeight: 'bold', minWidth: '80px' }}>{label2}</Label>
          <span>{value2}</span>
        </FlexBox>
      )}
    </FlexBox>
  )
}

function renderFormInput(label: string, value: string, onChange: (v: string) => void, placeholder?: string) {
  const isRequired = label.startsWith('*')
  return (
    <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
      <Label style={{ width: '150px', color: isRequired ? 'var(--sapNegativeColor)' : undefined }}>{label}</Label>
      <Input
        value={value}
        onInput={(e) => onChange((e.target as unknown as { value: string }).value)}
        placeholder={placeholder}
        style={{ flex: 1 }}
      />
    </FlexBox>
  )
}
