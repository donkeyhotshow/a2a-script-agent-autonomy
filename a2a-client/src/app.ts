import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';
import { config } from './config/index.js';
import { correlationMiddleware } from './middleware/correlation.middleware.js';

const app: Express = express();

app.use(correlationMiddleware);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS: Дозволені Origins з конфігурації
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Дозволити запити без origin (наприклад, mobile apps чи curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Список дозволених origins
    const allowedOrigins = config.nodeEnv === 'development' 
      ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
      : []; // В production потрібно явно вказати домени
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-ID', 'X-Correlation-ID'],
};
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', { method: req.method, path: req.path, status: res.statusCode, duration: `${Date.now() - start}ms` });
  });
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: process.env.npm_package_version || '1.0.0' });
});

app.use('/api/v1', routes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
});

app.use(errorHandler);

export default app;
