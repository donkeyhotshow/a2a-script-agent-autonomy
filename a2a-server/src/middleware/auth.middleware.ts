import { Request, Response, NextFunction } from 'express';
import { AppError, unauthorized } from './error.middleware.js';
import { TokenPayload } from '../services/auth.service.js';

/**
 * Auth Middleware
 * Handles JWT and API Key authentication
 */

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      client?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Authenticate via JWT or API Key
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Implement authentication
    // 1. Check Authorization header for Bearer token
    // 2. Check X-API-Key header for API key
    // 3. Validate token/key
    // 4. Attach client to request
    // 5. Call next()
    
    // Example structure:
    // const authHeader = req.headers.authorization;
    // const apiKey = req.headers['x-api-key'];
    
    // if (authHeader?.startsWith('Bearer ')) {
    //   const token = authHeader.slice(7);
    //   const payload = await verifyToken(token);
    //   req.client = { id: payload.clientId, email: payload.email };
    //   return next();
    // }
    
    // if (apiKey) {
    //   const client = await authenticateWithApiKey(apiKey as string);
    //   req.client = { id: client.id, email: client.email };
    //   return next();
    // }
    
    throw unauthorized('AUTH_001', 'Authentication required');
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no auth
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Implement optional auth
    // Same as authenticate but doesn't throw error
    // Just sets req.client if valid auth present
    
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
  res: Response,
  next: NextFunction
): void {
  // TODO: Implement require auth
  // Check if req.client is set
  // Throw 401 if not
  
  if (!req.client) {
    throw unauthorized('AUTH_001', 'Authentication required');
  }
  
  next();
}

/**
 * Check resource ownership
 */
export function requireOwnership(getResourceClientId: (req: Request) => Promise<string>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Implement ownership check
      // 1. Get resource client ID
      // 2. Compare with authenticated client
      // 3. Throw 403 if mismatch
      
      if (!req.client) {
        throw unauthorized('AUTH_001', 'Authentication required');
      }
      
      const resourceClientId = await getResourceClientId(req);
      
      if (resourceClientId !== req.client.id) {
        throw new AppError('AUTH_003', 'Access denied', 403);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Rate limit by client ID
 */
export function rateLimitByClient(
  maxRequests: number,
  windowMs: number
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Implement client rate limiting
      // 1. Get client ID from request
      // 2. Check rate limit in Redis
      // 3. Throw 429 if exceeded
      
      next();
    } catch (error) {
      next(error);
    }
  };
}
