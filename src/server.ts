import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import workerRoutes from './routes/worker.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import exchangeRoutes from './routes/exchange.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Emporio Tecnológico Multi-Tenant SaaS Engine',
    timestamp: new Date().toISOString(),
  });
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/exchange', exchangeRoutes);

// Servir Frontend Estático compilado
const publicPath = path.resolve(process.cwd(), 'dist', 'public');
app.use(express.static(publicPath));

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Manejador global de errores
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`⚡ Servidor SaaS Emporio activo en el puerto ${PORT}`);
  });
}

export default app;
