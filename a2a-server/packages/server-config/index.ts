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

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  appConfigSchema,
  databaseConfigSchema,
  aiHubConfigSchema,
  securityConfigSchema,
  serverConfigSchema,
  storageConfigSchema,
  loggingConfigSchema,
  rateLimitConfigSchema,
  queueConfigSchema,
  sessionConfigSchema,
  requestProcessorConfigSchema,
  featuresConfigSchema,
} from "./schema.js";
import type { AppConfig, FeaturesConfig } from "./types.js";
import { createFeatureManager } from "./features.js";

// ===========================================
// Environment Setup
// ===========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env from root directory
dotenv.config({ path: path.join(rootDir, ".env") });

// ===========================================
// Environment Variable Mapping
// ===========================================

/**
 * Maps environment variables to configuration structure.
 * Centralizes all env var names for easy reference.
 */
function mapEnvironmentVariables() {
  return {
    // Database
    database: {
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      postgresUser: process.env.POSTGRES_USER,
      postgresPassword: process.env.POSTGRES_PASSWORD,
      postgresDb: process.env.POSTGRES_DB,
    },
    // AI Hub
    aiHub: {
      aiHubUrl: process.env.AI_HUB_URL,
      pollIntervalMs: process.env.POLL_INTERVAL_MS,
      pollTimeoutMs: process.env.POLL_TIMEOUT_MS,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL,
    },
    // Security
    security: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,
      jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
      encryptionKey: process.env.ENCRYPTION_KEY,
      skipAuth: process.env.SKIP_AUTH,
      apiKeyPrefix: process.env.API_KEY_PREFIX,
    },
    // Server
    server: {
      nodeEnv: process.env.NODE_ENV,
      host: process.env.HOST,
      defaultEmail: process.env.A2A_DEFAULT_EMAIL,
      defaultPassword: process.env.A2A_DEFAULT_PASSWORD,
    },

    // Storage
    storage: {
      gitSshKeyPath: process.env.GIT_SSH_KEY_PATH,
      gitCloneBasePath: process.env.GIT_CLONE_BASE_PATH,
      fileCachePath: process.env.FILE_CACHE_PATH,
      maxFileSizeMb: process.env.MAX_FILE_SIZE_MB,
    },
    // Logging
    logging: {
      logLevel: process.env.LOG_LEVEL,
      logFormat: process.env.LOG_FORMAT,
    },
    // Rate Limiting
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS,
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    },
    // Queue
    queue: {
      concurrency: process.env.QUEUE_CONCURRENCY,
      indexingConcurrency: process.env.INDEXING_CONCURRENCY,
    },
    // Session
    session: {
      timeoutMs: process.env.SESSION_TIMEOUT_MS,
      maxInactiveMs: process.env.SESSION_MAX_INACTIVE_MS,
    },
    // Request Processor
    requestProcessor: {
      intervalMs: process.env.REQUEST_PROCESSOR_INTERVAL_MS,
    },
    // Features (enable/disable system mechanisms)
    features: {
      // Core systems (always enabled)
      core: true,
      // AI Hub integration
      aiHub: {
        enabled: process.env.FEATURE_AIHUB_ENABLED,
        polling: process.env.FEATURE_AIHUB_POLLING,
        openai: process.env.FEATURE_AIHUB_OPENAI,
      },
      // P2P networking
      p2p: {
        enabled: process.env.FEATURE_P2P_ENABLED,
        crdt: process.env.FEATURE_P2P_CRDT,
        relay: process.env.FEATURE_P2P_RELAY,
      },
      // Background daemon services
      daemon: {
        enabled: process.env.FEATURE_DAEMON_ENABLED,
        requestProcessing: process.env.FEATURE_DAEMON_REQUEST_PROCESSING,
      },
      actions: {
        enabled: process.env.FEATURE_ACTIONS_ENABLED,
        fileOperations: process.env.FEATURE_ACTIONS_FILE_OPERATIONS,
        gitOperations: process.env.FEATURE_ACTIONS_GIT_OPERATIONS,
        scriptExecution: process.env.FEATURE_ACTIONS_SCRIPT_EXECUTION,
        mcpCalls: process.env.FEATURE_ACTIONS_MCP_CALLS,
      },
      transform: {
        enabled: process.env.FEATURE_TRANSFORM_ENABLED,
        grayRoom: process.env.FEATURE_TRANSFORM_GRAY_ROOM,
        pipeline: process.env.FEATURE_TRANSFORM_PIPELINE,
        interruptHandlers: process.env.FEATURE_TRANSFORM_INTERRUPT_HANDLERS,
      },
      ai: {
        enabled: process.env.FEATURE_AI_ENABLED,
        rag: process.env.FEATURE_AI_RAG,
        agentSwing: process.env.FEATURE_AI_AGENT_SWING,
      },
      monitoring: {
        enabled: process.env.FEATURE_MONITORING_ENABLED,
        metrics: process.env.FEATURE_MONITORING_METRICS,
        logging: process.env.FEATURE_MONITORING_LOGGING,
        healthChecks: process.env.FEATURE_MONITORING_HEALTH_CHECKS,
        notifications: process.env.FEATURE_MONITORING_NOTIFICATIONS,
      },
      security: {
        enabled: process.env.FEATURE_SECURITY_ENABLED,
        auth: process.env.FEATURE_SECURITY_AUTH,
        rateLimiting: process.env.FEATURE_SECURITY_RATE_LIMITING,
        validation: process.env.FEATURE_SECURITY_VALIDATION,
      },
      storage: {
        enabled: process.env.FEATURE_STORAGE_ENABLED,
        database: process.env.FEATURE_STORAGE_DATABASE,
        redis: process.env.FEATURE_STORAGE_REDIS,
        fileCache: process.env.FEATURE_STORAGE_FILE_CACHE,
        gitRepos: process.env.FEATURE_STORAGE_GIT_REPOS,
      },
      api: {
        enabled: process.env.FEATURE_API_ENABLED,
        rest: process.env.FEATURE_API_REST,
        websocket: process.env.FEATURE_API_WEBSOCKET,
        graphql: process.env.FEATURE_API_GRAPHQL,
      },
    },
  };
}

