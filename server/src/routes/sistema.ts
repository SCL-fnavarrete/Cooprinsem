import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { actividadActual, motivoNoActualizar, MINUTOS_SIN_ACTIVIDAD } from '../middleware/actividad';

const router = Router();

// GET /api/sistema/actualizacion — lo consulta VigilaPOS.bat antes de traer una
// versión nueva desde git (27-10-2026). `actualizar` = S solo si el parámetro
// ACTUALIZACION_AUTOMATICA_VM está en S (Admin > Parámetros) y nadie está usando
// el POS. No cuenta como actividad (ver middleware/actividad.ts).
router.get('/actualizacion', asyncHandler(async (_req, res) => {
  let parametro = '';
  try {
    const filas = await prisma.$queryRaw<{ valor: string }[]>`SELECT valor FROM pos_parametro_general WHERE clave = 'ACTUALIZACION_AUTOMATICA_VM'`;
    parametro = filas[0]?.valor?.trim().toUpperCase() ?? '';
  } catch {
    parametro = '';
  }
  const actividad = actividadActual();
  const ocupado = motivoNoActualizar(actividad, Date.now());
  const motivo = parametro !== 'S'
    ? 'parámetro ACTUALIZACION_AUTOMATICA_VM distinto de S'
    : ocupado;
  res.json({
    actualizar: motivo ? 'N' : 'S',
    motivo: motivo ?? '',
    parametro,
    solicitudesEnCurso: actividad.enCurso,
    segundosSinActividad: actividad.ultimaActividad ? Math.floor((Date.now() - actividad.ultimaActividad) / 1000) : null,
    minutosRequeridos: MINUTOS_SIN_ACTIVIDAD,
  });
}));

export default router;
