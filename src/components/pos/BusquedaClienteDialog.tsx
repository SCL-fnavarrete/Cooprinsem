import { useState } from 'react'
import {
  Dialog,
  FlexBox,
  Label,
  Input,
  Button,
  Bar,
  Title,
  MessageStrip,
  BusyIndicator,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
} from '@ui5/webcomponents-react'
import type { ICliente } from '@/types/cliente'
import { buscarClientesSapTabla } from '@/services/api/clientes'
import { SelectGrupoClientes } from '@/components/common/SelectGrupoClientes'

// Buscador avanzado de clientes: solo la tabla Sap_cliente de PostgreSQL
// (sincronizada desde SAP). Desde el 26-10-2026 no consulta SAP en vivo.

interface Props {
  open: boolean
  onSeleccionar: (cliente: ICliente) => void
  onCerrar: () => void
  sucursal?: string
}

export function BusquedaClienteDialog({
  open,
  onSeleccionar,
  onCerrar,
  sucursal = 'D190',
}: Props) {
  const [rut, setRut] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [sociedad, setSociedad] = useState('COOP')
  const [resultados, setResultados] = useState<ICliente[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buscado, setBuscado] = useState(false)

  const handleBuscar = async () => {
    if (!rut.trim() && !codigo.trim() && !nombre.trim() && nombre !== '*') return
    setIsLoading(true)
    setError(null)
    setResultados([])
    setBuscado(true)

    try {
      let results: ICliente[] = []
      if (rut.trim()) {
        const rutNorm = rut.trim().replace(/\./g, '').replace(/[^0-9kK-]/gi, '')
        results = await buscarClientesSapTabla(rutNorm, sucursal)
      } else if (codigo.trim()) {
        results = await buscarClientesSapTabla(codigo.trim(), sucursal)
      } else if (nombre.trim()) {
        // Solo "*" = todos (los primeros 50 del grupo elegido)
        results = await buscarClientesSapTabla(nombre.trim() === '*' ? '' : nombre.trim(), sucursal)
      }

      setResultados(results)
      if (results.length === 0) setError('No se encontraron clientes')
      if (results.length === 1) {
        onSeleccionar(results[0])
        handleLimpiar()
      }
    } catch {
      setError('Error al buscar cliente')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLimpiar = () => {
    setRut('')
    setCodigo('')
    setNombre('')
    setResultados([])
    setError(null)
    setBuscado(false)
  }

  const handleCerrar = () => {
    handleLimpiar()
    onCerrar()
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleBuscar()
  }

  return (
    <Dialog
      open={open}
      headerText="Búsqueda Cliente"
      style={{ width: '700px', maxHeight: '80vh' }}
      footer={
        <Bar endContent={
          <Button design="Transparent" onClick={handleCerrar}>Cerrar</Button>
        } />
      }
    >
      <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
        <Title level="H5">Criterios de búsqueda</Title>

        {error && <MessageStrip design="Critical" hideCloseButton>{error}</MessageStrip>}

        <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '500px' }}>
          <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
            <Label style={{ width: '120px' }}>Nº ident.fisc.1:</Label>
            <Input value={rut} onInput={(e) => setRut((e.target as any).value)} placeholder="RUT" style={{ flex: 1 }} onKeyDown={handleKeyDown} />
          </FlexBox>
          <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
            <Label style={{ width: '120px' }}>Nº Cliente:</Label>
            <Input value={codigo} onInput={(e) => setCodigo((e.target as any).value)} placeholder="Código" style={{ flex: 1 }} onKeyDown={handleKeyDown} />
          </FlexBox>
          <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
            <Label style={{ width: '120px' }}>Nombre:</Label>
            <Input value={nombre} onInput={(e) => setNombre((e.target as any).value)} placeholder="Razón social (* = comodín; solo * = todos)" style={{ flex: 1 }} onKeyDown={handleKeyDown} />
          </FlexBox>
          <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
            <Label style={{ width: '120px' }}>Sociedad:</Label>
            <Input value={sociedad} onInput={(e) => setSociedad((e.target as any).value)} style={{ flex: 1 }} />
          </FlexBox>
        </div>

        <SelectGrupoClientes />

        <FlexBox style={{ gap: '0.5rem' }}>
          <Button design="Emphasized" onClick={handleBuscar} disabled={isLoading || (!rut.trim() && !codigo.trim() && !nombre.trim())}>
            Buscar
          </Button>
          <Button design="Default" onClick={handleLimpiar}>Borrar entradas</Button>
        </FlexBox>

        <BusyIndicator active={isLoading} size="M">
          {buscado && resultados.length > 0 && (
            <div>
              <Title level="H5" style={{ marginBottom: '0.5rem' }}>Lista de aciertos: {resultados.length} aciertos para Cliente</Title>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Table headerRow={
                  <TableHeaderRow>
                    <TableHeaderCell>Nº ident.fisc.1</TableHeaderCell>
                    <TableHeaderCell>Nombre</TableHeaderCell>
                    <TableHeaderCell>Grupo BP</TableHeaderCell>
                    <TableHeaderCell>Sociedad</TableHeaderCell>
                    <TableHeaderCell>Cliente</TableHeaderCell>
                  </TableHeaderRow>
                }>
                  {resultados.map((c) => (
                    <TableRow key={c.codigoCliente} onClick={() => { onSeleccionar(c); handleLimpiar() }} style={{ cursor: 'pointer' }}>
                      <TableCell>{c.rut}</TableCell>
                      <TableCell>{c.nombre}</TableCell>
                      <TableCell>{c.grupoBp ?? ''}</TableCell>
                      <TableCell>COOP</TableCell>
                      <TableCell>{c.codigoCliente}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
            </div>
          )}
        </BusyIndicator>
      </div>
    </Dialog>
  )
}