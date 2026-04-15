/**
 * Rate Limiting Configuration Schema
 */

import { z } from 'zod';
import { intSchema } from './helpers.js';

export const rateLimitConfigSchema = z.object({
  windowMs: intSchema(1000, 3600000, 60000),
  maxRequests: intSchema(1, 10000, 200),
});

export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;

