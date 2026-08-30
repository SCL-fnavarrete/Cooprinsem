import { Router, Request, Response } from 'express';

const router = Router();

// Helper para obtener Pool de pg
async function getPool() {
  const { Pool } = await import('pg');
  return new Pool({ connectionString: process.env['DATABASE_URL'] });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS DE VENTA
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/pos-maestros/documentos-venta — Listar todos
router.get('/documentos-venta', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try {
    const result = await pool.query('SELECT * FROM pos_documento_venta ORDER BY clase_documento');
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// POST /api/pos-maestros/documentos-venta — Crear
router.post('/documentos-venta', async (req: Request, res: Response) => {
  const { clase_documento, descripcion, tipo_documento, tipo_documento_desc, api_relacionada, org_ventas, canal_distribucion, sector } = req.body;
  const pool = await getPool();
  try {
    const result = await pool.query(
      `INSERT INTO pos_documento_venta (clase_documento, descripcion, tipo_documento, tipo_documento_desc, api_relacionada, org_ventas, canal_distribucion, sector)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [clase_documento, descripcion, tipo_documento, tipo_documento_desc, api_relacionada ?? '', org_ventas ?? 'COOP', canal_distribucion ?? 'VM', sector ?? '00']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// PUT /api/pos-maestros/documentos-venta/:id — Editar
router.put('/documentos-venta/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { clase_documento, descripcion, tipo_documento, tipo_documento_desc, api_relacionada, org_ventas, canal_distribucion, sector } = req.body;
  const pool = await getPool();
  try {
    const result = await pool.query(
      `UPDATE pos_documento_venta SET clase_documento=$1, descripcion=$2, tipo_documento=$3, tipo_documento_desc=$4, api_relacionada=$5, org_ventas=$6, canal_distribucion=$7, sector=$8
       WHERE id=$9 RETURNING *`,
      [clase_documento, descripcion, tipo_documento, tipo_documento_desc, api_relacionada ?? '', org_ventas ?? 'COOP', canal_distribucion ?? 'VM', sector ?? '00', id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Documento no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// DELETE /api/pos-maestros/documentos-venta/:id — Eliminar
router.delete('/documentos-venta/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const pool = await getPool();
  try {
    const result = await pool.query('DELETE FROM pos_documento_venta WHERE id=$1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Documento no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Eliminado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OFICINAS DE VENTAS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/pos-maestros/oficinas-venta — Listar todos
router.get('/oficinas-venta', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try {
    const result = await pool.query('SELECT * FROM pos_oficina_venta ORDER BY codigo');
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// POST /api/pos-maestros/oficinas-venta — Crear
router.post('/oficinas-venta', async (req: Request, res: Response) => {
  const { codigo, nombre, org_ventas, canal_distribucion, sector } = req.body;
  const pool = await getPool();
  try {
    const result = await pool.query(
      `INSERT INTO pos_oficina_venta (codigo, nombre, org_ventas, canal_distribucion, sector)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigo, nombre, org_ventas ?? 'COOP', canal_distribucion ?? 'VM', sector ?? '00']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// PUT /api/pos-maestros/oficinas-venta/:id — Editar
router.put('/oficinas-venta/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { codigo, nombre, org_ventas, canal_distribucion, sector } = req.body;
  const pool = await getPool();
  try {
    const result = await pool.query(
      `UPDATE pos_oficina_venta SET codigo=$1, nombre=$2, org_ventas=$3, canal_distribucion=$4, sector=$5
       WHERE id=$6 RETURNING *`,
      [codigo, nombre, org_ventas ?? 'COOP', canal_distribucion ?? 'VM', sector ?? '00', id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Oficina no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// DELETE /api/pos-maestros/oficinas-venta/:id — Eliminar
router.delete('/oficinas-venta/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const pool = await getPool();
  try {
    const result = await pool.query('DELETE FROM pos_oficina_venta WHERE id=$1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Oficina no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Eliminado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CENTROS SUMINISTRADOR
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/pos-maestros/centros-suministrador — Listar todos
router.get('/centros-suministrador', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try {
    const result = await pool.query('SELECT * FROM pos_centro_suministrador ORDER BY codigo');
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// POST /api/pos-maestros/centros-suministrador — Crear
router.post('/centros-suministrador', async (req: Request, res: Response) => {
  const { codigo, nombre, org_ventas, canal_distribucion, sector } = req.body;
  const pool = await getPool();
  try {
    const result = await pool.query(
      `INSERT INTO pos_centro_suministrador (codigo, nombre, org_ventas, canal_distribucion, sector)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigo, nombre, org_ventas ?? 'COOP', canal_distribucion ?? 'VM', sector ?? '00']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// PUT /api/pos-maestros/centros-suministrador/:id — Editar
router.put('/centros-suministrador/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { codigo, nombre, org_ventas, canal_distribucion, sector } = req.body;
  const pool = await getPool();
  try {
    const result = await pool.query(
      `UPDATE pos_centro_suministrador SET codigo=$1, nombre=$2, org_ventas=$3, canal_distribucion=$4, sector=$5
       WHERE id=$6 RETURNING *`,
      [codigo, nombre, org_ventas ?? 'COOP', canal_distribucion ?? 'VM', sector ?? '00', id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Centro no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// DELETE /api/pos-maestros/centros-suministrador/:id — Eliminar
router.delete('/centros-suministrador/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const pool = await getPool();
  try {
    const result = await pool.query('DELETE FROM pos_centro_suministrador WHERE id=$1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Centro no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Eliminado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANAL DISTRIBUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/canales-distribucion', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try {
    const result = await pool.query('SELECT * FROM pos_canal_distribucion ORDER BY codigo');
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

router.post('/canales-distribucion', async (req: Request, res: Response) => {
  const { codigo, descripcion } = req.body;
  const pool = await getPool();
  try {
    const result = await pool.query(
      `INSERT INTO pos_canal_distribucion (codigo, descripcion) VALUES ($1, $2) RETURNING *`,
      [codigo, descripcion]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

router.put('/canales-distribucion/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { codigo, descripcion } = req.body;
  const pool = await getPool();
  try {
    const result = await pool.query(
      `UPDATE pos_canal_distribucion SET codigo=$1, descripcion=$2 WHERE id=$3 RETURNING *`,
      [codigo, descripcion, id]
    );
    if (result.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

router.delete('/canales-distribucion/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const pool = await getPool();
  try {
    const result = await pool.query('DELETE FROM pos_canal_distribucion WHERE id=$1', [id]);
    if (result.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; }
    res.json({ success: true, message: 'Eliminado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await pool.end();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUPO CUENTA (MS-07)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/grupos-cuenta', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try { const r = await pool.query('SELECT * FROM pos_grupo_cuenta ORDER BY codigo'); res.json({ success: true, data: r.rows }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.post('/grupos-cuenta', async (req: Request, res: Response) => {
  const { codigo, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('INSERT INTO pos_grupo_cuenta (codigo, descripcion) VALUES ($1, $2) RETURNING *', [codigo, descripcion]); res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.put('/grupos-cuenta/:id', async (req: Request, res: Response) => {
  const { id } = req.params; const { codigo, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('UPDATE pos_grupo_cuenta SET codigo=$1, descripcion=$2 WHERE id=$3 RETURNING *', [codigo, descripcion, id]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.delete('/grupos-cuenta/:id', async (req: Request, res: Response) => {
  const { id } = req.params; const pool = await getPool();
  try { const r = await pool.query('DELETE FROM pos_grupo_cuenta WHERE id=$1', [id]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, message: 'Eliminado' }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASE INTERLOCUTOR (MS-08)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/clases-interlocutor', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try { const r = await pool.query('SELECT * FROM pos_clase_interlocutor ORDER BY codigo'); res.json({ success: true, data: r.rows }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.post('/clases-interlocutor', async (req: Request, res: Response) => {
  const { codigo, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('INSERT INTO pos_clase_interlocutor (codigo, descripcion) VALUES ($1, $2) RETURNING *', [codigo, descripcion]); res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.put('/clases-interlocutor/:id', async (req: Request, res: Response) => {
  const { id } = req.params; const { codigo, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('UPDATE pos_clase_interlocutor SET codigo=$1, descripcion=$2 WHERE id=$3 RETURNING *', [codigo, descripcion, id]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.delete('/clases-interlocutor/:id', async (req: Request, res: Response) => {
  const { id } = req.params; const pool = await getPool();
  try { const r = await pool.query('DELETE FROM pos_clase_interlocutor WHERE id=$1', [id]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, message: 'Eliminado' }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONDICIÓN DE EXPEDICIÓN (MS-09)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/condiciones-expedicion', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try { const r = await pool.query('SELECT * FROM pos_condicion_expedicion ORDER BY codigo'); res.json({ success: true, data: r.rows }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.post('/condiciones-expedicion', async (req: Request, res: Response) => {
  const { codigo, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('INSERT INTO pos_condicion_expedicion (codigo, descripcion) VALUES ($1, $2) RETURNING *', [codigo, descripcion]); res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.put('/condiciones-expedicion/:id', async (req: Request, res: Response) => {
  const { id } = req.params; const { codigo, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('UPDATE pos_condicion_expedicion SET codigo=$1, descripcion=$2 WHERE id=$3 RETURNING *', [codigo, descripcion, id]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.delete('/condiciones-expedicion/:id', async (req: Request, res: Response) => {
  const { id } = req.params; const pool = await getPool();
  try { const r = await pool.query('DELETE FROM pos_condicion_expedicion WHERE id=$1', [id]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, message: 'Eliminado' }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONDICIÓN DE PAGO (MS-10)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/condiciones-pago', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try { const r = await pool.query('SELECT * FROM pos_condicion_pago ORDER BY codigo'); res.json({ success: true, data: r.rows }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.post('/condiciones-pago', async (req: Request, res: Response) => {
  const { codigo, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('INSERT INTO pos_condicion_pago (codigo, descripcion) VALUES ($1, $2) RETURNING *', [codigo, descripcion]); res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.put('/condiciones-pago/:id', async (req: Request, res: Response) => {
  const { id } = req.params; const { codigo, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('UPDATE pos_condicion_pago SET codigo=$1, descripcion=$2 WHERE id=$3 RETURNING *', [codigo, descripcion, id]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});
router.delete('/condiciones-pago/:id', async (req: Request, res: Response) => {
  const { id } = req.params; const pool = await getPool();
  try { const r = await pool.query('DELETE FROM pos_condicion_pago WHERE id=$1', [id]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, message: 'Eliminado' }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARÁMETROS GENERALES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/pos-maestros/parametros — Listar todos
router.get('/parametros', async (_req: Request, res: Response) => {
  const pool = await getPool();
  try { const r = await pool.query('SELECT * FROM pos_parametro_general ORDER BY clave'); res.json({ success: true, data: r.rows }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// GET /api/pos-maestros/parametros/:clave — Leer un parámetro por clave
router.get('/parametros/:clave', async (req: Request, res: Response) => {
  const clave = req.params.clave as string; const pool = await getPool();
  try {
    const r = await pool.query('SELECT * FROM pos_parametro_general WHERE clave=$1', [clave.toUpperCase()]);
    if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'Parámetro no encontrado' }); return; }
    res.json({ success: true, data: r.rows[0] });
  }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// PUT /api/pos-maestros/parametros/:clave — Editar valor de un parámetro
router.put('/parametros/:clave', async (req: Request, res: Response) => {
    const clave = req.params.clave as string; const { valor, descripcion } = req.body; const pool = await getPool();
  try {
    const r = await pool.query(
      'UPDATE pos_parametro_general SET valor=$1, descripcion=COALESCE($2, descripcion) WHERE clave=$3 RETURNING *',
      [valor, descripcion, clave.toUpperCase()]
    );
    if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'Parámetro no encontrado' }); return; }
    res.json({ success: true, data: r.rows[0] });
  }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// POST /api/pos-maestros/parametros — Crear parámetro nuevo
router.post('/parametros', async (req: Request, res: Response) => {
  const { clave, valor, descripcion } = req.body; const pool = await getPool();
  try { const r = await pool.query('INSERT INTO pos_parametro_general (clave, valor, descripcion) VALUES ($1, $2, $3) RETURNING *', [clave.toUpperCase(), valor, descripcion ?? '']); res.json({ success: true, data: r.rows[0] }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// DELETE /api/pos-maestros/parametros/:clave — Eliminar parámetro
router.delete('/parametros/:clave', async (req: Request, res: Response) => {
    const clave = req.params.clave as string; const pool = await getPool();
  try { const r = await pool.query('DELETE FROM pos_parametro_general WHERE clave=$1', [clave.toUpperCase()]); if (r.rowCount === 0) { res.status(404).json({ success: false, message: 'No encontrado' }); return; } res.json({ success: true, message: 'Eliminado' }); }
  catch (e: any) { res.status(500).json({ success: false, message: e.message }); } finally { await pool.end(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: getMandante() — Exportable para que otros servicios lo usen
// ═══════════════════════════════════════════════════════════════════════════════
export async function getMandante(): Promise<string> {
  const pool = await getPool();
  try {
    const r = await pool.query("SELECT valor FROM pos_parametro_general WHERE clave='MANDANTE'");
    return r.rows[0]?.valor ?? '200';
  } catch {
    return '200'; // fallback si la tabla no existe o hay error de conexión
  } finally {
    await pool.end();
  }
}

export default router;
