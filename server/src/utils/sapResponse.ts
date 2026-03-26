import { Response } from 'express';

/**
 * Wrapper para respuestas en formato SAP OData: { d: { results: [...] } }
 * Centraliza el formato que antes se repetía en 10+ rutas.
 */
export function sapResults(res: Response, data: unknown[]) {
  return res.json({ d: { results: data } });
}

/**
 * Respuesta SAP para un objeto individual: { d: { ...data } }
 */
export function sapSingle(res: Response, data: Record<string, unknown>) {
  return res.json({ d: data });
}

/**
 * Respuesta SAP para creación exitosa (201): { d: { ...data } }
 */
export function sapCreated(res: Response, data: Record<string, unknown>) {
  return res.status(201).json({ d: data });
}
