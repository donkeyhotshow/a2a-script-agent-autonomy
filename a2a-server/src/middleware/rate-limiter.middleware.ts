import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors.js';

/**
 * Rate Limiter Middleware
 * Handles request rate limiting using Redis
 */

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Implement rate limiting
      // 1. Generate key using keyGenerator or default (IP)
      // 2. Get current count from Redis
      // 3. Check if limit exceeded
      // 4. Increment counter
      // 5. Set expiry if new
      // 6. Add X-RateLimit headers
      // 7. Throw 429 if exceeded
      
      const key = config.keyGenerator 
        ? config.keyGenerator(req) 
        : `rate_limit:${req.ip}`;
      
      // Example:
      // const current = await redis.incr(key);
      // if (current === 1) {
      //   await redis.pexpire(key, config.windowMs);
      // }
      // if (current > config.maxRequests) {
      //   throw new AppError('RATE_001', 'Too many requests', 429);
      // }
      
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
