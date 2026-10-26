// Buscadores de clientes: "*" es comodín (cualquier texto entre medio, respetando el
// orden; el backend lo interpreta, ver server/src/routes/buscadorClientes.ts).
// El mínimo de caracteres para buscar se cuenta sin los "*".
export function largoBusqueda(texto: string): number {
  return texto.replace(/\*/g, '').trim().length
}

export const AYUDA_COMODIN = 'Use * como comodín, ej. Agricola*verde'
