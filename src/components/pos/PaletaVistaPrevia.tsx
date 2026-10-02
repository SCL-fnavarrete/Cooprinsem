import { useState, useCallback, useEffect, type CSSProperties } from 'react'
import { Button, FlexBox, Label, Option, Select, Tag } from '@ui5/webcomponents-react'
import { setTheme } from '@ui5/webcomponents-base/dist/config/Theme.js'

// TEMPORAL — vista previa de paletas de colores para que el cliente elija una
// (2026-10-02). Cuando se confirme la paleta definitiva: aplicarla de forma
// fija (tema global o variables) y eliminar este selector.

const TEMA_ORIGINAL = 'sap_horizon'

interface IPaleta {
  id: string
  nombre: string
  tema: string
  // Variables de tema UI5 sobrescritas solo dentro del contenedor de la página.
  variables?: Record<string, string>
}

// Opción D: SAP Horizon con tono propio. Colores PROVISORIOS (gris azulado +
// verde) hasta tener los colores de marca de Cooprinsem.
const VARIABLES_TONO_PROPIO: Record<string, string> = {
  '--sapBackgroundColor': '#dde3ea',
  '--sapGroup_ContentBackground': '#ffffff',
  '--sapGroup_ContentBorderColor': '#9aa8b8',
  '--sapGroup_TitleBorderColor': '#9aa8b8',
  // Texto en negro (#000000) a pedido del cliente (2026-10-02). Los encabezados
  // de tabla y el botón principal mantienen texto blanco: van sobre fondo oscuro.
  '--sapTextColor': '#000000',
  '--sapTitleColor': '#000000',
  '--sapContent_LabelColor': '#000000',
  '--sapGroup_TitleTextColor': '#000000',
  '--sapList_TextColor': '#000000',
  '--sapField_TextColor': '#000000',
  '--sapContent_ForegroundTextColor': '#000000',
  '--sapContent_NonInteractiveIconColor': '#1a1a1a',
  // Placeholders muy oscuros pero no negros: deben distinguirse del texto ingresado.
  '--sapField_PlaceholderTextColor': '#3a3a3a',
  // Letra más gruesa: la fuente base pasa de "72" (regular, delgada) a
  // "72-Semibold" (ya cargada por UI5) para que el texto se vea más oscuro.
  '--sapFontFamily': '"72-Semibold", "72-Semiboldfull", "72", "72full", Arial, Helvetica, sans-serif',
  '--sapList_HeaderBackground': '#34495e',
  '--sapList_HeaderTextColor': '#ffffff',
  '--sapList_HeaderBorderColor': '#34495e',
  '--sapList_BorderColor': '#c3ccd6',
  '--sapList_AlternatingBackground': '#f3f5f8',
  '--sapField_BorderColor': '#7f8c9b',
  '--sapBrandColor': '#2e7d32',
  '--sapButton_Emphasized_Background': '#2e7d32',
  '--sapButton_Emphasized_BorderColor': '#2e7d32',
  '--sapButton_Emphasized_Hover_Background': '#256628',
  '--sapButton_Emphasized_Hover_BorderColor': '#256628',
}

export const PALETAS: IPaleta[] = [
  { id: 'D', nombre: 'D. Horizon con tono propio (recomendada)', tema: 'sap_horizon', variables: VARIABLES_TONO_PROPIO },
  { id: 'A', nombre: 'A. SAP Quartz claro', tema: 'sap_fiori_3' },
  { id: 'B', nombre: 'B. SAP Horizon oscuro', tema: 'sap_horizon_dark' },
  { id: 'C', nombre: 'C. SAP Quartz oscuro', tema: 'sap_fiori_3_dark' },
  { id: 'E', nombre: 'E. Alto contraste (negro)', tema: 'sap_horizon_hcb' },
  { id: 'actual', nombre: 'Actual — SAP Horizon claro', tema: TEMA_ORIGINAL },
]

// Registra los temas adicionales la primera vez que se usan (cada tema se
// descarga recién al aplicarlo) — la app no carga temas que no usa.
let temasRegistrados: Promise<unknown> | null = null
function registrarTemas() {
  temasRegistrados ??= Promise.all([
    import('@ui5/webcomponents-theming/dist/generated/json-imports/Themes.js'),
    import('@ui5/webcomponents/dist/generated/json-imports/Themes.js'),
    import('@ui5/webcomponents-fiori/dist/generated/json-imports/Themes.js'),
  ])
  return temasRegistrados
}

/**
 * Estado de la vista previa de paleta. Devuelve el estilo para el contenedor
 * de la página (variables de la opción D + fondo del tema). Los temas A/B/C/E
 * son globales de UI5 (cambian también la barra superior y el menú); al salir
 * de la página se restaura el tema original.
 */
export function usePaletaVistaPrevia() {
  const [aplicada, setAplicada] = useState<IPaleta>(PALETAS.find((p) => p.id === 'actual')!)
  const [isAplicando, setIsAplicando] = useState(false)

  const aplicar = useCallback(async (id: string) => {
    const paleta = PALETAS.find((p) => p.id === id)
    if (!paleta) return
    setIsAplicando(true)
    try {
      if (paleta.tema !== TEMA_ORIGINAL) await registrarTemas()
      await setTheme(paleta.tema)
      setAplicada(paleta)
    } finally {
      setIsAplicando(false)
    }
  }, [])

  // Al salir de la página: volver al tema original de la app.
  useEffect(() => () => { void setTheme(TEMA_ORIGINAL) }, [])

  const estiloContenedor = {
    ...(aplicada.variables ?? {}),
    background: 'var(--sapBackgroundColor)',
    color: 'var(--sapTextColor)',
  } as CSSProperties

  return { aplicada, aplicar, isAplicando, estiloContenedor }
}

interface SelectorPaletaProps {
  aplicada: IPaleta
  isAplicando: boolean
  onAplicar: (id: string) => void
}

export function SelectorPaleta({ aplicada, isAplicando, onAplicar }: SelectorPaletaProps) {
  // Opción D preseleccionada (primera de la lista); se aplica recién con "Aplicar".
  const [seleccion, setSeleccion] = useState(PALETAS[0].id)

  return (
    <FlexBox
      wrap="Wrap"
      alignItems="Center"
      style={{
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        border: '1px dashed var(--sapField_BorderColor)',
        borderRadius: '0.5rem',
        background: 'var(--sapGroup_ContentBackground)',
      }}
      data-testid="selector-paleta"
    >
      <Tag colorScheme="Set2">Vista previa</Tag>
      <Label>Paleta de colores:</Label>
      <Select
        onChange={(e) => setSeleccion(e.detail.selectedOption?.getAttribute('data-value') ?? PALETAS[0].id)}
        style={{ minWidth: '18rem' }}
        aria-label="Paleta de colores"
      >
        {PALETAS.map((p) => (
          <Option key={p.id} data-value={p.id} selected={p.id === seleccion}>{p.nombre}</Option>
        ))}
      </Select>
      <Button design="Emphasized" onClick={() => onAplicar(seleccion)} disabled={isAplicando}>
        {isAplicando ? 'Aplicando…' : 'Aplicar'}
      </Button>
      <Label style={{ color: 'var(--sapContent_LabelColor)' }}>
        Aplicada: {aplicada.nombre}
      </Label>
    </FlexBox>
  )
}
