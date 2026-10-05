import { Router, Request, Response } from 'express';
import { consultarStock, StockQueryParams, materialSinCeros, normalizarMaterialSap } from './sapStockService';

const router = Router();

/**
 * GET /api/sap-stock/buscar
 *
 * Busca materiales en SAP por código o descripción para el buscador de artículos.
 * Retorna materiales con stock > 0 en el centro indicado, filtrados por texto.
 *
 * Query params:
 *   - q     → texto de búsqueda (código o descripción)
 *   - plant → código de centro (por defecto D190)
 */
router.get('/buscar', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string ?? '').trim();
    const plant = (req.query.plant as string) || 'D190';

    if (q.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const stock = await consultarStock({
      plant,
      soloConStock: false,
      buscarTexto: q,
      top: 200,
    });

    res.json({
      success: true,
      total: stock.length,
      data: stock,
    });
  } catch (error: any) {
    const detalleSap = error.response?.data?.error?.message?.value
      ?? error.message;
    console.error('[GET /api/sap-stock/buscar] Error:', error.message);
    console.error('[GET /api/sap-stock/buscar] Detalle:', JSON.stringify(error.response?.data));
    res.status(500).json({
      success: false,
      message: 'Error al buscar materiales en SAP',
      detail: detalleSap,
    });
  }
});

/**
 * GET /api/sap-stock/material/:matnr
 *
 * Stock de UN material para el panel de Nuevo Pedido: por almacén en la
 * sucursal indicada y el total libre en las demás sucursales (como el panel
 * "Stock por centro" del WebDynpro). Fuente: ZUI_STOCK_SRV.
 *
 * Query params:
 *   - plant → sucursal del usuario (por defecto D190)
 */
router.get('/material/:matnr', async (req: Request, res: Response) => {
  try {
    const matnr = String(req.params.matnr ?? '').trim();
    const plant = (req.query.plant as string) || 'D190';
    if (!matnr) {
      res.status(400).json({ success: false, message: 'Falta el código de material' });
      return;
    }

    // Todas las sucursales: SAP no respeta $top, así que se pide el material
    // completo y se agrupa aquí.
    const registros = await consultarStock({ material: matnr });

    const delCentro = registros.filter((r) => r.Plant === plant);
    const almacenes = delCentro
      .map((r) => ({
        almacen:    r.StorageLocation,
        libre:      Number(r.UnrestrictedStock) || 0,
        inspeccion: Number(r.QualityInspectionStock) || 0,
        bloqueado:  Number(r.BlockedStock) || 0,
        unidad:     r.BaseUnit,
      }))
      .sort((a, b) => a.almacen.localeCompare(b.almacen));

    const porCentro = new Map<string, { centro: string; nombre: string; libre: number }>();
    for (const r of registros) {
      if (r.Plant === plant) continue;
      const actual = porCentro.get(r.Plant) ?? { centro: r.Plant, nombre: r.PlantName, libre: 0 };
      actual.libre += Number(r.UnrestrictedStock) || 0;
      porCentro.set(r.Plant, actual);
    }
    const otrosCentros = [...porCentro.values()].sort((a, b) => b.libre - a.libre || a.centro.localeCompare(b.centro));

    res.json({
      success: true,
      data: {
        material:     materialSinCeros(normalizarMaterialSap(matnr)),
        plant,
        nombreCentro: delCentro[0]?.PlantName ?? '',
        totalCentro:  almacenes.reduce((s, a) => s + a.libre, 0),
        unidad:       delCentro[0]?.BaseUnit ?? registros[0]?.BaseUnit ?? '',
        almacenes,
        otrosCentros,
      },
    });
  } catch (error: any) {
    const detalleSap = error.response?.data?.error?.message?.value ?? error.message;
    console.error('[GET /api/sap-stock/material] Error:', error.message);
    res.status(500).json({ success: false, message: 'Error al consultar el stock del material en SAP', detail: detalleSap });
  }
});

// Tope de registros que se devuelven al navegador en la consulta de Stock.
// SAP (ZUI_STOCK_SRV) ignora $top: sin filtros devolvía 3.049 registros
// (~1,9 MB, confirmado en vivo 2026-10-05), así que el límite se aplica aquí.
const TOP_POR_DEFECTO = 200;
const TOP_MAXIMO = 1000;

/**
 * GET /api/sap-stock
 *
 * Consulta de Stock (Pedidos > Stock), servicio personalizado ZUI_STOCK_SRV.
 * Exige al menos un filtro. Devuelve como máximo `top` registros e informa el
 * total real (`total`) y si se recortó (`truncado`).
 *
 * Query params:
 *   - material          → código de material        (ej: "14700006"; se completa con ceros)
 *   - plant             → código de centro          (ej: "D190")
 *   - storageLocation   → código de almacén         (ej: "B000")
 *   - soloConStock      → "true" para traer solo registros con stock libre > 0
 *   - top               → límite de registros       (por defecto 200, máximo 1000)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const params: StockQueryParams = {
      material:        (req.query.material        as string | undefined)?.trim() || undefined,
      plant:           (req.query.plant           as string | undefined)?.trim() || undefined,
      storageLocation: (req.query.storageLocation as string | undefined)?.trim() || undefined,
      soloConStock:    req.query.soloConStock === 'true',
    };

    if (!params.material && !params.plant && !params.storageLocation && !params.soloConStock) {
      res.status(400).json({ success: false, message: 'Ingrese al menos un filtro (material, centro, almacén o solo con stock)' });
      return;
    }

    const topPedido = Number(req.query.top);
    const top = Number.isFinite(topPedido) && topPedido > 0 ? Math.min(Math.floor(topPedido), TOP_MAXIMO) : TOP_POR_DEFECTO;

    const stock = await consultarStock(params);

    res.json({
      success:   true,
      total:     stock.length,
      truncado:  stock.length > top,
      data:      stock.slice(0, top),
    });
  } catch (error: any) {
    const detalleSap = error.response?.data?.error?.message?.value
      ?? error.message;
    console.error('[GET /api/sap-stock] Error al consultar SAP:', error.message);
    console.error('[GET /api/sap-stock] Detalle:', JSON.stringify(error.response?.data));

    res.status(500).json({
      success: false,
      message: 'Error al consultar el stock en SAP',
      detail:  detalleSap,
    });
  }
});

export default router;