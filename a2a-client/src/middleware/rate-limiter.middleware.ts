import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors.js';

/**
 * Rate Limiter Middleware
 * Handles request rate limiting using in-memory store (fallback to Redis in production)
 */

// Simple in-memory store for rate limiting (для production використовувати Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries кожні 5 хвилин
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
}

/**
 * Create rate limiter middleware
 * ВИПРАВЛЕНО: Реалізовано базовий rate limiting
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = config.keyGenerator 
        ? config.keyGenerator(req) 
        : `rate_limit:${req.ip}`;
      
      const now = Date.now();
      const windowStart = now - config.windowMs;
      
      // Get current count
      const record = rateLimitStore.get(key);
      
      if (!record || record.resetTime < now) {
        // First request в вікні
        rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      } else {
        record.count++;
        
        if (record.count > config.maxRequests) {
          // Rate limit exceeded
          const retryAfter = Math.ceil((record.resetTime - now) / 1000);
          
          // Add rate limit headers
          res.setHeader('X-RateLimit-Limit', config.maxRequests);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('Retry-After', retryAfter);
          
          throw new AppError('RATE_001', 'Too many requests', 429);
        }
      }
      
      // Add rate limit headers
      const currentCount = rateLimitStore.get(key);
      if (currentCount) {
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - currentCount.count));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Default rate limiter (100 requests per 15 minutes)
 */
export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

/**
 * Strict rate limiter (10 requests per minute)
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});

/**
 * Auth rate limiter (5 attempts per 15 minutes)
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req: Request) => `auth_limit:${req.ip}:${req.body?.email || 'unknown'}`,
});

/**
 * API rate limiter by client ID
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  keyGenerator: (req: Request) => `api_limit:${req.client?.id || req.ip}`,
});

/**
 * Search rate limiter (20 searches per minute)
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  keyGenerator: (req: Request) => `search_limit:${req.client?.id || req.ip}`,
});
