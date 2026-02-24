import { Request, Response, NextFunction } from 'express';
import { unauthorized } from './error.middleware.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../types/errors.js';

declare global {
  namespace Express {
    interface Request {
      client?: { id: string; email: string };
    }
  }
}

/**
 * JWT-based authentication with proper validation
 * ВИПРАВЛЕНО: Видалено захардкоджений пароль та bypass в development
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // КРИТИЧНА БЕЗПЕКА: НІКОЛИ не пропускати авторизацію!
    // Раніше: if (process.env['SKIP_AUTH'] === '1' || process.env['NODE_ENV'] === 'development')
    // Це була вразливість!

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw unauthorized('AUTH_001', 'Authorization header required');
    }

    // Підтримка Bearer JWT токена
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      try {
        // Перевірка JWT токена
        const decoded = jwt.verify(token, config.jwtSecret) as { 
          clientId?: string; 
          email?: string;
          sub?: string;
        };
        
        req.client = { 
          id: decoded.clientId || decoded.sub || 'unknown', 
          email: decoded.email || 'client@a2a.local' 
        };
        return next();
      } catch (jwtError) {
        // Якщо не JWT, перевіряємо як API key
        if (token.startsWith(config.apiKeyPrefix)) {
          req.client = { id: 'api-client', email: 'api@a2a.local' };
          return next();
        }
        
        throw unauthorized('AUTH_002', 'Invalid token');
      }
    }

    // Basic auth ТІЛЬКИ в development (для зворотної сумісності)
    if (authHeader.startsWith('Basic ')) {
      if (process.env['NODE_ENV'] !== 'development') {
        throw unauthorized('AUTH_003', 'Basic auth not supported in production');
      }
      
      const base64Credentials = authHeader.slice(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [email, password] = credentials.split(':');
      
      const serverPassword = process.env['A2A_SERVER_PASSWORD'];
      if (password === serverPassword && email) {
        req.client = { id: 'dev-client', email };
        return next();
      }
    }

    throw unauthorized('AUTH_002', 'Invalid credentials');
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no auth
 * ВИПРАВЛЕНО: Прибрано bypass в development
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next(); // No auth provided, continue as anonymous
    }

    // Спробуємо JWT верифікацію
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { 
          clientId?: string; 
          email?: string;
        };
        req.client = { 
          id: decoded.clientId || 'unknown', 
          email: decoded.email || 'anonymous@a2a.local' 
        };
      } catch {
        // JWT недійсний - залишаємо як анонімний
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require authenticated client
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.client) {
    throw unauthorized('AUTH_001', 'Authentication required');
  }
  
  next();
}

/**
 * Check resource ownership (no-op in stateless mode)
 */
export function requireOwnership(_getResourceClientId: (req: Request) => Promise<string>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // In stateless mode, we don't have resources to check ownership of
    // Just require authentication
    if (!req.client) {
      throw unauthorized('AUTH_001', 'Authentication required');
    }
    next();
  };
}

/**
 * Rate limit by client ID (placeholder)
 */
export function rateLimitByClient(
  maxRequests: number,
  windowMs: number
) {
  // In-memory счетчик по clientId/IP. Для продакшена можно заменить на Redis.
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const effectiveMax =
    maxRequests && maxRequests > 0 ? maxRequests : config.rateLimitMaxRequests;
  const effectiveWindow =
    windowMs && windowMs > 0 ? windowMs : config.rateLimitWindowMs;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const now = Date.now();
      const key = req.client?.id ?? req.ip ?? 'anonymous';

      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + effectiveWindow };
        buckets.set(key, bucket);
      }

      bucket.count += 1;

      if (bucket.count > effectiveMax) {
        throw new AppError('RATE_001', 'Too many requests', 429, {
          windowMs: effectiveWindow,
          maxRequests: effectiveMax,
          clientId: req.client?.id,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
