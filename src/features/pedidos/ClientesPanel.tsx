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
import { buscarClientesSapTabla } from '@/services/api/clientes'
import { largoBusqueda, AYUDA_COMODIN } from '@/utils/busqueda'
import { BusquedaClienteDialog } from '@/components/pos/BusquedaClienteDialog'
import { ListaSugerenciasClientes, useTecladoSugerencias } from '@/components/pos/ListaSugerenciasClientes'
import {
  crearSapCliente,
  obtenerFichaSap,
} from '@/services/api/sapClientes'
import { formatCLP, formatRUT } from '@/utils/format'
import { validarRUT } from '@/utils/validations'
import type { ICliente, ICrearCliente } from '@/types/cliente'
import { getSapRegiones } from '@/services/api/sapMaestro'
import { getDestinatariosConRetira, type IDestinatarioCliente } from '@/services/api/posMaestros'
import type { ISapRegion } from '@/types/sapMaestro'
import { DestinatarioDialog, type IDestinatario } from '@/components/pos/DestinatarioDialog'
import { PersonaRetiraDialog, type IPersonaRetira } from '@/components/pos/PersonaRetiraDialog'
import { LlamadasSapCliente } from '@/components/pos/LlamadasSapCliente'
import type { ILlamadaSapCliente } from '@/services/api/sapClientes'
import { useSoloLectura, TEXTO_SOLO_LECTURA } from '@/hooks/useSoloLectura'

type SubTab = 'buscar' | 'crear' | 'ficha'


