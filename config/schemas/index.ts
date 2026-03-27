/**
 * Configuration Schemas - Barrel Export
 * All domain-specific schemas + root appConfigSchema.
 */

export { portConfigSchema, type PortConfig } from './ports.schema.js';
export { databaseConfigSchema, type DatabaseConfig } from './database.schema.js';
export { aiConfigSchema, type AIConfig } from './ai.schema.js';
export { securityConfigSchema, type SecurityConfig } from './security.schema.js';


// Barrel exports for port, database, ai, and security schemas

import { z } from 'zod';

// Import all schemas
import { portConfigSchema } from './ports.schema.js';
import { databaseConfigSchema } from './database.schema.js';
import { aiConfigSchema } from './ai.schema.js';
import { securityConfigSchema } from './security.schema.js';
import { serverConfigSchema } from './server.schema.js';
import { proxyConfigSchema } from './proxy.schema.js';
import { storageConfigSchema } from './storage.schema.js';
import { loggingConfigSchema } from './logging.schema.js';
import { rateLimitConfigSchema } from './rate-limit.schema.js';
import { queueConfigSchema } from './queue.schema.js';
import { mlConfigSchema } from './ml.schema.js';
import { sessionConfigSchema } from './session.schema.js';
import { plexeConfigSchema } from './plexe.schema.js';
import { requestProcessorConfigSchema } from './request-processor.schema.js';

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
  ml: mlConfigSchema,
  session: sessionConfigSchema,
  plexe: plexeConfigSchema,
  requestProcessor: requestProcessorConfigSchema,
});

export type AppConfig = z.infer<typeof appConfigSchema>;

// Re-export all schemas and types for convenience
export * from './ports.schema.js';
export * from './database.schema.js';
export * from './ai.schema.js';
export * from './security.schema.js';
export * from './server.schema.js';
export * from './proxy.schema.js';
export * from './storage.schema.js';
export * from './logging.schema.js';
export * from './rate-limit.schema.js';
export * from './queue.schema.js';
export * from './ml.schema.js';
export * from './session.schema.js';
export * from './plexe.schema.js';
export * from './request-processor.schema.js';
export { booleanSchema, intSchema, portSchema, urlSchema, minStringSchema, optionalMinStringSchema } from './helpers.js';

