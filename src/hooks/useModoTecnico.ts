import { useUser } from '@/stores/userContext'

/**
 * Modo técnico del usuario logueado (columna usuarios.modo_tecnico, se activa
 * en Admin > Usuarios): true = ve las cajas amarillas, los JSON de SAP y las
 * opciones de prueba (usuarios de Arquitectura); false = vista de negocio.
 */
export function useModoTecnico(): boolean {
  const { usuario } = useUser()
  return usuario?.modoTecnico === true
}
