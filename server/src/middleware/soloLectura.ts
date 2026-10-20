import { Request, Response, NextFunction } from 'express';

// Perfil Visualizador (rol 5, 20-10-2026): ve todo lo que ve el Administrador
// pero NO graba, actualiza ni borra. El frontend envía el usuario logueado en
// el encabezado X-POS-Usuario (src/services/api/encabezadoUsuario.ts); aquí se
// busca su rol en la BD y se rechaza toda escritura salvo las excepciones.
// Ojo: mientras el POS no tenga sesión con token, el encabezado se puede
// falsificar a mano; sirve para usuarios que usan la aplicación.

export const ROL_VISUALIZADOR = 5;
export const ENCABEZADO_USUARIO = 'x-pos-usuario';

const METODOS_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// POST que solo consultan o simulan (no graban): permitidos al Visualizador.
const POST_DE_CONSULTA = new Set([
  '/api/auth/login',
  '/api/sap-cta-cte/pagos/preview',   // vista previa del pago (no contabiliza)
  '/api/sap-pedidos/precios',         // consulta de precios de la grilla
  '/api/sap-pedidos/simular',         // simulación del pedido
  '/api/sap-series/validar',          // validación de series
  '/api/anticipos/buscar',            // búsqueda de anticipos
]);

// Lo único que puede cambiar en su propio usuario (Admin > Usuarios).
const CAMPOS_PROPIO_PERFIL = ['rut', 'nombreCompleto', 'email'];

const MENSAJE = 'Perfil Visualizador: solo lectura. No puede grabar, actualizar ni borrar información.';

// Rol por usuario, en memoria 1 minuto (evita una consulta por cada llamada).
const cacheRoles = new Map<string, { rol: number | null; id: number | null; expira: number }>();

async function datosUsuario(username: string): Promise<{ rol: number | null; id: number | null }> {
  const clave = username.toLowerCase();
  const enCache = cacheRoles.get(clave);
  if (enCache && enCache.expira > Date.now()) return enCache;
  // Import diferido: permite testear el middleware sin BD (ver crearSoloLectura)
  const { prisma } = await import('../lib/prisma');
  const u = await prisma.usuario.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true, rol_cod: true },
  });
  const datos = { rol: u?.rol_cod ?? null, id: u?.id ?? null, expira: Date.now() + 60_000 };
  cacheRoles.set(clave, datos);
  return datos;
}

/** Limpia la caché (tests o tras cambiar el rol de un usuario). */
export function limpiarCacheRoles(): void {
  cacheRoles.clear();
}

type BuscarUsuario = (username: string) => Promise<{ rol: number | null; id: number | null }>;

/** Middleware con la búsqueda de usuario inyectable (para testearlo sin BD). */
export function crearSoloLectura(buscarUsuario: BuscarUsuario) {
  return async function soloLectura(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!METODOS_ESCRITURA.has(req.method)) return next();
  const ruta = req.path.replace(/\/+$/, '');
  if (POST_DE_CONSULTA.has(ruta)) return next();

  const username = String(req.headers[ENCABEZADO_USUARIO] ?? '').trim();
  if (!username) return next();  // sin usuario identificado: comportamiento previo

  let datos: { rol: number | null; id: number | null };
  try {
    datos = await buscarUsuario(username);
  } catch {
    return next();  // sin BD: no se bloquea por esto (las rutas fallarán por su cuenta)
  }
  if (datos.rol !== ROL_VISUALIZADOR) return next();

  // Su propio usuario: solo nombre, RUT y email (no rol, estado, sucursal ni modo técnico)
  const propio = /^\/api\/admin\/usuarios\/(\d+)$/.exec(ruta);
  if (req.method === 'PUT' && propio && Number(propio[1]) === datos.id) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    req.body = Object.fromEntries(Object.entries(body).filter(([k]) => CAMPOS_PROPIO_PERFIL.includes(k)));
    return next();
  }

  res.status(403).json({ success: false, soloLectura: true, message: MENSAJE, error: MENSAJE });
  };
}

export const soloLectura = crearSoloLectura(datosUsuario);
