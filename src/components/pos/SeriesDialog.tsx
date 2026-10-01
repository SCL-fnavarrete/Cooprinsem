import '@ui5/webcomponents-icons/dist/search.js'
import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  Bar,
  Button,
  FlexBox,
  Input,
  Label,
  MessageStrip,
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Tag,
} from '@ui5/webcomponents-react'
import type { ILineaPedido } from '@/types/pedido'
import type { ISerieAsignada, ISerieValidada } from '@/types/serie'
import { validarSeriesSap } from '@/services/api/sapSeries'
import { asignarPrimerasLibres, type EstadoSerie } from '@/features/pedidos/seriesPedido'

interface SeriesDialogProps {
  open: boolean
  linea: ILineaPedido | null
  centro: string
  // Series ya asignadas a otras líneas del pedido (no se pueden repetir).
  usadasEnOtrasLineas: ReadonlySet<string>
  onConfirmar: (posicion: string, series: ISerieAsignada[]) => void
  onCancelar: () => void
}

const ETIQUETA_ESTADO: Record<EstadoSerie, { texto: string; color: 'Set8' | 'Set6' | 'Set1' | 'Set2' }> = {
  asignada: { texto: 'Asignada', color: 'Set8' },
  disponible: { texto: 'Disponible (no requerida)', color: 'Set6' },
  'no-disponible': { texto: 'No disponible', color: 'Set1' },
  repetida: { texto: 'Ya usada en otra línea', color: 'Set2' },
}

// Ventana "Series" de Crear Pedido (PE-23) — replica "Series DIIOS" del
// WebDynpro: un solo rango Desde/Hasta por línea, validación contra SAP y
// asignación automática de las primeras series libres.
export function SeriesDialog({ open, linea, centro, usadasEnOtrasLineas, onConfirmar, onCancelar }: SeriesDialogProps) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [validadas, setValidadas] = useState<ISerieValidada[] | null>(null)
  const [datosDePrueba, setDatosDePrueba] = useState(false)
  const [isBuscando, setIsBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al abrir: reiniciar la ventana (se mantiene montada entre aperturas).
  useEffect(() => {
    if (!open) return
    setDesde('')
    setHasta('')
    setValidadas(null)
    setError(null)
  }, [open, linea?.posicion])

  const resultado = useMemo(
    () => (validadas && linea ? asignarPrimerasLibres(validadas, linea.cantidad, usadasEnOtrasLineas) : null),
    [validadas, linea, usadasEnOtrasLineas]
  )

  const handleBuscar = async () => {
    if (!linea) return
    setError(null)
    setValidadas(null)
    if (!desde.trim() || !hasta.trim()) {
      setError('Ingrese el rango de series (Desde y Hasta)')
      return
    }
    setIsBuscando(true)
    try {
      const r = await validarSeriesSap({ material: linea.codigoMaterial, centro, desde: desde.trim(), hasta: hasta.trim() })
      if (!r.success) {
        setError(r.message ?? 'No se pudieron validar las series')
        return
      }
      setValidadas(r.series ?? [])
      setDatosDePrueba(!!r.datosDePrueba)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red al validar las series')
    } finally {
      setIsBuscando(false)
    }
  }

  const handleConfirmar = () => {
    if (!linea || !resultado?.suficientes) return
    onConfirmar(linea.posicion, resultado.asignadas)
  }

  const soloDigitos = (valor: string) => valor.replace(/\D/g, '')

  return (
    <Dialog
      open={open}
      headerText={linea ? `Series — ${linea.codigoMaterial} ${linea.descripcion}` : 'Series'}
      style={{ width: '760px', maxHeight: '85vh' }}
      onClose={onCancelar}
      footer={
        <Bar
          endContent={
            <FlexBox style={{ gap: '0.5rem' }}>
              <Button design="Emphasized" onClick={handleConfirmar} disabled={!resultado?.suficientes}>
                Confirmar
              </Button>
              <Button design="Transparent" onClick={onCancelar}>Cancelar</Button>
            </FlexBox>
          }
        />
      }
    >
      <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
        <Label>Cantidad de la línea: {linea?.cantidad ?? 0} — se asignan automáticamente las primeras series libres del rango.</Label>

        <FlexBox style={{ gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <Label>Desde</Label>
            <Input
              value={desde}
              onInput={(e: { target: { value: string } }) => setDesde(soloDigitos(e.target.value))}
              placeholder="Ej. 25601496"
              aria-label="Serie desde"
            />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input
              value={hasta}
              onInput={(e: { target: { value: string } }) => setHasta(soloDigitos(e.target.value))}
              placeholder="Ej. 25601500"
              aria-label="Serie hasta"
            />
          </div>
          <Button icon="search" onClick={handleBuscar} disabled={isBuscando}>
            {isBuscando ? 'Buscando…' : 'Buscar'}
          </Button>
        </FlexBox>

        {error && <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip>}

        {datosDePrueba && resultado && (
          <MessageStrip design="Information" hideCloseButton>
            Validación con datos de prueba — la API de series de SAP aún no está disponible.
          </MessageStrip>
        )}

        {resultado && !resultado.suficientes && (
          <MessageStrip design="Negative" hideCloseButton>
            Se requieren {resultado.requeridas} series y el rango tiene {resultado.libres} disponibles. Busque un rango más amplio.
          </MessageStrip>
        )}

        {resultado && resultado.suficientes && (
          <MessageStrip design="Positive" hideCloseButton>
            {resultado.asignadas.length} de {resultado.requeridas} series asignadas.
          </MessageStrip>
        )}

        {resultado && (
          <Table
            style={{ maxHeight: '40vh', overflow: 'auto' }}
            headerRow={
              <TableHeaderRow sticky>
                <TableHeaderCell>Número de serie</TableHeaderCell>
                <TableHeaderCell>Material</TableHeaderCell>
                <TableHeaderCell>Lote</TableHeaderCell>
                <TableHeaderCell>Centro</TableHeaderCell>
                <TableHeaderCell>Almacén</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {resultado.series.map((s) => (
              <TableRow key={s.numeroSerie}>
                <TableCell>{s.numeroSerie}</TableCell>
                <TableCell>{s.material}</TableCell>
                <TableCell>{s.lote}</TableCell>
                <TableCell>{s.centro}</TableCell>
                <TableCell>{s.almacen}</TableCell>
                <TableCell>
                  <Tag colorScheme={ETIQUETA_ESTADO[s.estado].color} title={s.motivo}>
                    {ETIQUETA_ESTADO[s.estado].texto}
                  </Tag>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </div>
    </Dialog>
  )
}
