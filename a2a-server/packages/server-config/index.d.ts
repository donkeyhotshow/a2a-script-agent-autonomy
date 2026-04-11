/**
 * Centralized Configuration Loader
 *
 * Loads and validates environment variables using Zod schemas.
 * Provides type-safe configuration with fail-fast validation.
 *
 * Usage:
 *   import { config, validateConfig } from './config/index';
 *
 *   // Access validated config
 *   const port = config.ports.serverPort;
 *
 *   // Validate programmatically
 *   validateConfig(); // Throws on invalid config
 */
import { appConfigSchema, databaseConfigSchema, aiHubConfigSchema, securityConfigSchema, serverConfigSchema, storageConfigSchema, loggingConfigSchema, rateLimitConfigSchema, queueConfigSchema, sessionConfigSchema, requestProcessorConfigSchema, featuresConfigSchema } from "./schema";
import type { AppConfig } from "./types";
/**
 * Validated configuration object.
 * Throws on startup if configuration is invalid.
 */
export declare const config: AppConfig;
/**
 * Feature manager for checking enabled features
 */
export declare const features: import("./features").FeatureManager;
/**
 * Environment helpers
 */
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
/**
 * Re-export schemas for advanced usage
 */
export { appConfigSchema, databaseConfigSchema, aiHubConfigSchema, securityConfigSchema, serverConfigSchema, proxyConfigSchema, storageConfigSchema, loggingConfigSchema, rateLimitConfigSchema, queueConfigSchema, sessionConfigSchema, requestProcessorConfigSchema, featuresConfigSchema, };
/**
 * Re-export feature management utilities
 */
export { createFeatureManager, loadServiceIfEnabled, loadMiddlewareIfEnabled, } from "./features";
export default config;
//# sourceMappingURL=index.d.ts.map