import { Router, Request, Response } from 'express';
import { consultarStock, StockQueryParams } from './sapStockService';

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
 * GET /api/sap-stock
 *
 * Consulta el stock de materiales usando la API personalizada ZSB_STOCK de Cooprinsem.
 * Todos los parámetros son opcionales — si no se envía ninguno devuelve los primeros 100 registros.
 *
 * Query params:
 *   - material          → código de material        (ej: "14700006")
 *   - plant             → código de centro          (ej: "D190")
 *   - storageLocation   → código de almacén         (ej: "B000")
 *   - soloConStock      → "true" para traer solo materiales con stock libre > 0
 *   - top               → límite de registros       (por defecto 100)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const params: StockQueryParams = {
      material:        req.query.material        as string  | undefined,
      plant:           req.query.plant           as string  | undefined,
      storageLocation: req.query.storageLocation as string  | undefined,
      soloConStock:    req.query.soloConStock === 'true',
      top:             req.query.top ? Number(req.query.top) : undefined,
    };

    const stock = await consultarStock(params);

    res.json({
      success: true,
      total:   stock.length,
      data:    stock,
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