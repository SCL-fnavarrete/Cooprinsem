import { useEffect, useState } from 'react'
import { getUnidadesMedida, type IUnidadMedida } from '@/services/api/posMaestros'

// Maestro de unidades de medida (19 filas): se consulta una vez y lo comparten la
// grilla y el buscador de artículos. Si falla, se reintenta en el próximo montaje
// y mientras tanto se muestran los códigos.
let cache: Promise<IUnidadMedida[]> | null = null

function cargar(): Promise<IUnidadMedida[]> {
  cache ??= getUnidadesMedida().catch((e) => { cache = null; throw e })
  return cache
}

/** Solo para tests: vuelve a consultar el maestro. */
export function reiniciarCacheUnidadesMedida() {
  cache = null
}

export function useUnidadesMedida(): IUnidadMedida[] {
  const [unidades, setUnidades] = useState<IUnidadMedida[]>([])
  useEffect(() => {
    let vigente = true
    cargar().then((lista) => { if (vigente) setUnidades(lista) }).catch(() => {})
    return () => { vigente = false }
  }, [])
  return unidades
}