const FORM_INICIAL: ICrearCliente = {
  tipoSocio: '2',
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
  const soloLectura = useSoloLectura()
  const [subTab, setSubTab] = useState<SubTab>('buscar')

  // --- Estado Buscar ---
  const [buscarCodigo, setBuscarCodigo] = useState('')
  const [showBusquedaPopup, setShowBusquedaPopup] = useState(false)
  const [clienteBuscado, setClienteBuscado] = useState<ICliente | null>(null)
  const [buscarLoading, setBuscarLoading] = useState(false)
  const [buscarError, setBuscarError] = useState<string | null>(null)
  const [sugerencias, setSugerencias] = useState<ICliente[]>([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Destinatarios (SH) del cliente buscado con sus personas que retiran (ZB): se
  // consultan una vez por cliente; elegir otro destinatario solo cambia la selección.
  const [destinatariosCliente, setDestinatariosCliente] = useState<IDestinatarioCliente[]>([])
  const [cargandoDestinatarios, setCargandoDestinatarios] = useState(false)
  const [errorDestinatarios, setErrorDestinatarios] = useState<string | null>(null)
  const [codigoDestinatario, setCodigoDestinatario] = useState<string | null>(null)
  const destinatarioElegido = destinatariosCliente.find((d) => d.codigo === codigoDestinatario) ?? null

  // --- Estado Ficha ---
  const [fichaCodigo, setFichaCodigo] = useState('')
  const [fichaGrupoCredito, setFichaGrupoCredito] = useState('1')
  const [clienteFicha, setClienteFicha] = useState<ICliente | null>(null)
  const [fichaLoading, setFichaLoading] = useState(false)
  const [fichaError, setFichaError] = useState<string | null>(null)
  const [fichaSugerencias, setFichaSugerencias] = useState<ICliente[]>([])
  const [mostrarFichaSugerencias, setMostrarFichaSugerencias] = useState(false)
  const fichaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [regionesSap, setRegionesSap] = useState<ISapRegion[]>([])

  // --- Estado Crear ---
  const [form, setForm] = useState<ICrearCliente>({ ...FORM_INICIAL })
  const [crearLoading, setCrearLoading] = useState(false)
  const [crearError, setCrearError] = useState<string | null>(null)
  const [crearExito, setCrearExito] = useState<string | null>(null)
  // Llamadas a SAP de la última creación (JSON enviado y respuesta), éxito o error
  const [llamadasCrear, setLlamadasCrear] = useState<ILlamadaSapCliente[]>([])
  const [clienteCreado, setClienteCreado] = useState<{ bp: string; datos: ICrearCliente } | null>(null)
  const [tabPostCreacion, setTabPostCreacion] = useState<'datos' | 'destinatario' | 'retira'>('datos')
  const [destinatarios, setDestinatarios] = useState<IDestinatario[]>([])
  const [personasRetira, setPersonasRetira] = useState<IPersonaRetira[]>([])
  const [showDestinatarioDialog, setShowDestinatarioDialog] = useState(false)
  const [showRetiraDialog, setShowRetiraDialog] = useState(false)

  const updateForm = (field: keyof ICrearCliente, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    getSapRegiones().then(setRegionesSap).catch(() => { })
  }, [])

  const codigoClienteBuscado = clienteBuscado?.codigoCliente ?? ''
  useEffect(() => {
    setDestinatariosCliente([])
    setCodigoDestinatario(null)
    setErrorDestinatarios(null)
    if (!codigoClienteBuscado) return
    let vigente = true
    setCargandoDestinatarios(true)
    getDestinatariosConRetira(codigoClienteBuscado)
      .then((lista) => {
        if (!vigente) return
        setDestinatariosCliente(lista)
        setCodigoDestinatario(lista[0]?.codigo ?? null)
      })
      .catch((err) => { if (vigente) setErrorDestinatarios(err instanceof Error ? err.message : 'No se pudieron consultar los destinatarios') })
      .finally(() => { if (vigente) setCargandoDestinatarios(false) })
    return () => { vigente = false }
  }, [codigoClienteBuscado])

  // Auto-búsqueda después de 3 caracteres con debounce 300ms
  useEffect(() => {
    if (largoBusqueda(buscarCodigo) < 3 || clienteBuscado !== null) {
      setSugerencias([])
      setMostrarSugerencias(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        // Sugerencias de la búsqueda rápida: Sap_cliente (solo grupo BP ZNAC).
        const resultados = await buscarClientesSapTabla(buscarCodigo.trim())
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

    const termino = buscarCodigo.trim()

    // Solo Sap_cliente de PostgreSQL (sincronizada desde SAP): desde el 26-10-2026
    // no se consulta SAP en vivo. Código, nombre o RUT en un solo criterio, con "*"
    // como comodín. Un resultado se muestra; varios quedan en la lista para elegir.
    try {
      const resultados = await buscarClientesSapTabla(termino)
      if (resultados.length === 0) {
        setBuscarError(`Cliente ${termino} no encontrado`)
      } else if (resultados.length === 1) {
        setClienteBuscado(resultados[0])
        setMostrarSugerencias(false)
        setSugerencias([])
      } else {
        setSugerencias(resultados)
        setMostrarSugerencias(true)
      }
    } catch {
      setBuscarError(`No se pudo buscar el cliente ${termino}`)
    } finally {
      setBuscarLoading(false)
    }
  }

  // Auto-búsqueda en Ficha después de 3 caracteres. Con un cliente ya elegido no
  // se vuelve a buscar (al elegir, el campo pasa a su código y reabría la lista).
  useEffect(() => {
    if (largoBusqueda(fichaCodigo) < 3 || clienteFicha !== null) {
      setFichaSugerencias([])
      setMostrarFichaSugerencias(false)
      return
    }

    if (fichaDebounceRef.current) clearTimeout(fichaDebounceRef.current)
    fichaDebounceRef.current = setTimeout(async () => {
      try {
        // Igual que Buscar: Sap_cliente, solo grupo BP ZNAC (José Castillo, 14-10-2026).
        const resultados = await buscarClientesSapTabla(fichaCodigo.trim())
        setFichaSugerencias(resultados)
        setMostrarFichaSugerencias(resultados.length > 0)
      } catch {
        setFichaSugerencias([])
        setMostrarFichaSugerencias(false)
      }
    }, 300)

    return () => { if (fichaDebounceRef.current) clearTimeout(fichaDebounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichaCodigo])

  // Teclado en las listas de sugerencias (como el buscador de clientes de Nuevo Pedido)
  const tecladoBuscar = useTecladoSugerencias(sugerencias, mostrarSugerencias, (c) => handleSeleccionarSugerencia(c), () => setMostrarSugerencias(false))
  const tecladoFicha = useTecladoSugerencias(fichaSugerencias, mostrarFichaSugerencias, (c) => handleSeleccionarFichaSugerencia(c), () => setMostrarFichaSugerencias(false))

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
      const sap = await obtenerFichaSap(fichaCodigo.trim())
      const direccion = sap.to_BusinessPartnerAddress?.results?.[0] ?? {}
      const customer = sap.to_Customer ?? {}

      const result: ICliente = {
        codigoCliente: sap.BusinessPartner ?? '',
        nombre: sap.BusinessPartnerFullName ?? sap.BusinessPartnerName ?? '',
        rut: sap.TaxNumber1 ?? sap.SearchTerm1 ?? '',
        condicionPago: customer.PaymentTerms ?? '',
        estadoCredito: 'AL_DIA',
        creditoAsignado: 0,
        creditoUtilizado: 0,
        porcentajeAgotamiento: 0,
        sucursal: 'D190',
        tratamiento: sap.FormOfAddress ?? '',
        nombre2: sap.OrganizationBPName2 ?? sap.LastName ?? '',
        conceptoBusqueda: sap.SearchTerm2 ?? '',
        giro: sap.Industry ?? '',
        direccion: direccion.StreetName ?? '',
        region: direccion.Region ?? '',
        ciudad: direccion.CityName ?? '',
        comuna: direccion.District ?? direccion.CityName ?? '',
        zonaTransporte: '',
        telefono: direccion.PhoneNumber ?? '',
        celular: direccion.MobilePhoneNumber ?? '',
        correoFactura: direccion.EmailAddress ?? '',
        razonSocial: sap.BusinessPartnerFullName ?? '',
        clasificacionComercial: sap.Industry ?? '',
        representanteLegal: '',
        seguro: '',
        grupoControlCredito: customer.CustomerCreditGroup ?? '',
      }

      setClienteFicha(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setFichaError(`Cliente ${fichaCodigo} no encontrado en SAP: ${msg}`)
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
    setLlamadasCrear([])

    try {
      const resultado = await crearSapCliente(form)
      setLlamadasCrear(resultado.llamadas)
      if (!resultado.success || !resultado.businessPartner) {
        setCrearError(resultado.detail ? `${resultado.message}\ndetalle del error: ${resultado.detail}` : resultado.message)
        setCrearLoading(false)
        return
      }
      const businessPartner = resultado.businessPartner
      // Un error en datos de contacto no anula el cliente: se avisa y se ve en las llamadas
      const contactoConError = resultado.llamadas.filter((ll) => !ll.ok).map((ll) => ll.paso)
      setCrearExito(`Cliente ${businessPartner} creado correctamente en SAP`
        + (contactoConError.length > 0 ? `. No se pudo registrar: ${contactoConError.join(', ')} (ver llamadas a SAP)` : ''))
      setClienteCreado({ bp: businessPartner, datos: { ...form } })
      setTabPostCreacion('datos')
      setDestinatarios([])
      setPersonasRetira([])
      setCrearLoading(false)
      return
    } catch (err) {
      const mensaje = err instanceof Error && err.message !== 'Failed to fetch'
        ? err.message
        : 'No se pudo crear el cliente. Verifique su conexión a la red e intente nuevamente.'
      setCrearError(mensaje)
      setCrearLoading(false)
    }
  }

  const handleCancelar = () => {
    setForm({ ...FORM_INICIAL })
    setCrearError(null)
    setCrearExito(null)
    setClienteCreado(null)
    setLlamadasCrear([])
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
                // ↑/↓ marcan, Enter elige el marcado (o busca), Esc cierra la lista
                onKeyDown={(e) => {
                  if (!tecladoBuscar.alPresionarTecla(e) && e.key === 'Enter') void handleBuscarCliente()
                }}
                placeholder={`Nombre, RUT o código cliente — ${AYUDA_COMODIN}`}
                style={{ width: '300px' }}
                aria-label="Buscar cliente"
              />
              {/* Lista de sugerencias */}
              {mostrarSugerencias && sugerencias.length > 0 && (
                <ListaSugerenciasClientes
                  clientes={sugerencias}
                  indice={tecladoBuscar.indice}
                  onElegir={handleSeleccionarSugerencia}
                  onMarcar={tecladoBuscar.setIndice}
                  data-testid="sugerencias-buscar"
                />
              )}
            </div>
            <Button icon="search" design="Emphasized" onClick={handleBuscarCliente} disabled={!buscarCodigo.trim() || buscarLoading}>
              Buscar cliente
            </Button>
            <Button design="Default" icon="search" onClick={() => setShowBusquedaPopup(true)}>
              Búsqueda avanzada
            </Button>
          </FlexBox>

          <BusquedaClienteDialog
            open={showBusquedaPopup}
            onSeleccionar={(c) => {
              setClienteBuscado(c)
              setBuscarCodigo(c.codigoCliente)
              setShowBusquedaPopup(false)
            }}
            onCerrar={() => setShowBusquedaPopup(false)}
          />

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
                      {renderCampo('Región', regionesSap.find(r => r.Codigo === clienteBuscado.region)?.Descripcion ?? clienteBuscado.region)}
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

                {/* Panel 2: Destinatario mercancía — SH reales del cliente (Sap_clientes_interlocutor).
                    Clic en una fila: Persona retira muestra las de ese destinatario, sin volver a consultar. */}
                <Card header={<CardHeader titleText="Destinatario mcia." subtitleText={`${destinatariosCliente.length} destinatario(s)`} />} style={{ flex: '2 1 420px', minWidth: '320px' }}>
                  <div style={{ padding: '1rem', maxHeight: '360px', overflowY: 'auto' }} data-testid="tabla-destinatarios">
                    {cargandoDestinatarios && <BusyIndicator active size="S" />}
                    {errorDestinatarios && <MessageStrip design="Negative" hideCloseButton>{errorDestinatarios}</MessageStrip>}
                    {!cargandoDestinatarios && !errorDestinatarios && destinatariosCliente.length === 0 && (
                      <MessageStrip design="Information" hideCloseButton>El cliente no tiene destinatarios de mercancía.</MessageStrip>
                    )}
                    {destinatariosCliente.length > 0 && (
                      <Table
                        headerRow={
                          <TableHeaderRow>
                            <TableHeaderCell>Código</TableHeaderCell>
                            <TableHeaderCell>Nombre</TableHeaderCell>
                            <TableHeaderCell>Rut</TableHeaderCell>
                            <TableHeaderCell>Dirección</TableHeaderCell>
                          </TableHeaderRow>
                        }
                      >
                        {destinatariosCliente.map((d) => {
                          const elegido = d.codigo === destinatarioElegido?.codigo
                          return (
                            <TableRow
                              key={d.codigo}
                              onClick={() => setCodigoDestinatario(d.codigo)}
                              data-elegido={elegido ? 'si' : 'no'}
                              data-testid={`destinatario-${d.codigo}`}
                              style={{
                                cursor: 'pointer',
                                background: elegido ? 'var(--sapList_SelectionBackgroundColor, #e5f0fa)' : undefined,
                                boxShadow: elegido ? 'inset 3px 0 0 var(--sapList_SelectionBorderColor, #0064d9)' : undefined,
                              }}
                            >
                              <TableCell>{d.codigo}</TableCell>
                              <TableCell>{d.nombre || '(sin nombre)'}</TableCell>
                              <TableCell>{d.rut ? formatRUT(d.rut) : ''}</TableCell>
                              <TableCell>{[d.direccion, d.comuna, d.ciudad].filter(Boolean).join(', ')}</TableCell>
                            </TableRow>
                          )
                        })}
                      </Table>
                    )}
                  </div>
                </Card>

                {/* Panel 3: Persona retira — ZB del destinatario elegido */}
                <Card
                  header={<CardHeader
                    titleText="Persona retira"
                    subtitleText={destinatarioElegido ? `${destinatarioElegido.codigo} ${destinatarioElegido.nombre}` : 'Elija un destinatario'}
                  />}
                  style={{ flex: '1 1 250px', minWidth: '250px' }}
                >
                  <div style={{ padding: '1rem', maxHeight: '360px', overflowY: 'auto' }} data-testid="tabla-persona-retira">
                    {destinatarioElegido && destinatarioElegido.personasRetira.length === 0 && (
                      <MessageStrip design="Information" hideCloseButton>Sin personas que retiran para este destinatario.</MessageStrip>
                    )}
                    {destinatarioElegido && destinatarioElegido.personasRetira.length > 0 && (
                      <Table
                        headerRow={
                          <TableHeaderRow>
                            <TableHeaderCell>RUT</TableHeaderCell>
                            <TableHeaderCell>Nombre 1</TableHeaderCell>
                          </TableHeaderRow>
                        }
                      >
                        {destinatarioElegido.personasRetira.map((p) => (
                          <TableRow key={p.codigo}>
                            <TableCell>{p.rut ? formatRUT(p.rut) : ''}</TableCell>
                            <TableCell>{p.nombre}</TableCell>
                          </TableRow>
                        ))}
                      </Table>
                    )}
                  </div>
                </Card>
              </FlexBox>
            )}
          </BusyIndicator>
        </div>
      )}

      {/* ====== SUB-TAB: CREAR ====== */}
      {subTab === 'crear' && !clienteCreado && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <Title level="H4">Creación de clientes</Title>
          <Label>Ingrese la información correspondiente</Label>

          {crearError && (
            <MessageStrip design="Negative" hideCloseButton>
              <span style={{ whiteSpace: 'pre-line' }}>{crearError}</span>
            </MessageStrip>
          )}
          {crearExito && <MessageStrip design="Positive" hideCloseButton>{crearExito}</MessageStrip>}
          {crearError && <LlamadasSapCliente llamadas={llamadasCrear} />}

          <Card header={<CardHeader titleText="Datos Generales" />}>
            <div style={{ padding: '1.5rem', display: 'grid', gap: '0.75rem', maxWidth: '600px' }}>
              {/* Tipo de Socio * */}
              <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
                <Label style={{ width: '150px', color: 'var(--sapNegativeColor)' }}>* Tipo de Socio:</Label>
                <Select
                  value={form.tipoSocio}
                  onChange={(e) => updateForm('tipoSocio', (e.detail?.selectedOption as unknown as { value: string })?.value ?? '2')}
                  style={{ width: '200px' }}
                >
                  <Option value="1">Persona</Option>
                  <Option value="2">Organización</Option>
                  <Option value="3">Grupo</Option>
                </Select>
              </FlexBox>

              {/* Tratamiento * */}
              <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
                <Label style={{ width: '150px', color: 'var(--sapNegativeColor)' }}>* Tratamiento:</Label>
                <Select
                  value={form.tratamiento}
                  onChange={(e) => updateForm('tratamiento', (e.detail?.selectedOption as unknown as { dataset: { value: string } })?.dataset?.value ?? 'Señor')}
                  style={{ width: '200px' }}
                >
                  <Option data-value="Señora">Señora</Option>
                  <Option data-value="Señor">Señor</Option>
                  <Option data-value="Empresa">Empresa</Option>
                  <Option data-value="Señor y señora">Señor y señora</Option>
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
                  {regionesSap.map((r) => (
                    <Option key={r.Codigo} data-value={r.Codigo} selected={form.region === r.Codigo}>{r.Descripcion}</Option>
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
            <Button icon="save" design="Emphasized" onClick={handleGuardar} disabled={crearLoading || soloLectura} tooltip={soloLectura ? TEXTO_SOLO_LECTURA : undefined}>
              Guardar
            </Button>
            <Button icon="decline" design="Default" onClick={handleCancelar} disabled={crearLoading}>
              Cancelar
            </Button>
          </FlexBox>

          <BusyIndicator active={crearLoading} size="L"><div /></BusyIndicator>
        </div>
      )}

      {/* ====== SUB-TAB: CREAR — POST-CREACIÓN (pestañas interlocutores) ====== */}
      {subTab === 'crear' && clienteCreado && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {crearExito && (
            <MessageStrip design={llamadasCrear.some((ll) => !ll.ok) ? 'Critical' : 'Positive'} hideCloseButton>{crearExito}</MessageStrip>
          )}

          <FlexBox alignItems="Center" style={{ gap: '0.75rem' }}>
            <Title level="H4">Cliente {clienteCreado.bp}</Title>
            <Button design="Transparent" onClick={() => { setClienteCreado(null); setForm({ ...FORM_INICIAL }); setCrearExito(null); setLlamadasCrear([]) }}>
              Crear otro cliente
            </Button>
          </FlexBox>

          <LlamadasSapCliente llamadas={llamadasCrear} />

          {/* Pestañas: Datos generales | Destinatario merc. | Persona retira */}
          <FlexBox style={{ gap: '0.5rem', borderBottom: '1px solid var(--sapGroup_TitleBorderColor, #d9d9d9)', paddingBottom: '0.5rem' }}>
            <Button design={tabPostCreacion === 'datos' ? 'Emphasized' : 'Default'} onClick={() => setTabPostCreacion('datos')}>Datos generales</Button>
            <Button design={tabPostCreacion === 'destinatario' ? 'Emphasized' : 'Default'} onClick={() => setTabPostCreacion('destinatario')}>Destinatario merc.</Button>
            <Button design={tabPostCreacion === 'retira' ? 'Emphasized' : 'Default'} onClick={() => setTabPostCreacion('retira')}>Persona retira</Button>
          </FlexBox>

          {/* Pestaña: Datos generales */}
          {tabPostCreacion === 'datos' && (
            <Card header={<CardHeader titleText="Datos generales" />}>
              <div style={{ padding: '1rem', display: 'grid', gap: '0.4rem', maxWidth: '500px' }}>
                {renderCampo('Nº Cliente', clienteCreado.bp)}
                {renderCampo('Tratamiento', clienteCreado.datos.tratamiento)}
                {renderCampo('Rut', clienteCreado.datos.rut)}
                {renderCampo('Nombre 1', clienteCreado.datos.nombre)}
                {renderCampo('Nombre 2', clienteCreado.datos.nombre2)}
                {renderCampo('Concepto Búsqueda', clienteCreado.datos.conceptoBusqueda)}
                {renderCampo('Giro', clienteCreado.datos.giro)}
                {renderCampo('Bienvenido', '')}
                {renderCampo('Comuna', clienteCreado.datos.comuna)}
                {renderCampo('Región', regionesSap.find(r => r.Codigo === clienteCreado.datos.region)?.Descripcion ?? clienteCreado.datos.region)}
                {renderCampo('Ciudad', clienteCreado.datos.ciudad)}
                {renderCampo('Zona transporte', clienteCreado.datos.zonaTransporte)}
                {renderCampo('Teléfono', clienteCreado.datos.telefono)}
                {renderCampo('Celular', clienteCreado.datos.celular)}
              </div>
            </Card>
          )}

          {/* Pestaña: Destinatario mercancía */}
          {tabPostCreacion === 'destinatario' && (
            <div>
              <FlexBox justifyContent="End" style={{ marginBottom: '0.5rem' }}>
                <Button icon="add" design="Emphasized" onClick={() => setShowDestinatarioDialog(true)}>Destinatario</Button>
              </FlexBox>
              <Table headerRow={<TableHeaderRow><TableHeaderCell>Cliente</TableHeaderCell><TableHeaderCell>Nombre</TableHeaderCell><TableHeaderCell>Descripción</TableHeaderCell><TableHeaderCell>NúmBP</TableHeaderCell></TableHeaderRow>}>
                {destinatarios.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.rut}</TableCell>
                    <TableCell>{d.nombre1}</TableCell>
                    <TableCell>{d.nombre2}</TableCell>
                    <TableCell>{clienteCreado.bp}</TableCell>
                  </TableRow>
                ))}
              </Table>
              {destinatarios.length === 0 && <MessageStrip design="Information" hideCloseButton style={{ marginTop: '0.5rem' }}>No hay destinatarios. Presione "+ Destinatario" para agregar.</MessageStrip>}
            </div>
          )}

          {/* Pestaña: Persona retira */}
          {tabPostCreacion === 'retira' && (
            <div>
              <FlexBox justifyContent="End" style={{ marginBottom: '0.5rem' }}>
                <Button icon="add" design="Emphasized" onClick={() => setShowRetiraDialog(true)}>Retira</Button>
              </FlexBox>
              <Table headerRow={<TableHeaderRow><TableHeaderCell>RUT</TableHeaderCell><TableHeaderCell>Nombre 1</TableHeaderCell></TableHeaderRow>}>
                {personasRetira.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.rut}</TableCell>
                    <TableCell>{p.nombre1}</TableCell>
                  </TableRow>
                ))}
              </Table>
              {personasRetira.length === 0 && <MessageStrip design="Information" hideCloseButton style={{ marginTop: '0.5rem' }}>No hay personas. Presione "+ Retira" para agregar.</MessageStrip>}
            </div>
          )}

          {/* Popups */}
          <DestinatarioDialog
            open={showDestinatarioDialog}
            onGuardar={(d) => { setDestinatarios(prev => [...prev, d]); setShowDestinatarioDialog(false) }}
            onCancelar={() => setShowDestinatarioDialog(false)}
            regiones={regionesSap}
          />
          <PersonaRetiraDialog
            open={showRetiraDialog}
            onGuardar={(p) => { setPersonasRetira(prev => [...prev, p]); setShowRetiraDialog(false) }}
            onCancelar={() => setShowRetiraDialog(false)}
          />
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
                onKeyDown={(e) => {
                  if (!tecladoFicha.alPresionarTecla(e) && e.key === 'Enter') void handleVerFicha()
                }}
                placeholder={`Nombre, RUT o código cliente — ${AYUDA_COMODIN}`}
                style={{ width: '300px' }}
                aria-label="Cliente de la ficha"
              />
              {/* Lista de sugerencias */}
              {mostrarFichaSugerencias && fichaSugerencias.length > 0 && (
                <ListaSugerenciasClientes
                  clientes={fichaSugerencias}
                  indice={tecladoFicha.indice}
                  onElegir={handleSeleccionarFichaSugerencia}
                  onMarcar={tecladoFicha.setIndice}
                  data-testid="sugerencias-ficha"
                />
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

