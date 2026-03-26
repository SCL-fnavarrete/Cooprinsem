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
import anticiposRouter from './routes/anticipos';
import arqueoRouter from './routes/arqueo';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

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
app.use('/api/anticipos', anticiposRouter);
app.use('/api/arqueo', arqueoRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler centralizado (debe ir después de todas las rutas)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Backend POC Cooprinsem corriendo en http://localhost:${PORT}`);
});

export default app;
