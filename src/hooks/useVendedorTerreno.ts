import { useEffect, useState } from 'react'
import { useUser } from '@/stores/userContext'
import { getVendedorTerreno, type IVendedorTerreno } from '@/services/api/sapPedidos'

/**
 * Datos del usuario logueado para la venta de combustible (ZV15): si es
 * vendedor de terreno (canal VT) y su bodega móvil. null mientras carga o si
 * la consulta falla (en ese caso no se ofrece "Venta Combustible"). El backend
 * lo vuelve a validar al simular y al crear.
 */
export function useVendedorTerreno(): IVendedorTerreno | null {
  const { usuario } = useUser()
  const [datos, setDatos] = useState<IVendedorTerreno | null>(null)

  useEffect(() => {
    if (!usuario?.id) {
      setDatos(null)
      return
    }
    let cancelado = false
    getVendedorTerreno(usuario.id)
      .then((d) => { if (!cancelado) setDatos(d) })
      .catch(() => { if (!cancelado) setDatos(null) })
    return () => { cancelado = true }
  }, [usuario?.id])

  return datos
}
