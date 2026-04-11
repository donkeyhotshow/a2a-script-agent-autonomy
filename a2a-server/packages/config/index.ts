/**
 * Centralized Configuration Loader
 *
 * Barrel file that re-exports all configuration utilities.
 * Single Source of Truth pattern - imports should go through this file.
 *
 * Usage:
 *   import { config, validateConfig, mapEnvironmentVariables } from '@a2a/config';
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
export type { RawConfig } from "./env-mapper.js";

// Validation functions (loader.ts is source of truth)
export {
  validateConfig,
  validateConfigSafe,
  validatePorts,
} from "./loader.js";

// Schemas (schema.ts is source of truth)
export {
  appConfigSchema,
  portConfigSchema,
  databaseConfigSchema,
  aiConfigSchema,
  aiHubConfigSchema,
  securityConfigSchema,
  serverConfigSchema,
  proxyConfigSchema,
  storageConfigSchema,
  loggingConfigSchema,
  rateLimitConfigSchema,
  queueConfigSchema,
  mlConfigSchema,
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
// Exported Configuration Singleton
// ===========================================

// Import config and features from loader (which imports from env-mapper + schema)
import { validateConfig as loadConfig } from "./loader.js";
import { createFeatureManager } from "./features.js";
import type { AppConfig } from "./types.js";

/**
 * Validated configuration object.
 * Throws on startup if configuration is invalid.
 */
export const config: AppConfig = loadConfig();

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