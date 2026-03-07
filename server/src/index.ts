import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import clientesRouter from './routes/clientes';
import materialesRouter from './routes/materiales';
import stockRouter from './routes/stock';
import partidasRouter from './routes/partidas';
import pedidosRouter from './routes/pedidos';
import cobrosRouter from './routes/cobros';
import authRouter from './routes/auth';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/api/auth', authRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Backend POC Cooprinsem corriendo en http://localhost:${PORT}`);
});

export default app;
