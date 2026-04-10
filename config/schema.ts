/**
 * Configuration Schema Index
 * Re-exports all schemas from modular config/schemas/ structure.
 */

export * from './schemas/index.js';


// ===========================================
// Helper Schemas
// ===========================================

import { z } from 'zod';

/** Coerce string to boolean */
const booleanSchema = z
    .union([z.boolean(), z.string()])
    .transform((val) => {
        if (typeof val === 'boolean') return val;
        return ['true', '1', 'yes', 'y', 'on', 't'].includes(val.toLowerCase());
    })
    .default(false);

/** Coerce string to integer */
const intSchema = (min: number, max: number, defaultValue: number) =>
    z.coerce.number().int().min(min).max(max).default(defaultValue);

/** Port number schema (1-65535) */
const portSchema = (defaultPort: number) => intSchema(1, 65535, defaultPort);

/** URL string schema */
const urlSchema = (defaultUrl?: string) =>
    defaultUrl ? z.string().url().default(defaultUrl) : z.string().url();

/** String with minimum length */
const minStringSchema = (min: number) => z.string().min(min);

/** Optional string with minimum length */
const optionalMinStringSchema = (min: number) => z.string().min(min).optional();

// ===========================================
// Port Configuration Schema
// ===========================================
export const portConfigSchema = z.object({
    serverPort: portSchema(3000),
    clientApiPort: portSchema(3001),
    webPort: portSchema(5173),
    proxyPort: portSchema(11434),
    localLlmPort: portSchema(11435),
    postgresPort: portSchema(5432),
    redisPort: portSchema(6379),
});

// ===========================================
// Database Configuration Schema
// ===========================================
export const databaseConfigSchema = z.object({
    databaseUrl: urlSchema(),
    redisUrl: urlSchema('redis://localhost:6379'),
    postgresUser: z.string().default('a2a'),
    postgresPassword: z.string().default('a2a_secret'),
    postgresDb: z.string().default('a2a_server'),
});

// ===========================================
// AI/LLM Configuration Schema
// ===========================================
export const aiConfigSchema = z.object({
    localLlmUpstreamUrl: urlSchema('http://localhost:11435'),
    localLlmModel: z.string().default('qwen3:8b'),
    localLlmTimeout: intSchema(1, 3600, 60),
    localLlmModels: z.string().default('~/.compat_llm'),
    localLlmKeepAlive: z.string().default('5m'),
    localLlmIdleTimeout: intSchema(0, 86400, 300),
    localLlmAutoStart: booleanSchema.default(true),
    llmProvider: z.enum(['compat_llm', 'openai', '']).default(''),
    useLocalLlm: booleanSchema.default(false),
    aiHubUrl: urlSchema('http://localhost:11434'),
    pollIntervalMs: intSchema(100, 60000, 2000),
    pollTimeoutMs: intSchema(1000, 600000, 120000),
    openaiApiKey: z.string().optional(),
    openaiModel: z.string().default('gpt-4o-mini'),
});

// ===========================================
// Security Configuration Schema
// ===========================================
export const securityConfigSchema = z.object({
    jwtSecret: minStringSchema(32),
    jwtExpiresIn: z.string().default('1h'),
    jwtRefreshExpiresIn: z.string().default('7d'),
    encryptionKey: optionalMinStringSchema(32),
    skipAuth: booleanSchema.default(false),
    apiKeyPrefix: z.string().default('sk_a2a_'),
});

// ===========================================
// A2A Server Configuration Schema
// ===========================================
export const serverConfigSchema = z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    host: z.string().default('localhost'),
    defaultEmail: z.string().email().default('dev@localhost'),
    defaultPassword: z.string().default('dev'),
});

// ===========================================
// AI Proxy Configuration Schema
// ===========================================
export const proxyConfigSchema = z.object({
    proxyHost: z.string().default('0.0.0.0'),
    storageDir: z.string().default('proxy_logs'),
    promisesDir: z.string().optional(), // Computed from storageDir
    forwardTimeoutSeconds: intSchema(1, 3600, 60),
    promiseTtlSeconds: intSchema(60, 604800, 86400),
    promiseMaxWorkers: intSchema(1, 100, 8),
    aiHubConfig: z.string().optional(),
    localLlmServerHeader: z.string().default('compat_llm'),
    simulationEnabled: booleanSchema.default(false),
    simulationDataPath: z.string().default('simulation_data'),
    healthCheckInterval: intSchema(1, 300, 5),
    healthCheckTimeout: intSchema(1, 300, 5),
});

// ===========================================
// Storage & Paths Configuration Schema
// ===========================================
export const storageConfigSchema = z.object({
    gitSshKeyPath: z.string().default('./ssh_keys'),
    gitCloneBasePath: z.string().default('./repos'),
    fileCachePath: z.string().default('./file_cache'),
    maxFileSizeMb: intSchema(1, 1000, 10),
});

// ===========================================
// Logging Configuration Schema
// ===========================================
export const loggingConfigSchema = z.object({
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    logFormat: z.enum(['json', 'pretty', 'text']).default('json'),
});

// ===========================================
// Rate Limiting Configuration Schema
// ===========================================
export const rateLimitConfigSchema = z.object({
    windowMs: intSchema(1000, 3600000, 60000),
    maxRequests: intSchema(1, 10000, 200),
});

// ===========================================
// Queue Configuration Schema
// ===========================================
export const queueConfigSchema = z.object({
    concurrency: intSchema(1, 100, 5),
    indexingConcurrency: intSchema(1, 50, 2),
});

// ===========================================
// ML/Embeddings Configuration Schema
// ===========================================
export const mlConfigSchema = z.object({
    embeddingDimension: intSchema(1, 4096, 768),
    chunkMaxTokens: intSchema(1, 4096, 512),
    chunkOverlapTokens: intSchema(0, 1024, 50),
});

// ===========================================
// Session Configuration Schema
// ===========================================
export const sessionConfigSchema = z.object({
    timeoutMs: intSchema(60000, 86400000, 3600000),
    maxInactiveMs: intSchema(60000, 43200000, 1800000),
});

// ===========================================
// Plexe ML Configuration Schema
// ===========================================
export const plexeConfigSchema = z.object({
    apiUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
});

// ===========================================
// Request Processor Configuration Schema
// ===========================================
export const requestProcessorConfigSchema = z.object({
    intervalMs: intSchema(100, 60000, 5000),
});

// ===========================================
// Unified Configuration Schema
// ===========================================
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

// ===========================================
// Type Exports
// ===========================================
export type PortConfig = z.infer<typeof portConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type AIConfig = z.infer<typeof aiConfigSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type ProxyConfig = z.infer<typeof proxyConfigSchema>;
export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type QueueConfig = z.infer<typeof queueConfigSchema>;
export type MLConfig = z.infer<typeof mlConfigSchema>;
export type SessionConfig = z.infer<typeof sessionConfigSchema>;
export type PlexeConfig = z.infer<typeof plexeConfigSchema>;
export type RequestProcessorConfig = z.infer<typeof requestProcessorConfigSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;
