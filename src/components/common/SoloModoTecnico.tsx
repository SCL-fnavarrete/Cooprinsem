import type { ReactNode } from 'react'
import { useModoTecnico } from '@/hooks/useModoTecnico'

// Muestra su contenido solo a usuarios en modo técnico (Arquitectura): cajas
// amarillas, JSON de SAP, URLs y opciones de prueba. Los usuarios de negocio
// no lo ven. Para un aviso nuevo, basta con envolverlo aquí.
export function SoloModoTecnico({ children }: { children: ReactNode }) {
  return useModoTecnico() ? <>{children}</> : null
}
