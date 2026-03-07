import { Router, Request, Response } from 'express';

const router = Router();

// Usuarios de prueba hardcodeados para el POC
const USUARIOS_POC = [
  { usuario: 'admin', password: '1234', rolCod: 1, nombre: 'Admin Sistema', sucursal: 'D190' },
  { usuario: 'vendedor', password: '1234', rolCod: 2, nombre: 'Juan Vendedor', sucursal: 'D190' },
  { usuario: 'cajero', password: '1234', rolCod: 3, nombre: 'María Cajero', sucursal: 'D190' },
  { usuario: 'consulta', password: '1234', rolCod: 4, nombre: 'Carlos Consulta', sucursal: 'D190' },
];

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { usuario, password } = req.body as { usuario?: string; password?: string };

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  const found = USUARIOS_POC.find(
    (u) => u.usuario === usuario && u.password === password
  );

  if (!found) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  // Retorna datos del usuario (sin la contraseña)
  res.json({
    id: found.usuario,
    nombre: found.nombre,
    rolCod: found.rolCod,
    sucursal: found.sucursal,
  });
});

export default router;
