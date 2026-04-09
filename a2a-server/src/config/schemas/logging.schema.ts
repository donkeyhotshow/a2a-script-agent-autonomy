/**
 * Logging Configuration Schema
 */

import { z } from 'zod';

export const loggingConfigSchema = z.object({
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  logFormat: z.enum(['json', 'pretty', 'text']).default('json'),
});

export type LoggingConfig = z.infer<typeof loggingConfigSchema>;

