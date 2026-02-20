import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config, isProduction } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';

// Create Express application
const app: Express = express();

// ============================================
// Security Middleware
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: isProduction,
  crossOriginEmbedderPolicy: isProduction,
}));

// CORS configuration
app.use(cors({
  origin: isProduction ? false : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Compression
app.use(compression());

// ============================================
// Rate Limiting
// ============================================

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_001',
        message: 'Too many requests, please try again later.',
      },
    });
  },
});

app.use('/api/', limiter);

// ============================================
// Body Parsing
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Request Logging
// ============================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
});

// ============================================
// Health Check (before auth)
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

app.get('/health/detailed', async (_req: Request, res: Response) => {
  // TODO: Add actual health checks for DB, Redis, etc.
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    components: {
      database: { status: 'ok', latency_ms: 0 },
      redis: { status: 'ok', latency_ms: 0 },
      plexe: { status: 'ok', models_loaded: 0 },
      queue: { status: 'ok', pending_jobs: 0, workers: 0 },
    },
  });
});

// ============================================
// API Routes
// ============================================

app.use('/api/v1', routes);

// ============================================
// 404 Handler
// ============================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
});

// ============================================
// Error Handler
// ============================================

app.use(errorHandler);

export default app;
