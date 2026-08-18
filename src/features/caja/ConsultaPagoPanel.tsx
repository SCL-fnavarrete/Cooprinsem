import { useState, useCallback } from 'react'
import {
  Title,
  FlexBox,
  Label,
  Input,
  Button,
  MessageStrip,
  BusyIndicator,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Card,
  CardHeader,
} from '@ui5/webcomponents-react'

interface IDocumentoPago {
  cliente: string
  referencia: string
  nroDocumento: string
  clase: string
  fechaDocumento: string
  claveRef1: string
  fechaVencimiento: string
  importe: string
  docComp: string
  anioComp: string
  usuarioComp: string
  fechaComp: string
  referenciaComp: string
}

interface IReferenciaCompensacion {
  asig: string
  indicadorCME: string
  referencia: string
  clase: string
  texto: string
  importe: string
}

export function ConsultaPagoPanel() {
  // Búsqueda por factura
  const [cliente, setCliente] = useState('')
  const [nroTributario, setNroTributario] = useState('')
  const [tipo, setTipo] = useState('')

  // Búsqueda por compensación
  const [nroCompensacion, setNroCompensacion] = useState('')
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear().toString())

  // Resultados
  const [documentos, setDocumentos] = useState<IDocumentoPago[]>([])
  const [referencias, setReferencias] = useState<IReferenciaCompensacion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buscado, setBuscado] = useState(false)

  const handleBuscarFactura = useCallback(async () => {
    if (!cliente.trim() || !nroTributario.trim() || !tipo.trim()) {
      setError('Debe ingresar todos los parámetros de entrada (Cliente, Nº Tributario y Tipo)')
      return
    }
    setIsLoading(true)
    setError(null)
    setDocumentos([])
    setReferencias([])
    setBuscado(true)

    try {
      // TODO: Conectar con API SAP cuando esté disponible
      // Por ahora simulamos la búsqueda con datos de ejemplo
      setDocumentos([{
        cliente: cliente,
        referencia: `033-${nroTributario}`,
        nroDocumento: '1800498433',
        clase: 'D1',
        fechaDocumento: '17.09.2024',
        claveRef1: '1 de 1',
        fechaVencimiento: '17.09.2024',
        importe: '278.460',
        docComp: '1400434699',
        anioComp: '2024',
        usuarioComp: 'CREYESG',
        fechaComp: '17.09.2024',
        referenciaComp: 'D200',
      }])
      setReferencias([{
        asig: 'TD-6961',
        indicadorCME: '4',
        referencia: 'D200',
        clase: 'DW',
        texto: 'RECAUDACIÓN CAJA D200 TD',
        importe: '278.460',
      }])
    } catch {
      setError('Error al buscar documentos')
    } finally {
      setIsLoading(false)
    }
  }, [cliente, nroTributario, tipo])

  const handleBuscarCompensacion = useCallback(async () => {
    if (!nroCompensacion.trim() || !ejercicio.trim()) {
      setError('Debe ingresar Nº Compensación y Ejercicio')
      return
    }
    setIsLoading(true)
    setError(null)
    setDocumentos([])
    setReferencias([])
    setBuscado(true)

    try {
      // TODO: Conectar con API SAP cuando esté disponible
      // Por ahora simulamos con datos de ejemplo
      setDocumentos([
        {
          cliente: '10033900',
          referencia: '033-4738963',
          nroDocumento: '1800449465',
          clase: 'D1',
          fechaDocumento: '26.08.2024',
          claveRef1: '1 de 1',
          fechaVencimiento: '12.09.2024',
          importe: '332.736',
          docComp: nroCompensacion,
          anioComp: ejercicio,
          usuarioComp: 'ABRAVOG',
          fechaComp: '09.09.2024',
          referenciaComp: 'D100',
        },
        {
          cliente: '10033900',
          referencia: '033-4741246',
          nroDocumento: '1800454295',
          clase: 'D1',
          fechaDocumento: '27.08.2024',
          claveRef1: '1 de 1',
          fechaVencimiento: '12.09.2024',
          importe: '191.428',
          docComp: nroCompensacion,
          anioComp: ejercicio,
          usuarioComp: 'ABRAVOG',
          fechaComp: '09.09.2024',
          referenciaComp: 'D100',
        },
      ])
      setReferencias([{
        asig: 'CH-1314436',
        indicadorCME: '6',
        referencia: 'D100',
        clase: 'DW',
        texto: 'RECAUDACIÓN CAJA D100 CH',
        importe: '524.164',
      }])
    } catch {
      setError('Error al buscar documentos')
    } finally {
      setIsLoading(false)
    }
  }, [nroCompensacion, ejercicio])

  const handleLimpiar = () => {
    setCliente('')
    setNroTributario('')
    setTipo('')
    setNroCompensacion('')
    setEjercicio(new Date().getFullYear().toString())
    setDocumentos([])
    setReferencias([])
    setError(null)
    setBuscado(false)
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <FlexBox style={{ gap: '0.5rem' }}>
        <Button design="Transparent" icon="nav-back" onClick={() => {}}>Volver</Button>
        <Button design="Transparent" icon="refresh" onClick={handleLimpiar}>Limpiar</Button>
      </FlexBox>

      {error && <MessageStrip design="Warning" hideCloseButton>{error}</MessageStrip>}

      <BusyIndicator active={isLoading} size="M">
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Fila 1: Consulta de pago + Listado de documentos */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ width: '300px', minWidth: '300px', flexShrink: 0 }}>
              <Card header={<CardHeader titleText="Consulta de pago" />}>
                <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <Label>Cliente</Label>
                    <Input value={cliente} onInput={(e) => setCliente((e.target as any).value)} placeholder="Código cliente" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <Label>Nombre</Label>
                    <Input value="" readonly style={{ width: '100%', color: '#999' }} />
                  </div>
                  <div>
                    <Label>Nº Tributario</Label>
                    <Input value={nroTributario} onInput={(e) => setNroTributario((e.target as any).value)} placeholder="Folio factura" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Input value={tipo} onInput={(e) => setTipo((e.target as any).value)} placeholder="Ej: 033" style={{ width: '100%' }} />
                  </div>
                  <Button design="Emphasized" onClick={handleBuscarFactura} disabled={isLoading} style={{ width: '100%' }}>
                    Buscar
                  </Button>
                </div>
              </Card>
            </div>
            <div style={{ flex: 1 }}>
              <Title level="H5" style={{ marginBottom: '0.5rem' }}>Listado de documentos</Title>
              <div style={{ overflowX: 'auto', minHeight: '250px', border: '1px solid #e0e0e0' }}>
                <Table style={{ minWidth: '1400px' }} headerRow={
                  <TableHeaderRow>
                    <TableHeaderCell style={{ minWidth: '100px' }}>Cliente</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '120px' }}>Referencia</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '120px' }}>Nº documento</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '60px' }}>Clase</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '120px' }}>Fecha documento</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '90px' }}>Clave ref.1</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '130px' }}>Fecha vencimiento</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '100px' }}>Importe</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '110px' }}>Doc.comp.</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '80px' }}>Año Comp.</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '110px' }}>Usuario Comp.</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '110px' }}>Fecha Comp.</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '120px' }}>Referencia Comp.</TableHeaderCell>
                  </TableHeaderRow>
                }>
                  {documentos.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.cliente}</TableCell>
                      <TableCell>{d.referencia}</TableCell>
                      <TableCell>{d.nroDocumento}</TableCell>
                      <TableCell>{d.clase}</TableCell>
                      <TableCell>{d.fechaDocumento}</TableCell>
                      <TableCell>{d.claveRef1}</TableCell>
                      <TableCell>{d.fechaVencimiento}</TableCell>
                      <TableCell>{d.importe}</TableCell>
                      <TableCell>{d.docComp}</TableCell>
                      <TableCell>{d.anioComp}</TableCell>
                      <TableCell>{d.usuarioComp}</TableCell>
                      <TableCell>{d.fechaComp}</TableCell>
                      <TableCell>{d.referenciaComp}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
            </div>
          </div>

          {/* Fila 2: Nº Compensación + Referencias de compensación */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ width: '300px', minWidth: '300px', flexShrink: 0 }}>
              <Card header={<CardHeader titleText="Nº Compensación" />}>
                <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <Label>Nº Compensación</Label>
                    <Input value={nroCompensacion} onInput={(e) => setNroCompensacion((e.target as any).value)} placeholder="Nº documento" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <Label>Ejercicio</Label>
                    <Input value={ejercicio} onInput={(e) => setEjercicio((e.target as any).value)} style={{ width: '100%' }} />
                  </div>
                  <Button design="Emphasized" onClick={handleBuscarCompensacion} disabled={isLoading} style={{ width: '100%' }}>
                    Buscar
                  </Button>
                </div>
              </Card>
            </div>
            <div style={{ flex: 1 }}>
              <Title level="H5" style={{ marginBottom: '0.5rem' }}>Referencias de compensacion</Title>
              <div style={{ minHeight: '200px', border: '1px solid #e0e0e0' }}>
                <Table style={{ maxWidth: '800px' }} headerRow={
                  <TableHeaderRow>
                    <TableHeaderCell style={{ minWidth: '100px' }}>Asig</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '110px' }}>Indicador CME</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '100px' }}>Referencia</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '60px' }}>Clase</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '220px' }}>Texto</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '100px' }}>Importe</TableHeaderCell>
                  </TableHeaderRow>
                }>
                  {referencias.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.asig}</TableCell>
                      <TableCell>{r.indicadorCME}</TableCell>
                      <TableCell>{r.referencia}</TableCell>
                      <TableCell>{r.clase}</TableCell>
                      <TableCell>{r.texto}</TableCell>
                      <TableCell>{r.importe}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
            </div>
          </div>

          {buscado && documentos.length === 0 && !isLoading && !error && (
            <MessageStrip design="Information" hideCloseButton>No se encontraron documentos para los criterios ingresados.</MessageStrip>
          )}
        </div>
      </BusyIndicator>
    </div>
  )
}