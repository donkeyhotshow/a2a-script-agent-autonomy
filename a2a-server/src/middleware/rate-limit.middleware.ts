/**
 * In-memory rate limiting middleware (Redis-backed per plans/later/middleware-improvements.md).
 * Uses config.rateLimitWindowMs and config.rateLimitMaxRequests.
 */

import type { Request, Response, NextFunction } from 'express';

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  getKey?: (req: Request) => string;
}

function getDefaultKey(req: Request): string {
  const clientId = (req as Request & { clientId?: string }).clientId;
  if (clientId) return clientId;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? req.socket?.remoteAddress ?? 'unknown';
  return String(ip).trim();
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const { maxRequests, windowMs, getKey = getDefaultKey } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getKey(req);
    const now = Date.now();
    let w = store.get(key);

    if (!w || now >= w.resetAt) {
      w = { count: 0, resetAt: now + windowMs };
      store.set(key, w);
    }
    w.count += 1;

    if (w.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((w.resetAt - now) / 1000)));
      res.status(429).json({ error: 'Too Many Requests', code: 'RATE_LIMIT' });
      return;
    }
    next();
  };
}
