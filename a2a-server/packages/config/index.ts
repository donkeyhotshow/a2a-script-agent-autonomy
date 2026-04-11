/**
 * Centralized Configuration Loader
 *
 * Loads and validates environment variables using Zod schemas.
 * Provides type-safe configuration with fail-fast validation.
 *
 * Usage:
 *   import { config, validateConfig } from './config/index.js';
 *
 *   // Access validated config
 *   const port = config.ports.serverPort;
 *
 *   // Validate programmatically
 *   validateConfig(); // Throws on invalid config
 */

// ===========================================
// Single Source of Truth: re-exports from modular files
// ===========================================

// Environment variable mapping (env-mapper.ts is source of truth)
export { mapEnvironmentVariables } from "./env-mapper.js";

// Validation functions (loader.ts is source of truth)
export {
  validateConfig,
  validateConfigSafe,
  validatePorts,
} from "./loader.js";

// Schemas (schema.ts is source of truth)
export {
  appConfigSchema,
  databaseConfigSchema,
  aiHubConfigSchema,
  securityConfigSchema,
  serverConfigSchema,
  proxyConfigSchema,
  storageConfigSchema,
  loggingConfigSchema,
  rateLimitConfigSchema,
  queueConfigSchema,
  sessionConfigSchema,
  requestProcessorConfigSchema,
  featuresConfigSchema,
} from "./schema.js";

// Feature management utilities
export {
  createFeatureManager,
  loadServiceIfEnabled,
  loadMiddlewareIfEnabled,
} from "./features.js";

// ===========================================
// Individual Section Validators (kept for backwards-compatibility)
// ===========================================
import { databaseConfigSchema, aiHubConfigSchema, securityConfigSchema } from "./schema.js";
import { createFeatureManager } from "./features.js";
import { validateConfig } from "./loader.js";
import type { AppConfig } from "./types.js";

/**
 * Validates only database configuration.
 */
export function validateDatabase() {
  const raw = {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    postgresUser: process.env.POSTGRES_USER,
    postgresPassword: process.env.POSTGRES_PASSWORD,
    postgresDb: process.env.POSTGRES_DB,
  };
  return databaseConfigSchema.parse(raw);
}

/**
 * Validates only security configuration.
 */
export function validateSecurity() {
  const raw = {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    encryptionKey: process.env.ENCRYPTION_KEY,
    skipAuth: process.env.SKIP_AUTH,
    apiKeyPrefix: process.env.API_KEY_PREFIX,
  };
  return securityConfigSchema.parse(raw);
}

/**
 * Validates only AI Hub configuration.
 */
export function validateAIHub() {
  const raw = {
    aiHubUrl: process.env.AI_HUB_URL,
    pollIntervalMs: process.env.POLL_INTERVAL_MS,
    pollTimeoutMs: process.env.POLL_TIMEOUT_MS,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
  };
  return aiHubConfigSchema.parse(raw);
}

// ===========================================
// Exported Configuration Singleton
// ===========================================

/**
 * Validated configuration object.
 * Throws on startup if configuration is invalid.
 */
export const config: AppConfig = validateConfig();

/**
 * Feature manager for checking enabled features
 */
export const features = createFeatureManager(config.features);

/**
 * Environment helpers
 */
export const isDevelopment = config.server.nodeEnv === "development";
export const isProduction = config.server.nodeEnv === "production";
export const isTest = config.server.nodeEnv === "test";

// ===========================================
// Default Export
// ===========================================
export default config;
