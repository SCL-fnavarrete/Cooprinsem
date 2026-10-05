import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Representa un registro de stock tal como lo devuelve el servicio OData
 * personalizado ZUI_STOCK_SRV (entidad MaterialStockSet) del equipo SAP de
 * Cooprinsem. Enriquece los datos estándar con descripción del material y
 * nombre del centro.
 */
export interface SapStockRecord {
  Material: string;  // Código del material
  Plant: string;  // Código del centro
  StorageLocation: string;  // Código del almacén
  MaterialDescription: string;  // Descripción del material
  PlantName: string;  // Nombre del centro (ej: "Osorno")
  UnrestrictedStock: string;  // Stock libre disponible para venta
  QualityInspectionStock: string;  // Stock en inspección de calidad
  BlockedStock: string;  // Stock bloqueado (no disponible)
  BaseUnit: string;  // Unidad de medida base
}

/**
 * Parámetros de filtro que puede enviar el frontend al consultar stock.
 */
export interface StockQueryParams {
  material?: string;
  plant?: string;
  storageLocation?: string;
  soloConStock?: boolean;  // Si true, solo retorna registros con UnrestrictedStock > 0 (filtrado en el backend)
  top?: number;
  buscarTexto?: string;  // Busca por código o descripción (filtrado server-side)
}

// ─── Agente HTTPS ─────────────────────────────────────────────────────────────

/**
 * Agente que permite certificados autofirmados.
 * Necesario en entornos SAP S/4HANA private on-premise.
 */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Formato de material ──────────────────────────────────────────────────────

// Largo del número de material SAP (MATNR).
const LARGO_MATNR = 18;

/**
 * ZUI_STOCK_SRV compara el material de forma exacta y en formato interno SAP:
 * los materiales numéricos van con ceros a la izquierda hasta 18 dígitos
 * ("14700006" → "000000000014700006"). Sin esto, el filtro no encuentra nada
 * (confirmado en vivo 2026-10-05). Los materiales alfanuméricos van tal cual.
 */
export function normalizarMaterialSap(material: string): string {
  const limpio = material.trim();
  return /^\d+$/.test(limpio) ? limpio.padStart(LARGO_MATNR, '0') : limpio.toUpperCase();
}

// Material para mostrar: sin ceros a la izquierda (como en el resto del POS).
export function materialSinCeros(material: string): string {
  return /^\d+$/.test(material) ? material.replace(/^0+(?=\d)/, '') : material;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Consulta el stock de materiales usando el servicio personalizado ZUI_STOCK_SRV de Cooprinsem.
 * Esta API devuelve datos enriquecidos: descripción del material, nombre del centro
 * y los tres tipos de stock separados (libre, inspección y bloqueado).
 *
 * Actúa como proxy seguro: las credenciales SAP nunca se exponen al frontend.
 *
 * @param params - Filtros opcionales para la consulta
 * @returns Lista de registros de stock
 */
export async function consultarStock(params: StockQueryParams): Promise<SapStockRecord[]> {
  const { SAP_BASE_URL, SAP_USER, SAP_PASSWORD } = process.env;

  if (!SAP_BASE_URL || !SAP_USER || !SAP_PASSWORD) {
    throw new Error('Faltan variables de entorno SAP (SAP_BASE_URL, SAP_USER, SAP_PASSWORD)');
  }

  // Construir la URL base para ZUI_STOCK_SRV a partir del host del servidor SAP
  const sapHost = SAP_BASE_URL.replace('/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV', '');
  const zStockUrl = `${sapHost}/sap/opu/odata/sap/ZUI_STOCK_SRV`;

  // Construir filtros OData según los parámetros recibidos
  const filtros: string[] = [];

  if (params.material) {
    filtros.push(`Material eq '${normalizarMaterialSap(params.material)}'`);
  }
  if (params.plant) {
    filtros.push(`Plant eq '${params.plant}'`);
  }
  if (params.storageLocation) {
    filtros.push(`StorageLocation eq '${params.storageLocation}'`);
  }
  // soloConStock NO se envía a SAP: ZUI_STOCK_SRV ignora `UnrestrictedStock gt 0`
  // (en D190 devolvía 318 registros con y sin el filtro, 309 con stock 0 —
  // confirmado en vivo 2026-10-05). Se filtra más abajo, en el backend.

  // Construir el header Authorization en Base64.
  // IMPORTANTE: en el .env la contraseña debe ir entre comillas si contiene
  // caracteres especiales como #, ya que dotenv los interpreta como comentario.
  const credenciales = Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64');

  // Construir la URL manualmente sin codificar los $ para que SAP los procese correctamente.
  // URLSearchParams codifica $ como %24 lo que hace que SAP ignore los parámetros OData.
  const select = 'Material,MaterialDescription,Plant,PlantName,StorageLocation,UnrestrictedStock,QualityInspectionStock,BlockedStock,BaseUnit';
  const top = String(params.top ?? 100);

  const mandante = await getMandante();
  let urlCompleta = `${zStockUrl}/MaterialStockSet?$select=${select}&$top=${top}&$format=json&sap-client=${mandante}`;

  if (filtros.length > 0) {
    urlCompleta += `&$filter=${encodeURIComponent(filtros.join(' and '))}`;
  }

  const response = await axios.get(urlCompleta, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es',
      'sap-client': mandante,
      Authorization: `Basic ${credenciales}`,
    },
    httpsAgent,
  });

  // La API OData de SAP envuelve los resultados en d.results
  const todos: SapStockRecord[] = response.data?.d?.results ?? [];
  const resultados = params.soloConStock
    ? todos.filter((r) => Number(r.UnrestrictedStock) > 0)
    : todos;

  // Filtrado server-side por texto (código o descripción)
  // Se hace aquí porque el servicio custom ZUI_STOCK_SRV puede no soportar substringof
  if (params.buscarTexto) {
    const texto = params.buscarTexto.toLowerCase();
    return resultados.filter(
      (r) =>
        r.Material.toLowerCase().includes(texto) ||
        r.MaterialDescription.toLowerCase().includes(texto)
    );
  }

  return resultados;
}