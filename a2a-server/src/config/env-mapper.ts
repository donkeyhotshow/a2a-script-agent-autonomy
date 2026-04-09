/**
 * Environment Variable Mapper
 * Maps process.env to raw config structure.
 */

import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env from root directory
dotenv.config({path: path.join(rootDir, '.env')});

/**
 * Raw environment variable mapping.
 * Centralizes all env var names.
 */
export function mapEnvironmentVariables() {
    return {
        // Ports
        ports: {
            serverPort: process.env.SERVER_PORT,
            clientApiPort: process.env.CLIENT_API_PORT,
            webPort: process.env.WEB_PORT,
            proxyPort: process.env.PROXY_PORT,
            localLlmPort: process.env.LOCAL_LLM_PORT,
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
            localLlmUpstreamUrl: process.env.LOCAL_LLM_UPSTREAM_URL,
            localLlmModel: process.env.LOCAL_LLM_MODEL,
            localLlmTimeout: process.env.LOCAL_LLM_TIMEOUT,
            localLlmModels: process.env.LOCAL_LLM_MODELS,
            localLlmKeepAlive: process.env.LOCAL_LLM_KEEP_ALIVE,
            localLlmIdleTimeout: process.env.LOCAL_LLM_IDLE_TIMEOUT,
            localLlmAutoStart: process.env.LOCAL_LLM_AUTO_START,
            llmProvider: process.env.LLM_PROVIDER,
            useLocalLlm: process.env.USE_LOCAL_LLM,
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
            localLlmServerHeader: process.env.LOCAL_LLM_SERVER_HEADER,
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
        // Request Processor
        requestProcessor: {
            intervalMs: process.env.REQUEST_PROCESSOR_INTERVAL_MS,
        },
    };
}

export type RawConfig = ReturnType<typeof mapEnvironmentVariables>;

