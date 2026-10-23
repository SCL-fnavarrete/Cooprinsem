import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { getMandante } from './posMaestros';
import {
  SERVICIO_SERIES, ENTIDAD_SERIES, ADVERTENCIA_SUCURSAL, tramosPorLargo, filtroTramo, interpretarSeriesSap,
  mensajeErrorSeriesSap, type IFilaSerieSap,
} from './sapSeriesSap';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function leerParametro(clave: string): Promise<string> {
  try {
    const filas = await prisma.$queryRaw<{ valor: string }[]>`SELECT valor FROM pos_parametro_general WHERE clave = ${clave}`;
    return filas[0]?.valor?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Filas de ZCDS_ZPOS_SERIES para el rango (una consulta por tramo de igual largo).
 * Lanza con el mensaje para el vendedor si SAP falla.
 */
async function consultarSeriesSap(material: string, inicio: bigint, fin: bigint): Promise<{ filas: IFilaSerieSap[]; urls: string[] }> {
  const { SAP_BASE_URL, SAP_USER, SAP_PASSWORD } = process.env;
  if (!SAP_BASE_URL || !SAP_USER || !SAP_PASSWORD) throw new Error('Faltan variables de entorno SAP (SAP_BASE_URL, SAP_USER, SAP_PASSWORD)');
  const host = SAP_BASE_URL.replace(/\/sap\/opu\/odata\/sap\/.*$/, '');
  const base = `${host}/sap/opu/odata/sap/${SERVICIO_SERIES}/${ENTIDAD_SERIES}`;
  const mandante = await getMandante();
  const filas: IFilaSerieSap[] = [];
  const urls: string[] = [];
  for (const tramo of tramosPorLargo(inicio, fin)) {
    const params = new URLSearchParams({
      $filter: filtroTramo(material, tramo),
      $select: 'Material,NumeroSerie,Disponible,CodigoEstatus',
      $top: '5000',
      $format: 'json',
    });
    const url = `${base}?${params.toString()}`;
    urls.push(url);
    try {
      const r = await axios.get(url, {
        httpsAgent,
        timeout: 30_000,
        headers: {
          Accept: 'application/json',
          'sap-client': mandante,
          'sap-language': 'ES',
          Authorization: `Basic ${Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64')}`,
        },
      });
      filas.push(...((r.data?.d?.results ?? []) as IFilaSerieSap[]));
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { error?: { message?: { value?: string } } } } };
      throw new Error(mensajeErrorSeriesSap(e.response?.status, e.response?.data?.error?.message?.value));
    }
  }
  return { filas, urls };
}

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
 * Desde el 23-10-2026 consulta SAP (ZCDS_ZPOS_SERIES_CDS, ver sapSeriesSap.ts):
 * disponible = Disponible "X" (estatus I0184 ALMA). SAP no informa lote, centro
 * ni almacén: se responde una advertencia (no se valida la sucursal).
 * Parámetro SERIES_SAP_HABILITADO = 'N' vuelve a los datos simulados (las series
 * terminadas en 7 "no disponibles"), por si el servicio de SAP falla.
 * El material se valida antes contra Sap_producto (definición del usuario, 2026-10-01).
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

  const largo = Math.max(desdeTxt.length, hastaTxt.length);

  if ((await leerParametro('SERIES_SAP_HABILITADO')).toUpperCase() !== 'N') {
    try {
      const { filas, urls } = await consultarSeriesSap(producto.Product, inicio, fin);
      const series = interpretarSeriesSap({ inicio, fin, largoIngresado: largo, material: producto.Product, centro: String(centro ?? 'D190'), filas });
      res.json({ success: true, datosDePrueba: false, fuente: 'sap', advertencia: ADVERTENCIA_SUCURSAL, consultas: urls, series });
    } catch (err) {
      res.status(502).json({ success: false, message: err instanceof Error ? err.message : 'Error al consultar las series en SAP' });
    }
    return;
  }

  // Datos simulados (SERIES_SAP_HABILITADO = 'N'). Se conserva el largo con
  // ceros a la izquierda de lo que ingresó el usuario.
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

  res.json({ success: true, datosDePrueba: true, fuente: 'simulado', series });
}));

export default router;
