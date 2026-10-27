import type { Request, Response, NextFunction } from 'express';

// Actividad del backend para la actualización automática de la VM (27-10-2026):
// VigilaPOS.bat solo cambia de versión (corte de 10-20 s) si nadie está usando el
// POS. Se cuenta cualquier llamada a /api (el frontend no consulta en forma
// periódica), salvo la consulta del propio VigilaPOS (/api/sistema).

export const MINUTOS_SIN_ACTIVIDAD = 2;

let ultimaActividad = 0; // ms; 0 = sin llamadas desde que arrancó
let enCurso = 0;

export function registrarActividad(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/sistema')) {
    next();
    return;
  }
  enCurso++;
  ultimaActividad = Date.now();
  let terminada = false;
  const terminar = () => {
    if (terminada) return;
    terminada = true;
    enCurso = Math.max(0, enCurso - 1);
    ultimaActividad = Date.now();
  };
  res.on('finish', terminar);
  res.on('close', terminar);
  next();
}

export function actividadActual(): { ultimaActividad: number; enCurso: number } {
  return { ultimaActividad, enCurso };
}

/**
 * ¿Se puede cortar el POS para cambiar de versión? Solo si no hay llamadas en
 * curso (un pago o un pedido a medio camino con SAP) y no hubo actividad en los
 * últimos minutos. Devuelve el motivo si no se puede.
 */
export function motivoNoActualizar(
  a: { ultimaActividad: number; enCurso: number },
  ahora: number,
  minutos = MINUTOS_SIN_ACTIVIDAD,
): string | null {
  if (a.enCurso > 0) return `${a.enCurso} llamada(s) en curso`;
  if (a.ultimaActividad > 0) {
    const segundos = Math.floor((ahora - a.ultimaActividad) / 1000);
    if (segundos < minutos * 60) return `actividad hace ${segundos} s (se espera ${minutos} min sin uso)`;
  }
  return null;
}
