import { useUser } from '@/stores/userContext'
import { ROLES } from '@/config/sap'

/** Texto para los botones de escritura deshabilitados del perfil Visualizador. */
export const TEXTO_SOLO_LECTURA = 'Perfil Visualizador: solo lectura'

/**
 * Perfil Visualizador (rol 5): ve todo lo del Administrador pero no graba,
 * actualiza ni borra. La protección real está en el backend
 * (middleware/soloLectura.ts); esto solo deshabilita los botones.
 */
export function useSoloLectura(): boolean {
  const { usuario } = useUser()
  return usuario?.rolCod === ROLES.VISUALIZADOR
}
