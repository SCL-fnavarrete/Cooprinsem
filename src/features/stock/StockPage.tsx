import { useState } from 'react'
import {
  Title,
  FlexBox,
  Button,
  Input,
  Label,
  BusyIndicator,
  MessageStrip,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
} from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/search.js'
import '@ui5/webcomponents-icons/dist/clear-all.js'
import { getSapStock, SapStockRecord, SapStockQueryParams } from '@/services/api/sapStock'

// ─── Tipos locales ─────────────────────────────────────────────────────────────

type EstadoBusqueda = 'inicial' | 'cargando' | 'con-resultados' | 'sin-resultados' | 'error'

// ─── Componente principal ──────────────────────────────────────────────────────

/**
 * Página de Consulta de Stock SAP.
 * Consume la API personalizada ZSB_STOCK de Cooprinsem que devuelve datos enriquecidos:
 * descripción del material, nombre del centro y los tres tipos de stock separados.
 */
export function StockPage() {
  // ── Estado de filtros ──────────────────────────────────────────────────────
  const [filtroMaterial,      setFiltroMaterial]      = useState('')
  const [filtroCentro,        setFiltroCentro]        = useState('')
  const [filtroAlmacen,       setFiltroAlmacen]       = useState('')
  const [filtroSoloConStock,  setFiltroSoloConStock]  = useState(false)

  // ── Estado de resultados ───────────────────────────────────────────────────
  const [registros,      setRegistros]      = useState<SapStockRecord[]>([])
  const [estadoBusqueda, setEstadoBusqueda] = useState<EstadoBusqueda>('inicial')
  const [mensajeError,   setMensajeError]   = useState('')

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Ejecuta la búsqueda de stock en SAP con los filtros actuales.
   */
  async function handleBuscar() {
    const params: SapStockQueryParams = {
      material:        filtroMaterial.trim()  || undefined,
      plant:           filtroCentro.trim()    || undefined,
      storageLocation: filtroAlmacen.trim()   || undefined,
      soloConStock:    filtroSoloConStock,
      top:             200,
    }

    setEstadoBusqueda('cargando')
    setRegistros([])
    setMensajeError('')

    try {
      const data = await getSapStock(params)
      setRegistros(data)
      setEstadoBusqueda(data.length === 0 ? 'sin-resultados' : 'con-resultados')
    } catch (error: any) {
      setMensajeError(error.message ?? 'Error desconocido al consultar SAP')
      setEstadoBusqueda('error')
    }
  }

  /**
   * Limpia todos los filtros y vuelve al estado inicial.
   */
  function handleLimpiar() {
    setFiltroMaterial('')
    setFiltroCentro('')
    setFiltroAlmacen('')
    setFiltroSoloConStock(false)
    setRegistros([])
    setEstadoBusqueda('inicial')
    setMensajeError('')
  }

  /**
   * Formatea una cantidad de stock para mostrar en pantalla.
   * Elimina ceros innecesarios al final (ej: "1.000" → "1", "245.500" → "245.5")
   */
  function formatearStock(cantidad: string): string {
    const numero = parseFloat(cantidad)
    if (isNaN(numero)) return cantidad
    return numero.toLocaleString('es-CL', { maximumFractionDigits: 3 })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <FlexBox direction="Column" style={{ padding: '1rem', gap: '1rem', height: '100%' }}>

      {/* Encabezado */}
      <Title>Consulta de Stock</Title>

      {/* Panel de filtros */}
      <FlexBox
        wrap="Wrap"
        alignItems="End"
        style={{
          gap: '1rem',
          padding: '1rem',
          background: '#f5f6f7',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
        }}
      >
        <FlexBox direction="Column" style={{ gap: '0.25rem', minWidth: '180px' }}>
          <Label>Material</Label>
          <Input
            placeholder="Ej: 14700006"
            value={filtroMaterial}
            onInput={e => setFiltroMaterial(e.target.value)}
          />
        </FlexBox>

        <FlexBox direction="Column" style={{ gap: '0.25rem', minWidth: '180px' }}>
          <Label>Centro (Plant)</Label>
          <Input
            placeholder="Ej: D190"
            value={filtroCentro}
            onInput={e => setFiltroCentro(e.target.value)}
          />
        </FlexBox>

        <FlexBox direction="Column" style={{ gap: '0.25rem', minWidth: '180px' }}>
          <Label>Almacén (Storage Location)</Label>
          <Input
            placeholder="Ej: B000"
            value={filtroAlmacen}
            onInput={e => setFiltroAlmacen(e.target.value)}
          />
        </FlexBox>

        {/* Checkbox solo con stock disponible */}
        <FlexBox alignItems="Center" style={{ gap: '0.5rem', paddingBottom: '0.25rem' }}>
          <input
            type="checkbox"
            id="soloConStock"
            checked={filtroSoloConStock}
            onChange={e => setFiltroSoloConStock(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="soloConStock" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
            Solo con stock disponible
          </label>
        </FlexBox>

        {/* Botones */}
        <FlexBox style={{ gap: '0.5rem' }}>
          <Button
            design="Emphasized"
            icon="search"
            onClick={handleBuscar}
            disabled={estadoBusqueda === 'cargando'}
          >
            Buscar
          </Button>
          <Button
            design="Default"
            icon="clear-all"
            onClick={handleLimpiar}
            disabled={estadoBusqueda === 'cargando'}
          >
            Limpiar
          </Button>
        </FlexBox>
      </FlexBox>

      {/* Estado: error */}
      {estadoBusqueda === 'error' && (
        <MessageStrip design="Negative" hideCloseButton>
          <span style={{ whiteSpace: 'pre-line' }}>{mensajeError}</span>
        </MessageStrip>
      )}

      {/* Estado: cargando */}
      {estadoBusqueda === 'cargando' && (
        <FlexBox justifyContent="Center" style={{ padding: '3rem' }}>
          <BusyIndicator active />
        </FlexBox>
      )}

      {/* Estado: inicial */}
      {estadoBusqueda === 'inicial' && (
        <FlexBox
          justifyContent="Center"
          alignItems="Center"
          style={{
            flex: 1,
            padding: '3rem',
            color: '#6a6d70',
            fontSize: '0.9rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fafafa',
          }}
        >
          Para comenzar, ingrese al menos un filtro y presione Buscar.
        </FlexBox>
      )}

      {/* Estado: sin resultados */}
      {estadoBusqueda === 'sin-resultados' && (
        <FlexBox
          justifyContent="Center"
          alignItems="Center"
          style={{
            flex: 1,
            padding: '3rem',
            color: '#6a6d70',
            fontSize: '0.9rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fafafa',
          }}
        >
          No se encontraron registros. Intente ajustar los filtros.
        </FlexBox>
      )}

      {/* Estado: con resultados — tabla */}
      {estadoBusqueda === 'con-resultados' && (
        <FlexBox direction="Column" style={{ gap: '0.5rem', flex: 1 }}>
          <Title level="H5">Materiales ({registros.length})</Title>

          <Table
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell>Material</TableHeaderCell>
                <TableHeaderCell>Descripción</TableHeaderCell>
                <TableHeaderCell>Centro</TableHeaderCell>
                <TableHeaderCell>Nombre Centro</TableHeaderCell>
                <TableHeaderCell>Almacén</TableHeaderCell>
                <TableHeaderCell>Stock Libre</TableHeaderCell>
                <TableHeaderCell>En Inspección</TableHeaderCell>
                <TableHeaderCell>Bloqueado</TableHeaderCell>
                <TableHeaderCell>Unidad</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {registros.map((registro, index) => (
              <TableRow key={index}>
                <TableCell>{registro.Material}</TableCell>
                <TableCell>{registro.MaterialDescription}</TableCell>
                <TableCell>{registro.Plant}</TableCell>
                <TableCell>{registro.PlantName}</TableCell>
                <TableCell>{registro.StorageLocation}</TableCell>
                <TableCell>{formatearStock(registro.UnrestrictedStock)}</TableCell>
                <TableCell>{formatearStock(registro.QualityInspectionStock)}</TableCell>
                <TableCell>{formatearStock(registro.BlockedStock)}</TableCell>
                <TableCell>{registro.BaseUnit}</TableCell>
              </TableRow>
            ))}
          </Table>
        </FlexBox>
      )}

    </FlexBox>
  )
}