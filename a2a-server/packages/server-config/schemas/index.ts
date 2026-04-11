/**
 * Configuration Schemas - Barrel Export
 * All domain-specific schemas + root appConfigSchema.
 */

export { portConfigSchema, type PortConfig } from './ports.schema';
export { databaseConfigSchema, type DatabaseConfig } from './database.schema';
export { aiConfigSchema, type AIConfig } from './ai.schema';
export { securityConfigSchema, type SecurityConfig } from './security.schema';


// Barrel exports for port, database, ai, and security schemas

import { z } from 'zod';

// Import all schemas
import { portConfigSchema } from './ports.schema';
import { databaseConfigSchema } from './database.schema';
import { aiConfigSchema } from './ai.schema';
import { securityConfigSchema } from './security.schema';
import { serverConfigSchema } from './server.schema';
import { proxyConfigSchema } from './proxy.schema';
import { storageConfigSchema } from './storage.schema';
import { loggingConfigSchema } from './logging.schema';
import { rateLimitConfigSchema } from './rate-limit.schema';
import { queueConfigSchema } from './queue.schema';
import { sessionConfigSchema } from './session.schema';
import { requestProcessorConfigSchema } from './request-processor.schema';

// Complete root appConfigSchema
export const appConfigSchema = z.object({
  ports: portConfigSchema,
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
export * from './ports.schema';
export * from './database.schema';
export * from './ai.schema';
export * from './security.schema';
export * from './server.schema';
export * from './proxy.schema';
export * from './storage.schema';
export * from './logging.schema';
export * from './rate-limit.schema';
export * from './queue.schema';
export * from './session.schema';
export * from './request-processor.schema';
export { booleanSchema, intSchema, portSchema, urlSchema, minStringSchema, optionalMinStringSchema } from './helpers';

