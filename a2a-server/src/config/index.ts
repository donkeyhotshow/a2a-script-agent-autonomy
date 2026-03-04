/**
 * A2A Server Configuration
 *
 * Type-safe configuration with Zod validation.
 * Validates on startup with fail-fast behavior.
 *
 * @see docs/CONFIGURATION.md for full documentation
 */

import dotenv from 'dotenv';
import path from 'path';
import {z} from 'zod';

// Load a2a-server .env first (same DB as Prisma migrations), then repo root .env
const serverRoot = path.resolve(__dirname, '../..');
dotenv.config({path: path.join(serverRoot, '.env')});
dotenv.config({path: path.resolve(serverRoot, '../../.env')});

// ===========================================
// Helper Schemas
// ===========================================

/** Coerce string to integer with bounds */
const int = (min: number, max: number, defaultValue: number) =>
    z.coerce.number().int().min(min).max(max).default(defaultValue);

/** Port number (1-65535) */
const port = (defaultPort: number) => int(1, 65535, defaultPort);

/** Boolean from various string formats */
const boolean = z
    .union([z.boolean(), z.string()])
    .transform((val) => {
        if (typeof val === 'boolean') return val;
        return ['true', '1', 'yes', 'y', 'on', 't'].includes(val.toLowerCase());
    })
    .default(false);

// ===========================================
// Configuration Schema
// ===========================================

const configSchema = z.object({
    // ===========================================
    // Server
    // ===========================================
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: port(3000),
    host: z.string().default('localhost'),

    // ===========================================
    // Database
    // ===========================================
    databaseUrl: z.string().url(),
    redisUrl: z.string().url().default('redis://localhost:6379'),

    // ===========================================
    // Authentication & Security
    // ===========================================
    jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    jwtExpiresIn: z.string().default('1h'),
    jwtRefreshExpiresIn: z.string().default('7d'),
    apiKeyPrefix: z.string().default('sk_a2a_'),
    encryptionKey: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 characters').optional(),
    skipAuth: boolean.default(false),

    // ===========================================
    // Default User (Development)
    // ===========================================
    defaultEmail: z.string().email().default('dev@localhost'),
    defaultPassword: z.string().default('dev'),

    // ===========================================
    // AI / LLM Integration
    // ===========================================
    llmProvider: z.enum(['ollama', 'openai', '']).default(''),
    useOllama: boolean.default(false),
    aiHubUrl: z.string().url().default('http://localhost:11434'),
    ollamaModel: z.string().default('llama3'),
    pollIntervalMs: int(100, 60000, 2000),
    pollTimeoutMs: int(1000, 600000, 120000),
    openaiApiKey: z.string().optional(),
    openaiModel: z.string().default('gpt-4o-mini'),

    // ===========================================
    // Plexe ML
    // ===========================================
    plexeApiUrl: z.string().url().optional(),
    plexeApiKey: z.string().optional(),

    // ===========================================
    // Git
    // ===========================================
    gitSshKeyPath: z.string().default('./ssh_keys'),
    gitCloneBasePath: z.string().default('./repos'),

    // ===========================================
    // File Storage
    // ===========================================
    fileCachePath: z.string().default('./file_cache'),
    maxFileSizeMb: int(1, 1000, 10),

    // ===========================================
    // Rate Limiting
    // ===========================================
    rateLimitWindowMs: int(1000, 3600000, 60000),
    rateLimitMaxRequests: int(1, 10000, 200),

    // ===========================================
    // Logging
    // ===========================================
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    logFormat: z.enum(['json', 'pretty']).default('json'),

    // ===========================================
    // Queue (BullMQ)
    // ===========================================
    queueConcurrency: int(1, 100, 5),
    indexingConcurrency: int(1, 50, 2),
    queueMaxRetries: int(1, 20, 5),
    queueBackoffDelayMs: int(100, 60000, 1000),
    queueBackoffMultiplier: int(1, 10, 2),
    queueMaxDelayMs: int(1000, 300000, 60000),

    // ===========================================
    // ML / Embeddings
    // ===========================================
    embeddingDimension: int(1, 4096, 768),
    chunkMaxTokens: int(1, 4096, 512),
    chunkOverlapTokens: int(0, 1024, 50),

    // ===========================================
    // Session
    // ===========================================
    sessionTimeoutMs: int(60000, 86400000, 3600000),
    sessionMaxInactiveMs: int(60000, 43200000, 1800000),

    // ===========================================
    // WebSocket
    // ===========================================
    wsPort: port(3001),
    wsHeartbeatIntervalMs: int(1000, 300000, 30000),

    // ===========================================
    // Request Processor (Timer Loop)
    // ===========================================
    requestProcessorIntervalMs: int(100, 60000, 5000),

    // ===========================================
    // Polling Optimization
    // ===========================================
    useAdaptivePolling: boolean.default(true),
    pollingMinIntervalMs: int(100, 60000, 1000),
    pollingMaxIntervalMs: int(1000, 300000, 60000),
    pollingBackoffFactor: z.coerce.number().min(1).max(5).default(1.5),
    pollingAccelerationFactor: z.coerce.number().min(0.1).max(1).default(0.5),
    pollingEmptyThreshold: int(1, 10, 3),
    pollingCircuitBreakerThreshold: int(1, 20, 5),
    pollingCircuitBreakerTimeoutMs: int(5000, 300000, 30000),

    // ===========================================
    // Webhook
    // ===========================================
    webhookEnabled: boolean.default(false),
    webhookTimeoutMs: int(1000, 60000, 30000),
    webhookMaxRetries: int(1, 10, 5),
    webhookSecret: z.string().optional(),

    // ===========================================
    // Metrics
    // ===========================================
    metricsEnabled: boolean.default(true),
    metricsExportIntervalMs: int(1000, 60000, 10000),
});

