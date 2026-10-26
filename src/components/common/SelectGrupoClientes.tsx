import { useEffect, useState } from 'react'
import { FlexBox, Label, Option, Select } from '@ui5/webcomponents-react'
import { getGruposBpClientes, type IGrupoBpClientes } from '@/services/api/clientes'
import {
  GRUPO_BP_DEFECTO,
  GRUPO_BP_TODOS,
  useGrupoBusquedaClientes,
} from '@/stores/grupoBusquedaClientes'

// Select "Grupo BP" de los buscadores de clientes (26-10-2026). Es para revisar
// con José si se mantiene el filtro solo ZNAC (14-10-2026) o se buscan otros grupos.
// Una sola elección para todos los buscadores (ver grupoBusquedaClientes).

export const LEYENDA_GRUPO_BP =
  'Filtra por el grupo BP del cliente en SAP. Por defecto solo ZNAC (pedido de José, 14-10-2026); ' +
  'los clientes de otros grupos no aparecen. Aplica a todos los buscadores de clientes.'

// Se consulta una vez por carga de la página: los grupos cambian solo con el sync
let gruposCache: Promise<{ total: number; grupos: IGrupoBpClientes[] }> | null = null

interface Props {
  /** Sin leyenda (espacios estrechos); la leyenda queda como tooltip */
  compacto?: boolean
}

export function SelectGrupoClientes({ compacto = false }: Props) {
  const [grupo, setGrupo] = useGrupoBusquedaClientes()
  const [datos, setDatos] = useState<{ total: number; grupos: IGrupoBpClientes[] } | null>(null)

  useEffect(() => {
    let vigente = true
    gruposCache ??= getGruposBpClientes().catch((e) => {
      gruposCache = null
      throw e
    })
    gruposCache.then((d) => { if (vigente) setDatos(d) }).catch(() => { if (vigente) setDatos(null) })
    return () => { vigente = false }
  }, [])

  const cantidad = (g: string) => datos?.grupos.find((x) => x.grupo === g)?.total
  const etiqueta = (texto: string, n?: number) => (n === undefined ? texto : `${texto} (${n})`)
  const otros = (datos?.grupos ?? []).filter((g) => g.grupo && g.grupo !== GRUPO_BP_DEFECTO)
  // Si el grupo elegido no viene en la lista (o aún no carga), igual se muestra
  const elegidoFuera = grupo !== GRUPO_BP_DEFECTO && grupo !== GRUPO_BP_TODOS && !otros.some((g) => g.grupo === grupo)

  return (
    <div style={{ display: 'grid', gap: '0.125rem' }} title={LEYENDA_GRUPO_BP}>
      <FlexBox alignItems="Center" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <Label>Grupo BP:</Label>
        <Select
          accessibleName="Grupo BP de los clientes"
          data-testid="select-grupo-bp"
          style={{ width: '14rem' }}
          onChange={(e) => {
            const id = (e.detail?.selectedOption as HTMLElement | undefined)?.dataset?.id
            if (id) setGrupo(id)
          }}
        >
          <Option data-id={GRUPO_BP_DEFECTO} selected={grupo === GRUPO_BP_DEFECTO}>
            {etiqueta(`Solo ${GRUPO_BP_DEFECTO}`, cantidad(GRUPO_BP_DEFECTO))}
          </Option>
          <Option data-id={GRUPO_BP_TODOS} selected={grupo === GRUPO_BP_TODOS}>
            {etiqueta('Todos los grupos', datos?.total)}
          </Option>
          {otros.map((g) => (
            <Option key={g.grupo} data-id={g.grupo} selected={grupo === g.grupo}>
              {etiqueta(`Solo ${g.grupo}`, g.total)}
            </Option>
          ))}
          {elegidoFuera && (
            <Option data-id={grupo} selected>{`Solo ${grupo}`}</Option>
          )}
        </Select>
      </FlexBox>
      {!compacto && (
        <Label wrappingType="Normal" style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>
          {LEYENDA_GRUPO_BP}
        </Label>
      )}
    </div>
  )
}
