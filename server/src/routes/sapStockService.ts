import axios from 'axios';
import https from 'https';
import { getMandante } from './posMaestros';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Representa un registro de stock tal como lo devuelve la API personalizada
 * ZSB_STOCK desarrollada por el equipo SAP de Cooprinsem.
 * Esta API enriquece los datos estándar con descripción del material y nombre del centro.
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
  soloConStock?: boolean;  // Si true, solo retorna materiales con UnrestrictedStock > 0
  top?: number;
  buscarTexto?: string;  // Busca por código o descripción (filtrado server-side)
}

// ─── Agente HTTPS ─────────────────────────────────────────────────────────────

/**
 * Agente que permite certificados autofirmados.
 * Necesario en entornos SAP S/4HANA private on-premise.
 */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Consulta el stock de materiales usando la API personalizada ZSB_STOCK de Cooprinsem.
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

  // Construir la URL base para ZSB_STOCK a partir del host del servidor SAP
  const sapHost = SAP_BASE_URL.replace('/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV', '');
  const zStockUrl = `${sapHost}/sap/opu/odata/sap/ZUI_STOCK_SRV`;

  // Construir filtros OData según los parámetros recibidos
  const filtros: string[] = [];

  if (params.material) {
    filtros.push(`Material eq '${params.material}'`);
  }
  if (params.plant) {
    filtros.push(`Plant eq '${params.plant}'`);
  }
  if (params.storageLocation) {
    filtros.push(`StorageLocation eq '${params.storageLocation}'`);
  }
  if (params.soloConStock) {
    filtros.push(`UnrestrictedStock gt 0`);
  }

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
  const resultados: SapStockRecord[] = response.data?.d?.results ?? [];

  // Filtrado server-side por texto (código o descripción)
  // Se hace aquí porque la API custom ZSB_STOCK puede no soportar substringof
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