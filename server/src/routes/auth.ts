import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import db from '../database/localDb';
import { hayConexion } from '../database/syncService';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { usuario, password } = req.body as { usuario?: string; password?: string };

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  try {
    const conectado = await hayConexion();

    if (conectado) {
      // Login contra Supabase (online)
      console.log('Login online contra Supabase...');
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
        modo: 'online',
      });

    } else {
      // Login contra SQLite local (offline)
      console.log('Login offline contra SQLite local...');
      const found = db
        .prepare('SELECT * FROM usuarios WHERE username = ? AND password = ? AND estado = 1')
        .get(usuario, password) as {
          username: string;
          nombre_completo: string;
          rol_cod: number;
          sucursal_id: string;
          IdVendedor?: string;
        } | undefined;

      if (!found) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      return res.json({
        id: found.username,
        nombre: found.nombre_completo,
        rolCod: found.rol_cod,
        sucursal: found.sucursal_id,
        idVendedor: found.IdVendedor ?? undefined,
        modo: 'offline',
      });
    }

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;