// ===========================================
// Environment Variable Mapping
// ===========================================

function mapEnvironmentVariables() {
    return {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        host: process.env.HOST,
        databaseUrl: process.env.DATABASE_URL,
        redisUrl: process.env.REDIS_URL,
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN,
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        apiKeyPrefix: process.env.API_KEY_PREFIX,
        encryptionKey: process.env.ENCRYPTION_KEY,
        skipAuth: process.env.SKIP_AUTH,
        defaultEmail: process.env.A2A_DEFAULT_EMAIL,
        defaultPassword: process.env.A2A_DEFAULT_PASSWORD,
        llmProvider: process.env.LLM_PROVIDER,
        useOllama: process.env.USE_OLLAMA,
        aiHubUrl: process.env.AI_HUB_URL,
        ollamaModel: process.env.OLLAMA_MODEL,
        pollIntervalMs: process.env.POLL_INTERVAL_MS,
        pollTimeoutMs: process.env.POLL_TIMEOUT_MS,
        openaiApiKey: process.env.OPENAI_API_KEY,
        openaiModel: process.env.OPENAI_MODEL,
        plexeApiUrl: process.env.PLEXE_API_URL,
        plexeApiKey: process.env.PLEXE_API_KEY,
        gitSshKeyPath: process.env.GIT_SSH_KEY_PATH,
        gitCloneBasePath: process.env.GIT_CLONE_BASE_PATH,
        fileCachePath: process.env.FILE_CACHE_PATH,
        maxFileSizeMb: process.env.MAX_FILE_SIZE_MB,
        rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
        rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
        logLevel: process.env.LOG_LEVEL,
        logFormat: process.env.LOG_FORMAT,
        queueConcurrency: process.env.QUEUE_CONCURRENCY,
        indexingConcurrency: process.env.INDEXING_CONCURRENCY,
        embeddingDimension: process.env.EMBEDDING_DIMENSION,
        chunkMaxTokens: process.env.CHUNK_MAX_TOKENS,
        chunkOverlapTokens: process.env.CHUNK_OVERLAP_TOKENS,
        sessionTimeoutMs: process.env.SESSION_TIMEOUT_MS,
        sessionMaxInactiveMs: process.env.SESSION_MAX_INACTIVE_MS,
        wsPort: process.env.WS_PORT,
        wsHeartbeatIntervalMs: process.env.WS_HEARTBEAT_INTERVAL_MS,
        requestProcessorIntervalMs: process.env.REQUEST_PROCESSOR_INTERVAL_MS,
        // Queue
        queueMaxRetries: process.env.QUEUE_MAX_RETRIES,
        queueBackoffDelayMs: process.env.QUEUE_BACKOFF_DELAY_MS,
        queueBackoffMultiplier: process.env.QUEUE_BACKOFF_MULTIPLIER,
        queueMaxDelayMs: process.env.QUEUE_MAX_DELAY_MS,
        // Polling
        useAdaptivePolling: process.env.USE_ADAPTIVE_POLLING,
        pollingMinIntervalMs: process.env.POLLING_MIN_INTERVAL_MS,
        pollingMaxIntervalMs: process.env.POLLING_MAX_INTERVAL_MS,
        pollingBackoffFactor: process.env.POLLING_BACKOFF_FACTOR,
        pollingAccelerationFactor: process.env.POLLING_ACCELERATION_FACTOR,
        pollingEmptyThreshold: process.env.POLLING_EMPTY_THRESHOLD,
        pollingCircuitBreakerThreshold: process.env.POLLING_CIRCUIT_BREAKER_THRESHOLD,
        pollingCircuitBreakerTimeoutMs: process.env.POLLING_CIRCUIT_BREAKER_TIMEOUT_MS,
        // Webhook
        webhookEnabled: process.env.WEBHOOK_ENABLED,
        webhookTimeoutMs: process.env.WEBHOOK_TIMEOUT_MS,
        webhookMaxRetries: process.env.WEBHOOK_MAX_RETRIES,
        webhookSecret: process.env.WEBHOOK_SECRET,
        // Metrics
        metricsEnabled: process.env.METRICS_ENABLED,
        metricsExportIntervalMs: process.env.METRICS_EXPORT_INTERVAL_MS,
    };
}

// ===========================================
// Configuration Loader
// ===========================================

function formatValidationErrors(error: z.ZodError): string {
    const lines = error.issues.map((issue) => {
        const path = issue.path.join('.');
        const message = issue.message;
        return `  - ${path}: ${message}`;
    });
    return lines.join('\n');
}

function loadConfig() {
    const rawConfig = mapEnvironmentVariables();

    try {
        return configSchema.parse(rawConfig);
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

// ===========================================
// Export Configuration
// ===========================================

export const config = loadConfig();

/** Configuration type inferred from schema */
export type Config = z.infer<typeof configSchema>;

/** Schema for advanced usage */
export {configSchema};

// ===========================================
// Environment Helpers
// ===========================================

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';

// ===========================================
// Security Warnings
// ===========================================

if (isProduction && config.skipAuth) {
    console.warn('⚠️  WARNING: SKIP_AUTH is enabled in production! This is a security risk.');
}

if (isProduction && config.jwtSecret === 'your-super-secret-jwt-key-min-32-chars') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET in production! Change this immediately.');
}
