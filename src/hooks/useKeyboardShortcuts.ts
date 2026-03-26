import { useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  handler: () => void
  /** Si true, solo ejecuta si no hay input/textarea enfocado */
  skipInInputs?: boolean
}

/**
 * Hook centralizado para atajos de teclado.
 * Reemplaza los useEffect + addEventListener duplicados en PedidoPage y PagoDetallePage.
 *
 * Uso:
 *   useKeyboardShortcuts([
 *     { key: 'F9', handler: handleGrabar },
 *     { key: 'Escape', handler: handleCancelar },
 *     { key: 'F2', handler: () => inputRef.current?.focus() },
 *   ])
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (e.key === shortcut.key) {
          if (shortcut.skipInInputs) {
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
              continue
            }
          }
          e.preventDefault()
          shortcut.handler()
          return
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}
