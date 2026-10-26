import { useSyncExternalStore } from 'react'

// Grupo BP con que buscan TODOS los buscadores de clientes (26-10-2026).
// Por defecto ZNAC (José Castillo, 14-10-2026); "TODOS" = sin filtro. La elección
// es una sola para toda la aplicación (cambiarla en un buscador aplica a los
// demás) y se mantiene durante la sesión de la pestaña.

export const GRUPO_BP_DEFECTO = 'ZNAC'
export const GRUPO_BP_TODOS = 'TODOS'

const CLAVE = 'pos.grupoBusquedaClientes'

function leerInicial(): string {
  try {
    return sessionStorage.getItem(CLAVE) || GRUPO_BP_DEFECTO
  } catch {
    return GRUPO_BP_DEFECTO
  }
}

let grupoActual = leerInicial()
const suscriptores = new Set<() => void>()

export function getGrupoBusquedaClientes(): string {
  return grupoActual
}

export function setGrupoBusquedaClientes(grupo: string): void {
  if (grupo === grupoActual) return
  grupoActual = grupo
  try {
    sessionStorage.setItem(CLAVE, grupo)
  } catch {
    // Sin sessionStorage la elección dura hasta recargar la página
  }
  suscriptores.forEach((fn) => fn())
}

function suscribir(fn: () => void): () => void {
  suscriptores.add(fn)
  return () => suscriptores.delete(fn)
}

export function useGrupoBusquedaClientes(): [string, (grupo: string) => void] {
  const grupo = useSyncExternalStore(suscribir, getGrupoBusquedaClientes)
  return [grupo, setGrupoBusquedaClientes]
}
