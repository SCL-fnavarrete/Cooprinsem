import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/auth/login
// Solo contra la PostgreSQL central: sin SQLite local ni login offline (ADR-045,
// Arquitectura 26-10-2026). Si la BD no responde, el login falla con 503.
router.post('/login', async (req: Request, res: Response) => {
  const { usuario, password } = req.body as { usuario?: string; password?: string };

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  try {
    const found = await prisma.usuario.findFirst({
      where: { username: usuario, password: password, estado: 1 },
      include: { rol: true },
    });

    if (!found) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    return res.json({
      id: found.username,
      nombre: found.nombre_completo,
      rolCod: found.rol_cod,
      sucursal: found.sucursal_id,
      idVendedor: found.IdVendedor ?? undefined,
      // Ve avisos, JSON y opciones de prueba (Admin > Usuarios > Modo técnico)
      modoTecnico: found.modo_tecnico,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(503).json({ error: 'No hay conexión con la base de datos del POS. Intente nuevamente en unos minutos.' });
  }
});

export default router;
