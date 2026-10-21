import { useEffect, useState, type RefObject } from 'react'

/**
 * true cuando el elemento ya no se ve porque el usuario bajó (quedó arriba,
 * fuera de la pantalla). Sirve para mostrar un resumen flotante de un
 * formulario de búsqueda mientras se recorre la tabla de resultados
 * (ver ResumenFlotante). Si quedó fuera por abajo, devuelve false.
 *
 * IntersectionObserver considera el recorte de los contenedores con scroll
 * (ej. el <main> de CajaPage). Sin soporte en el navegador (o en jsdom)
 * devuelve siempre false: la pantalla queda como sin resumen.
 */
export function useFueraDeVista(ref: RefObject<Element | null>, activo = true): boolean {
  const [fueraDeVista, setFueraDeVista] = useState(false)

  useEffect(() => {
    const elemento = ref.current
    if (!activo || !elemento || typeof IntersectionObserver === 'undefined') {
      setFueraDeVista(false)
      return
    }
    const observador = new IntersectionObserver(([entrada]) => {
      if (!entrada) return
      const alto = entrada.rootBounds?.height ?? window.innerHeight
      // Oculto y por encima de la mitad de la pantalla = el usuario bajó.
      setFueraDeVista(!entrada.isIntersecting && entrada.boundingClientRect.top < alto / 2)
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ref, activo])

  return fueraDeVista
}
