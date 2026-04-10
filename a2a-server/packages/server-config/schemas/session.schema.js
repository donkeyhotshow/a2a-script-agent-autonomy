/**
 * Session Configuration Schema
 */
import { z } from 'zod';
import { intSchema } from './helpers.js';
export const sessionConfigSchema = z.object({
    timeoutMs: intSchema(60000, 86400000, 3600000),
    maxInactiveMs: intSchema(60000, 43200000, 1800000),
});