// ===========================================
// Validation Functions
// ===========================================

/**
 * Formats Zod validation errors into human-readable messages.
 */
function formatValidationErrors(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.join(".");
    const message = issue.message;
    return `  - ${path}: ${message}`;
  });
  return lines.join("\n");
}

/**
 * Validates configuration and returns typed config object.
 * Throws error with detailed message if validation fails.
 */
export function validateConfig(): AppConfig {
  const rawConfig = mapEnvironmentVariables();
  return appConfigSchema.parse(rawConfig);
}

/**
 * Validates configuration without throwing.
 * Returns result object with success status and either config or errors.
 */
export function validateConfigSafe():
  | { success: true; config: AppConfig; errors: null }
  | { success: false; config: null; errors: string[] } {
  const rawConfig = mapEnvironmentVariables();

  try {
    // Compute promisesDir from storageDir if not set
    if (!rawConfig.proxy.promisesDir && rawConfig.proxy.storageDir) {
      rawConfig.proxy.promisesDir = `${rawConfig.proxy.storageDir}/promises`;
    }

    const config = appConfigSchema.parse(rawConfig);
    return { success: true, config, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return `${path}: ${issue.message}`;
      });
      return { success: false, config: null, errors };
    }
    throw error;
  }
}

// ===========================================
// Individual Section Validators
// ===========================================

/**
 * Validates only port configuration.
 * Useful for service startup validation.
 */
export function validatePorts() {
  const raw = {
    serverPort: process.env.SERVER_PORT,
    clientApiPort: process.env.CLIENT_API_PORT,
    webPort: process.env.WEB_PORT,
    postgresPort: process.env.POSTGRES_PORT,
    redisPort: process.env.REDIS_PORT,
  };
  // Port validation removed as portConfigSchema was removed
  // This function should be updated or removed
  return {};
}

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
// Exported Configuration
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

/**
 * Re-export schemas for advanced usage
 */
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
};

/**
 * Re-export feature management utilities
 */
export {
  createFeatureManager,
  loadServiceIfEnabled,
  loadMiddlewareIfEnabled,
} from "./features.js";

// ===========================================
// Default Export
// ===========================================
export default config;
