/**
 * Configuration Schemas - Barrel Export
 * All domain-specific schemas + root appConfigSchema.
 */

import { z } from 'zod';

// Import all schemas
import { portConfigSchema } from './ports.schema.js';
// @ts-expect-error database.schema.js is a compiled JS file without a .d.ts
import { databaseConfigSchema } from './database.schema.js';
import { aiSchema as aiConfigSchema } from './ai.schema.js';
import { securityConfigSchema } from './security.schema.js';
import { serverSchema as serverConfigSchema } from './server.schema.js';
import { proxyConfigSchema } from './proxy.schema.js';
import { storageConfigSchema } from './storage.schema.js';
import { loggingConfigSchema } from './logging.schema.js';
import { rateLimitConfigSchema } from './rate-limit.schema.js';
import { queueConfigSchema } from './queue.schema.js';
import { sessionConfigSchema } from './session.schema.js';
import { requestProcessorConfigSchema } from './request-processor.schema.js';

// Complete root appConfigSchema
export const appConfigSchema = z.object({
  ports: portConfigSchema,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  database: databaseConfigSchema,
  ai: aiConfigSchema,
  security: securityConfigSchema,
  server: serverConfigSchema,
  proxy: proxyConfigSchema,
  storage: storageConfigSchema,
  logging: loggingConfigSchema,
  rateLimit: rateLimitConfigSchema,
  queue: queueConfigSchema,
  session: sessionConfigSchema,
  requestProcessor: requestProcessorConfigSchema,
});

export type AppConfig = z.infer<typeof appConfigSchema>;

// Re-export all schemas and types for convenience
export * from './ports.schema.js';
export * from './ai.schema.js';
export * from './security.schema.js';
export * from './server.schema.js';
export * from './proxy.schema.js';
export * from './storage.schema.js';
export * from './logging.schema.js';
export * from './rate-limit.schema.js';
export * from './queue.schema.js';
export * from './session.schema.js';
export * from './request-processor.schema.js';
export { booleanSchema, intSchema, portSchema, urlSchema, minStringSchema, optionalMinStringSchema } from './helpers.js';

// Named re-exports for renamed schemas
export { aiSchema as aiConfigSchema, type AiConfig } from './ai.schema.js';
export { serverSchema as serverConfigSchema, type ServerConfig } from './server.schema.js';
export { portConfigSchema, type PortConfig } from './ports.schema.js';
export { securityConfigSchema, type SecurityConfig } from './security.schema.js';
