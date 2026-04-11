/**
 * AI Proxy Configuration Schema
 */

import { z } from 'zod';
import { booleanSchema, intSchema } from './helpers';

export const proxyConfigSchema = z.object({
  proxyHost: z.string().default('0.0.0.0'),
  storageDir: z.string().default('proxy_logs'),
  promisesDir: z.string().optional(),
  forwardTimeoutSeconds: intSchema(1, 3600, 60),
  promiseTtlSeconds: intSchema(60, 604800, 86400),
  promiseMaxWorkers: intSchema(1, 100, 8),
  aiHubConfig: z.string().optional(),
  localLlmServerHeader: z.string().default('compat_llm'),
  simulationEnabled: booleanSchema.default(false),
  simulationDataPath: z.string().default('simulation_data'),
  healthCheckInterval: intSchema(1, 300, 5),
  healthCheckTimeout: intSchema(1, 300, 5),
});

export type ProxyConfig = z.infer<typeof proxyConfigSchema>;

