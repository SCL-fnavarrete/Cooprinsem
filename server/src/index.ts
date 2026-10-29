import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { globalErrorHandler } from './middleware/errorHandler';

import clientesRouter from './routes/clientes';
import materialesRouter from './routes/materiales';
import stockRouter from './routes/stock';
import partidasRouter from './routes/partidas';
import pedidosRouter from './routes/pedidos';
import cobrosRouter from './routes/cobros';
import pagaresRouter from './routes/pagares';
import arqueoRouter from './routes/arqueo';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import interfacesRouter from './routes/interfaces';
import sapMaestroRouter from './routes/sapMaestro';
import sapStockRouter from './routes/sapStock';
import posMaestrosRouter from './routes/posMaestros';
import sapClientesRouter from './routes/sapClientes';
import sapPedidosRouter from './routes/sapPedidos';
import sapCajaRouter from './routes/sapCaja';
import sapEgresoCajaRouter from './routes/sapEgresoCaja';
import sapClienteTablaRouter from './routes/sapClienteTabla';
import sapSeriesRouter from './routes/sapSeries';
import sapCtaCteRouter from './routes/sapCtaCte';
import sapFacturasRouter from './routes/sapFacturas';
import { soloLectura } from './middleware/soloLectura';
import { registrarActividad } from './middleware/actividad';
import sistemaRouter from './routes/sistema';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
// Interfaz de escucha: en el servidor Linux HOST=127.0.0.1 (solo Nginx llega al backend).
// Sin HOST escucha en todas las interfaces, como antes (desarrollo y VM pre_prod).
const HOST = process.env['HOST'] || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Forzar charset UTF-8 en todas las respuestas JSON
app.use((_req, res, next) => {
  res.charset = 'utf-8';
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(body);
  };
  next();
});

// Actividad del POS: VigilaPOS.bat solo cambia de versión si nadie lo está usando
app.use(registrarActividad);

// Perfil Visualizador (rol 5): rechaza grabar/actualizar/borrar (ver middleware/soloLectura.ts)
app.use(soloLectura);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas API
app.use('/api/clientes', clientesRouter);
app.use('/api/materiales', materialesRouter);
app.use('/api/stock', stockRouter);
app.use('/api/partidas', partidasRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/cobros', cobrosRouter);
app.use('/api/pagares', pagaresRouter);
app.use('/api/arqueo', arqueoRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/interfaces', interfacesRouter);
app.use('/api/sap-maestro', sapMaestroRouter);
app.use('/api/sap-stock', sapStockRouter);
app.use('/api/pos-maestros', posMaestrosRouter);
app.use('/api/sap-clientes', sapClientesRouter);
app.use('/api/sap-pedidos', sapPedidosRouter);
app.use('/api/sap-series', sapSeriesRouter);
app.use('/api/sap-cta-cte', sapCtaCteRouter);
app.use('/api/sap-caja', sapCajaRouter);
app.use('/api/sap-facturas', sapFacturasRouter);
app.use('/api/sap-egreso', sapEgresoCajaRouter);
app.use('/api/sap-cliente-tabla', sapClienteTablaRouter);
app.use('/api/sistema', sistemaRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler centralizado (debe ir después de todas las rutas)
app.use(globalErrorHandler);

app.listen(PORT, HOST, async () => {
  console.log(`Backend POC Cooprinsem corriendo en http://${HOST}:${PORT}`);

  // Verificar/crear tablas propias de PostgreSQL (fuera de Prisma) al arrancar
  const { inicializarTablasPostgres, inicializarRegiones, inicializarRolVisualizador, inicializarMaestrosCombustible } = await import('./database/pgSetup');
  await inicializarTablasPostgres();
  await inicializarRegiones();
  await inicializarRolVisualizador();
  await inicializarMaestrosCombustible();
});

export default app;
