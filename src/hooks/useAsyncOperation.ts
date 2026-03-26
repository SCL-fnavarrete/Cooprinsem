import { useState, useCallback } from 'react'

interface UseAsyncOperationReturn<T> {
  execute: (...args: unknown[]) => Promise<T>
  isLoading: boolean
  error: string | null
  reset: () => void
}

/**
 * Hook genérico para operaciones asíncronas con loading/error.
 * Reemplaza el patrón duplicado de:
 *   const [isLoading, setIsLoading] = useState(false)
 *   const [error, setError] = useState<string|null>(null)
 *   try { setIsLoading(true); ... } catch { setError(msg) } finally { setIsLoading(false) }
 *
 * Uso:
 *   const { execute: grabar, isLoading, error } = useAsyncOperation(
 *     async () => { return await crearPedido(pedido) }
 *   )
 */
export function useAsyncOperation<T>(
  operation: (...args: unknown[]) => Promise<T>,
  errorPrefix = 'Error'
): UseAsyncOperationReturn<T> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (...args: unknown[]): Promise<T> => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await operation(...args)
        return result
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : `${errorPrefix} desconocido`
        setError(msg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [operation, errorPrefix]
  )

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return { execute, isLoading, error, reset }
}
