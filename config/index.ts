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

import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';
import {z} from 'zod';
import {
    appConfigSchema,
    portConfigSchema,
    databaseConfigSchema,
    aiConfigSchema,
    securityConfigSchema,
    serverConfigSchema,
    proxyConfigSchema,
    storageConfigSchema,
    loggingConfigSchema,
    rateLimitConfigSchema,
    queueConfigSchema,
    mlConfigSchema,
    sessionConfigSchema,
    plexeConfigSchema,
    websocketConfigSchema,
    requestProcessorConfigSchema,
} from './schema.js';
import type {AppConfig} from './types.js';

// ===========================================
// Environment Setup
// ===========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env from root directory
dotenv.config({path: path.join(rootDir, '.env')});

// ===========================================
// Environment Variable Mapping
// ===========================================

/**
 * Maps environment variables to configuration structure.
 * Centralizes all env var names for easy reference.
 */
function mapEnvironmentVariables() {
    return {
        // Ports
        ports: {
            serverPort: process.env.SERVER_PORT,
            clientApiPort: process.env.CLIENT_API_PORT,
            webPort: process.env.WEB_PORT,
            proxyPort: process.env.PROXY_PORT,
            ollamaPort: process.env.OLLAMA_PORT,
            postgresPort: process.env.POSTGRES_PORT,
            redisPort: process.env.REDIS_PORT,
        },
        // Database
        database: {
            databaseUrl: process.env.DATABASE_URL,
            redisUrl: process.env.REDIS_URL,
            postgresUser: process.env.POSTGRES_USER,
            postgresPassword: process.env.POSTGRES_PASSWORD,
            postgresDb: process.env.POSTGRES_DB,
        },
        // AI/LLM
        ai: {
            ollamaHost: process.env.OLLAMA_HOST,
            ollamaModel: process.env.OLLAMA_MODEL,
            ollamaTimeout: process.env.OLLAMA_TIMEOUT,
            ollamaModels: process.env.OLLAMA_MODELS,
            ollamaKeepAlive: process.env.OLLAMA_KEEP_ALIVE,
            ollamaIdleTimeout: process.env.OLLAMA_IDLE_TIMEOUT,
            ollamaAutoStart: process.env.OLLAMA_AUTO_START,
            llmProvider: process.env.LLM_PROVIDER,
            useOllama: process.env.USE_OLLAMA,
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
        // Proxy
        proxy: {
            proxyHost: process.env.PROXY_HOST,
            storageDir: process.env.STORAGE_DIR,
            promisesDir: process.env.PROMISES_DIR,
            forwardTimeoutSeconds: process.env.FORWARD_TIMEOUT_SECONDS,
            promiseTtlSeconds: process.env.PROMISE_TTL_SECONDS,
            promiseMaxWorkers: process.env.PROMISE_MAX_WORKERS,
            aiHubConfig: process.env.AI_HUB_CONFIG,
            ollamaServerHeader: process.env.OLLAMA_SERVER_HEADER,
            simulationEnabled: process.env.SIMULATION_ENABLED,
            simulationDataPath: process.env.SIMULATION_DATA_PATH,
            healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL,
            healthCheckTimeout: process.env.HEALTH_CHECK_TIMEOUT,
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
        // ML/Embeddings
        ml: {
            embeddingDimension: process.env.EMBEDDING_DIMENSION,
            chunkMaxTokens: process.env.CHUNK_MAX_TOKENS,
            chunkOverlapTokens: process.env.CHUNK_OVERLAP_TOKENS,
        },
        // Session
        session: {
            timeoutMs: process.env.SESSION_TIMEOUT_MS,
            maxInactiveMs: process.env.SESSION_MAX_INACTIVE_MS,
        },
        // Plexe
        plexe: {
            apiUrl: process.env.PLEXE_API_URL,
            apiKey: process.env.PLEXE_API_KEY,
        },
        // WebSocket
        websocket: {
            port: process.env.WS_PORT,
            heartbeatIntervalMs: process.env.WS_HEARTBEAT_INTERVAL_MS,
        },
        // Request Processor
        requestProcessor: {
            intervalMs: process.env.REQUEST_PROCESSOR_INTERVAL_MS,
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
        const path = issue.path.join('.');
        const message = issue.message;
        return `  - ${path}: ${message}`;
    });
    return lines.join('\n');
}

/**
 * Validates configuration and returns typed config object.
 * Throws error with detailed message if validation fails.
 */
export function validateConfig(): AppConfig {
    const rawConfig = mapEnvironmentVariables();
    
    try {
        // Compute promisesDir from storageDir if not set
        if (!rawConfig.proxy.promisesDir && rawConfig.proxy.storageDir) {
            rawConfig.proxy.promisesDir = `${rawConfig.proxy.storageDir}/promises`;
        }
        
        return appConfigSchema.parse(rawConfig);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = formatValidationErrors(error);
            throw new Error(
                `Configuration validation failed. Please check your .env file:\n${errorMessage}\n\n` +
                `See docs/CONFIGURATION.md for detailed documentation.`
            );
        }
        throw error;
    }
}

/**
 * Validates configuration without throwing.
 * Returns result object with success status and either config or errors.
 */
export function validateConfigSafe():
    | {success: true; config: AppConfig; errors: null}
    | {success: false; config: null; errors: string[]} {
    const rawConfig = mapEnvironmentVariables();
    
    try {
        // Compute promisesDir from storageDir if not set
        if (!rawConfig.proxy.promisesDir && rawConfig.proxy.storageDir) {
            rawConfig.proxy.promisesDir = `${rawConfig.proxy.storageDir}/promises`;
        }
        
        const config = appConfigSchema.parse(rawConfig);
        return {success: true, config, errors: null};
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues.map((issue) => {
                const path = issue.path.join('.');
                return `${path}: ${issue.message}`;
            });
            return {success: false, config: null, errors};
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
        proxyPort: process.env.PROXY_PORT,
        ollamaPort: process.env.OLLAMA_PORT,
        postgresPort: process.env.POSTGRES_PORT,
        redisPort: process.env.REDIS_PORT,
    };
    return portConfigSchema.parse(raw);
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
 * Validates only AI configuration.
 */
export function validateAI() {
    const raw = {
        ollamaHost: process.env.OLLAMA_HOST,
        ollamaModel: process.env.OLLAMA_MODEL,
        ollamaTimeout: process.env.OLLAMA_TIMEOUT,
        ollamaModels: process.env.OLLAMA_MODELS,
        ollamaKeepAlive: process.env.OLLAMA_KEEP_ALIVE,
        ollamaIdleTimeout: process.env.OLLAMA_IDLE_TIMEOUT,
        ollamaAutoStart: process.env.OLLAMA_AUTO_START,
        llmProvider: process.env.LLM_PROVIDER,
        useOllama: process.env.USE_OLLAMA,
        aiHubUrl: process.env.AI_HUB_URL,
        pollIntervalMs: process.env.POLL_INTERVAL_MS,
        pollTimeoutMs: process.env.POLL_TIMEOUT_MS,
        openaiApiKey: process.env.OPENAI_API_KEY,
        openaiModel: process.env.OPENAI_MODEL,
    };
    return aiConfigSchema.parse(raw);
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
 * Environment helpers
 */
export const isDevelopment = config.server.nodeEnv === 'development';
export const isProduction = config.server.nodeEnv === 'production';
export const isTest = config.server.nodeEnv === 'test';

/**
 * Re-export schemas for advanced usage
 */
export {
    appConfigSchema,
    portConfigSchema,
    databaseConfigSchema,
    aiConfigSchema,
    securityConfigSchema,
    serverConfigSchema,
    proxyConfigSchema,
    storageConfigSchema,
    loggingConfigSchema,
    rateLimitConfigSchema,
    queueConfigSchema,
    mlConfigSchema,
    sessionConfigSchema,
    plexeConfigSchema,
    websocketConfigSchema,
    requestProcessorConfigSchema,
};

// ===========================================
// Default Export
// ===========================================
export default config;
