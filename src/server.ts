import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import workerRoutes from './routes/worker.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import exchangeRoutes from './routes/exchange.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Configurar trust proxy para resolución correcta de IP detrás de proxies/balanceadores
app.set('trust proxy', 1);

// 1. Cabeceras de Seguridad Avanzadas con Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Permite cargar recursos y scripts del SPA Vite en producción
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' }, // Anti-clickjacking
  noSniff: true, // Prevención de MIME sniffing
  xssFilter: true, // Protección contra XSS reflejado
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// 2. Control de CORS
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// 3. Health Check (Se monta antes del rate limiting para evitar bloqueos a monitores o Docker)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Emporio Tecnológico Multi-Tenant SaaS Engine',
    timestamp: new Date().toISOString(),
  });
});

// 4. Rate Limiting General para la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Máximo 300 solicitudes por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta dirección IP. Por favor intente nuevamente en 15 minutos.',
  },
});
app.use('/api', apiLimiter);

// 5. Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/exchange', exchangeRoutes);

// 6. Servir Frontend Estático compilado
const publicPath = path.resolve(process.cwd(), 'dist', 'public');
app.use(express.static(publicPath));

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 7. Manejador global de errores (Higiene estricta de errores: no expone detalles internos ni de BD)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado en el servidor:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
});

const isMainModule = typeof require !== 'undefined' ? require.main === module : false;
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test';

if (isMainModule || (!isTestEnv && process.env.NODE_ENV === 'production')) {
  app.listen(PORT, () => {
    console.log(`⚡ Servidor SaaS Emporio activo en el puerto ${PORT}`);
  });
}

export default app;
