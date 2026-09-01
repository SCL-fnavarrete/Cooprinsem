import { useState, useCallback } from 'react'
import {
  Title,
  FlexBox,
  Label,
  Input,
  Button,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Card,
  CardHeader,
  Toast,
  Icon,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/pdf-attachment.js'

const MENSAJE_PENDIENTE = 'Funcionalidad pendiente de API'

interface IDocumentoEstadoCuenta {
  cliente: string
  referencia: string
  nroDocumento: string
  clase: string
  fechaDocumento: string
  claveRef1: string
}

// Datos de ejemplo solo para visualizar el layout — sin conexión a API (CA-14)
const DOCUMENTOS_EJEMPLO: IDocumentoEstadoCuenta[] = [
  { cliente: '10033900', referencia: '033-4738963', nroDocumento: '1800449465', clase: 'D1', fechaDocumento: '26.08.2024', claveRef1: '1 de 1' },
  { cliente: '10033900', referencia: '033-4741246', nroDocumento: '1800454295', clase: 'D1', fechaDocumento: '27.08.2024', claveRef1: '1 de 1' },
  { cliente: '10033900', referencia: '033-4750112', nroDocumento: '1800461820', clase: 'RV', fechaDocumento: '03.09.2024', claveRef1: '1 de 1' },
]

// CA-14 — Estado de Cuenta (módulo Caja). Las APIs SAP para consultar el
// estado de cuenta y generar el PDF están a la espera del equipo ABAP
// (Priscila) — por ahora solo se implementa el frontend; Buscar solo notifica
// al usuario. La tabla se muestra con datos de ejemplo para validar el layout.
export function EstadoCuentaPanel() {
  const [cliente, setCliente] = useState('')
  const [nroTributario, setNroTributario] = useState('')
  const [tipo, setTipo] = useState('')
  const [toastOpen, setToastOpen] = useState(false)

  const mostrarToast = useCallback(() => {
    setToastOpen(false)
    setTimeout(() => setToastOpen(true), 10)
  }, [])

  const handleLimpiar = useCallback(() => {
    setCliente('')
    setNroTributario('')
    setTipo('')
  }, [])

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <FlexBox style={{ gap: '0.5rem' }}>
        <Button design="Transparent" icon="nav-back" onClick={() => {}}>Volver</Button>
        <Button design="Transparent" icon="refresh" onClick={handleLimpiar}>Limpiar</Button>
      </FlexBox>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {/* Panel izquierdo: búsqueda */}
        <div style={{ width: '300px', minWidth: '300px', flexShrink: 0 }}>
          <Card header={<CardHeader titleText="E° de Cuenta" />}>
            <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div>
                <Label>Cliente</Label>
                <Input
                  value={cliente}
                  onInput={(e: { target: { value: string } }) => setCliente(e.target.value)}
                  placeholder="Código cliente"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input value="" readonly style={{ width: '100%', color: '#999' }} />
              </div>
              <div>
                <Label>Nº Tributario</Label>
                <Input
                  value={nroTributario}
                  onInput={(e: { target: { value: string } }) => setNroTributario(e.target.value)}
                  placeholder="Folio factura"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Input
                  value={tipo}
                  onInput={(e: { target: { value: string } }) => setTipo(e.target.value)}
                  placeholder="Ej: 033"
                  style={{ width: '100%' }}
                />
              </div>
              <Button design="Emphasized" onClick={mostrarToast} style={{ width: '100%' }}>
                Buscar
              </Button>
            </div>
          </Card>
        </div>

        {/* Panel derecho: listado + previsualización PDF */}
        <div style={{ flex: 1, display: 'grid', gap: '1rem' }}>
          <div>
            <Title level="H5" style={{ marginBottom: '0.5rem' }}>Listado de documentos</Title>
            <div style={{ overflowX: 'auto', minHeight: '200px', border: '1px solid #e0e0e0' }}>
              <Table style={{ minWidth: '700px' }} headerRow={
                <TableHeaderRow>
                  <TableHeaderCell style={{ minWidth: '100px' }}>Cliente</TableHeaderCell>
                  <TableHeaderCell style={{ minWidth: '120px' }}>Referencia</TableHeaderCell>
                  <TableHeaderCell style={{ minWidth: '120px' }}>Nº documento</TableHeaderCell>
                  <TableHeaderCell style={{ minWidth: '60px' }}>Clase</TableHeaderCell>
                  <TableHeaderCell style={{ minWidth: '120px' }}>Fecha documento</TableHeaderCell>
                  <TableHeaderCell style={{ minWidth: '90px' }}>Clave ref.1</TableHeaderCell>
                </TableHeaderRow>
              }>
                {DOCUMENTOS_EJEMPLO.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.cliente}</TableCell>
                    <TableCell>{d.referencia}</TableCell>
                    <TableCell>{d.nroDocumento}</TableCell>
                    <TableCell>{d.clase}</TableCell>
                    <TableCell>{d.fechaDocumento}</TableCell>
                    <TableCell>{d.claveRef1}</TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          </div>

          <div>
            <Title level="H5" style={{ marginBottom: '0.5rem' }}>Previsualización PDF</Title>
            <FlexBox
              direction="Column"
              style={{
                minHeight: '320px',
                border: '1px dashed #c0c0c0',
                borderRadius: '4px',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                color: '#999',
                backgroundColor: '#fafafa',
              }}
            >
              <Icon name="pdf-attachment" style={{ width: '2.5rem', height: '2.5rem', color: '#c0c0c0' }} />
              <Label style={{ color: '#999' }}>Vista previa no disponible — pendiente de API</Label>
            </FlexBox>
          </div>
        </div>
      </div>

      <Toast open={toastOpen} onClose={() => setToastOpen(false)}>
        {MENSAJE_PENDIENTE}
      </Toast>
    </div>
  )
}
