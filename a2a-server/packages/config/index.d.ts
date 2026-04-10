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
import { appConfigSchema, databaseConfigSchema, aiHubConfigSchema, securityConfigSchema, serverConfigSchema, storageConfigSchema, loggingConfigSchema, rateLimitConfigSchema, queueConfigSchema, sessionConfigSchema, requestProcessorConfigSchema, featuresConfigSchema } from "./schema.js";
import type { AppConfig } from "./types.js";
/**
 * Validates configuration and returns typed config object.
 * Throws error with detailed message if validation fails.
 */
export declare function validateConfig(): AppConfig;
/**
 * Validates configuration without throwing.
 * Returns result object with success status and either config or errors.
 */
export declare function validateConfigSafe(): {
    success: true;
    config: AppConfig;
    errors: null;
} | {
    success: false;
    config: null;
    errors: string[];
};
/**
 * Validates only port configuration.
 * Useful for service startup validation.
 */
export declare function validatePorts(): {};
/**
 * Validates only database configuration.
 */
export declare function validateDatabase(): {
    databaseUrl: string;
    redisUrl: string;
    postgresUser: string;
    postgresPassword: string;
    postgresDb: string;
};
/**
 * Validates only security configuration.
 */
export declare function validateSecurity(): {
    jwtSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    skipAuth: boolean;
    apiKeyPrefix: string;
    encryptionKey?: string | undefined;
};
/**
 * Validates only AI Hub configuration.
 */
export declare function validateAIHub(): {
    aiHubUrl: string;
    pollIntervalMs: number;
    pollTimeoutMs: number;
    openaiModel: string;
    openaiApiKey?: string | undefined;
};
/**
 * Validated configuration object.
 * Throws on startup if configuration is invalid.
 */
export declare const config: AppConfig;
/**
 * Feature manager for checking enabled features
 */
export declare const features: import("./features.js").FeatureManager;
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
export { createFeatureManager, loadServiceIfEnabled, loadMiddlewareIfEnabled, } from "./features.js";
export default config;
//# sourceMappingURL=index.d.ts.map