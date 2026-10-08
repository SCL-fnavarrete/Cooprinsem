import { FlexBox, Button, Select, Option, Label } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-icons/dist/close-command-field.js'
import '@ui5/webcomponents-icons/dist/open-command-field.js'
import '@ui5/webcomponents-icons/dist/navigation-left-arrow.js'
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js'
import { TAMANOS_PAGINA, paginasVisibles, type TamanoPagina } from '@/hooks/usePaginacion'

// Paginador reutilizable (estilo Fiori con componentes UI5) para usar junto a
// usePaginacion: "Mostrando 1–10 de 67 · Filas por página [10] « ‹ 1 2 3 … 7 › »".

interface PaginadorProps {
  pagina: number
  totalPaginas: number
  tamano: TamanoPagina
  total: number
  desde: number
  hasta: number
  onPagina: (pagina: number) => void
  onTamano: (tamano: TamanoPagina) => void
  /** Nombre en plural de lo que se lista, ej. "perfiles" */
  etiqueta?: string
  'data-testid'?: string
}

export function Paginador({
  pagina, totalPaginas, tamano, total, desde, hasta, onPagina, onTamano, etiqueta = 'registros',
  'data-testid': testId = 'paginador',
}: PaginadorProps) {
  const enPrimera = pagina <= 1
  const enUltima = pagina >= totalPaginas

  return (
    <FlexBox justifyContent="SpaceBetween" alignItems="Center" wrap="Wrap" style={{ gap: '0.75rem' }} data-testid={testId}>
      <FlexBox alignItems="Center" wrap="Wrap" style={{ gap: '0.75rem' }}>
        <Label data-testid={`${testId}-rango`}>
          {total === 0 ? `Sin ${etiqueta}` : `Mostrando ${desde}–${hasta} de ${total} ${etiqueta}`}
        </Label>
        <FlexBox alignItems="Center" style={{ gap: '0.5rem' }}>
          <Label>Filas por página</Label>
          <Select
            style={{ width: '90px' }}
            data-testid={`${testId}-tamano`}
            onChange={(e) => {
              const valor = Number(e.detail.selectedOption?.getAttribute('data-value'))
              if (TAMANOS_PAGINA.includes(valor as TamanoPagina)) onTamano(valor as TamanoPagina)
            }}
          >
            {TAMANOS_PAGINA.map((t) => (
              <Option key={t} data-value={String(t)} selected={t === tamano}>{t}</Option>
            ))}
          </Select>
        </FlexBox>
      </FlexBox>

      {totalPaginas > 1 && (
        <FlexBox alignItems="Center" wrap="Wrap" style={{ gap: '0.25rem' }} role="navigation" aria-label="Paginación">
          <Button design="Transparent" icon="close-command-field" tooltip="Primera página" disabled={enPrimera} onClick={() => onPagina(1)} data-testid={`${testId}-primera`} />
          <Button design="Transparent" icon="navigation-left-arrow" tooltip="Página anterior" disabled={enPrimera} onClick={() => onPagina(pagina - 1)} data-testid={`${testId}-anterior`} />
          {paginasVisibles(pagina, totalPaginas).map((p, i) =>
            p === 'separador'
              ? <span key={`sep-${i}`} style={{ padding: '0 0.25rem' }}>…</span>
              : (
                <Button
                  key={p}
                  design={p === pagina ? 'Emphasized' : 'Transparent'}
                  onClick={() => onPagina(p)}
                  aria-current={p === pagina ? 'page' : undefined}
                  data-testid={`${testId}-pagina-${p}`}
                >
                  {p}
                </Button>
              ),
          )}
          <Button design="Transparent" icon="navigation-right-arrow" tooltip="Página siguiente" disabled={enUltima} onClick={() => onPagina(pagina + 1)} data-testid={`${testId}-siguiente`} />
          <Button design="Transparent" icon="open-command-field" tooltip="Última página" disabled={enUltima} onClick={() => onPagina(totalPaginas)} data-testid={`${testId}-ultima`} />
        </FlexBox>
      )}
    </FlexBox>
  )
}
