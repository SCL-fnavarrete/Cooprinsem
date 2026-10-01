import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Tope de números por búsqueda — evita que un rango mal tipeado (ej. 1 a
// 99999999) genere millones de series.
export const MAX_SERIES_POR_RANGO = 500;

// Largo máximo de numero_serie en pedido_posicion_serie (SERNR, VarChar(18)).
const LARGO_MAX_SERIE = 18;

interface ISerieValidada {
  numeroSerie: string;
  material: string;
  lote: string;
  centro: string;
  almacen: string;
  disponible: boolean;
  motivo?: string;
}

/**
 * POST /api/sap-series/validar
 *
 * Valida un rango de números de serie (Desde/Hasta) para un material — PE-23
 * Materiales seriados, ventana "Series" de Crear Pedido.
 *
 * TEMPORAL — DATOS DE PRUEBA: la API de validación de series de SAP aún no está
 * definida (pendiente de Arquitectura). Este endpoint imita la respuesta
 * esperada para poder construir y probar la pantalla:
 *   - Lo único real: el material se valida contra Sap_producto (definición del
 *     usuario, 2026-10-01).
 *   - Disponibilidad simulada: las series terminadas en 7 se marcan "no
 *     disponible"; lote GENERICO; centro = el del pedido; almacén B000.
 * Reemplazar la generación de series por la llamada a la API real de SAP
 * cuando esté disponible, manteniendo la forma de la respuesta.
 */
router.post('/validar', asyncHandler(async (req: Request, res: Response) => {
  const { material, centro, desde, hasta } = req.body ?? {};
  const desdeTxt = String(desde ?? '').trim();
  const hastaTxt = String(hasta ?? '').trim();

  if (!material || !desdeTxt || !hastaTxt) {
    res.status(400).json({ success: false, message: 'Faltan datos: material, desde y hasta son obligatorios' });
    return;
  }
  if (!/^\d+$/.test(desdeTxt) || !/^\d+$/.test(hastaTxt)) {
    res.status(400).json({ success: false, message: 'Desde y Hasta deben ser números de serie numéricos' });
    return;
  }
  if (desdeTxt.length > LARGO_MAX_SERIE || hastaTxt.length > LARGO_MAX_SERIE) {
    res.status(400).json({ success: false, message: `El número de serie no puede superar ${LARGO_MAX_SERIE} dígitos` });
    return;
  }

  const inicio = BigInt(desdeTxt);
  const fin = BigInt(hastaTxt);
  if (fin < inicio) {
    res.status(400).json({ success: false, message: 'Hasta debe ser mayor o igual que Desde' });
    return;
  }
  const cantidad = fin - inicio + 1n;
  if (cantidad > BigInt(MAX_SERIES_POR_RANGO)) {
    res.status(400).json({ success: false, message: `El rango no puede superar ${MAX_SERIES_POR_RANGO} números de serie (tiene ${cantidad})` });
    return;
  }

  // Material validado contra el maestro local de productos SAP (Sap_producto).
  const codigoMaterial = String(material).trim();
  const producto = await prisma.sapProducto.findFirst({ where: { Product: codigoMaterial } });
  if (!producto) {
    res.status(404).json({ success: false, message: `El material ${codigoMaterial} no existe en el maestro de productos SAP (Sap_producto)` });
    return;
  }

  // TEMPORAL — disponibilidad simulada (ver comentario del endpoint). Se
  // conserva el largo con ceros a la izquierda de lo que ingresó el usuario.
  const largo = Math.max(desdeTxt.length, hastaTxt.length);
  const series: ISerieValidada[] = [];
  for (let n = inicio; n <= fin; n++) {
    const numeroSerie = n.toString().padStart(largo, '0');
    const disponible = !numeroSerie.endsWith('7');
    series.push({
      numeroSerie,
      material: producto.Product,
      lote: 'GENERICO',
      centro: String(centro ?? 'D190'),
      almacen: 'B000',
      disponible,
      ...(disponible ? {} : { motivo: 'No disponible para entrega' }),
    });
  }

  res.json({ success: true, datosDePrueba: true, series });
}));

export default router;
