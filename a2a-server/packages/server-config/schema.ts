/**
 * Configuration Schema Index
 * Re-exports all schemas from modular config/schemas/ structure.
 */

export * from "./schemas/index.js";

// ===========================================
// Helper Schemas
// ===========================================

import { z } from "zod";

/** Coerce string to boolean */
const booleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === "boolean") return val;
    return ["true", "1", "yes", "y", "on", "t"].includes(val.toLowerCase());
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
// Database Configuration Schema
// ===========================================
export const databaseConfigSchema = z.object({
  databaseUrl: urlSchema(),
  redisUrl: urlSchema("redis://localhost:6379"),
  postgresUser: z.string().default("a2a"),
  postgresPassword: z.string().default("a2a_secret"),
  postgresDb: z.string().default("a2a_server"),
});

// ===========================================
// AI Hub Configuration Schema
// ===========================================
export const aiHubConfigSchema = z.object({
  aiHubUrl: urlSchema("http://localhost:11434"),
  pollIntervalMs: intSchema(100, 60000, 2000),
  pollTimeoutMs: intSchema(1000, 600000, 120000),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default("gpt-4o-mini"),
});

// ===========================================
// Security Configuration Schema
// ===========================================
export const securityConfigSchema = z.object({
  jwtSecret: minStringSchema(32),
  jwtExpiresIn: z.string().default("1h"),
  jwtRefreshExpiresIn: z.string().default("7d"),
  encryptionKey: optionalMinStringSchema(32),
  skipAuth: booleanSchema.default(false),
  apiKeyPrefix: z.string().default("sk_a2a_"),
});

// ===========================================
// A2A Server Configuration Schema
// ===========================================
export const serverConfigSchema = z.object({
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  host: z.string().default("localhost"),
  defaultEmail: z.string().email().default("dev@localhost"),
  defaultPassword: z.string().default("dev"),
});

// ===========================================
// Storage & Paths Configuration Schema
// ===========================================
export const storageConfigSchema = z.object({
  gitSshKeyPath: z.string().default("./ssh_keys"),
  gitCloneBasePath: z.string().default("./repos"),
  fileCachePath: z.string().default("./file_cache"),
  maxFileSizeMb: intSchema(1, 1000, 10),
});

// ===========================================
// Logging Configuration Schema
// ===========================================
export const loggingConfigSchema = z.object({
  logLevel: z.enum(["error", "warn", "info", "debug"]).default("info"),
  logFormat: z.enum(["json", "pretty", "text"]).default("json"),
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
// Session Configuration Schema
// ===========================================
export const sessionConfigSchema = z.object({
  timeoutMs: intSchema(60000, 86400000, 3600000),
  maxInactiveMs: intSchema(60000, 43200000, 1800000),
});

// ===========================================
// Request Processor Configuration Schema
// ===========================================
export const requestProcessorConfigSchema = z.object({
  intervalMs: intSchema(100, 60000, 5000),
});

// ===========================================
// Feature Flags Configuration Schema
// ===========================================
export const featuresConfigSchema = z
  .object({
    // Core systems (always enabled - cannot be disabled)
    core: z.literal(true).default(true),

    // AI Hub integration
    aiHub: z
      .object({
        enabled: booleanSchema.default(true),
        polling: booleanSchema.default(true),
        openai: booleanSchema.default(false),
      })
      .default({}),

    p2p: z
      .object({
        enabled: booleanSchema.default(false),
        crdt: booleanSchema.default(true),
        relay: booleanSchema.default(true),
      })
      .default({}),

    daemon: z
      .object({
        enabled: booleanSchema.default(true),
        requestProcessing: booleanSchema.default(true),
      })
      .default({}),

    actions: z
      .object({
        enabled: booleanSchema.default(true),
        fileOperations: booleanSchema.default(true),
        gitOperations: booleanSchema.default(true),
        scriptExecution: booleanSchema.default(true),
        mcpCalls: booleanSchema.default(true),
      })
      .default({}),

    // Transform and processing features
    transform: z
      .object({
        enabled: booleanSchema.default(true),
        grayRoom: booleanSchema.default(true),
        pipeline: booleanSchema.default(true),
        interruptHandlers: booleanSchema.default(true),
      })
      .default({}),

    // AI features
    ai: z
      .object({
        enabled: booleanSchema.default(true),
        rag: booleanSchema.default(true),
        agentSwing: booleanSchema.default(true),
      })
      .default({}),

    // Monitoring and observability
    monitoring: z
      .object({
        enabled: booleanSchema.default(true),
        metrics: booleanSchema.default(true),
        logging: booleanSchema.default(true),
        healthChecks: booleanSchema.default(true),
        notifications: booleanSchema.default(false),
      })
      .default({}),

    // Security and access control
    security: z
      .object({
        enabled: booleanSchema.default(true),
        auth: booleanSchema.default(true),
        rateLimiting: booleanSchema.default(true),
        validation: booleanSchema.default(true),
      })
      .default({}),

    // Storage and persistence
    storage: z
      .object({
        enabled: booleanSchema.default(true),
        database: booleanSchema.default(true),
        redis: booleanSchema.default(true),
        fileCache: booleanSchema.default(true),
        gitRepos: booleanSchema.default(true),
      })
      .default({}),

    // API and interfaces
    api: z
      .object({
        enabled: booleanSchema.default(true),
        rest: booleanSchema.default(true),
        websocket: booleanSchema.default(true),
        graphql: booleanSchema.default(false),
      })
      .default({}),
  })
  .default({});

// ===========================================
// Unified Configuration Schema
// ===========================================
export const appConfigSchema = z.object({
  database: databaseConfigSchema,
  aiHub: aiHubConfigSchema,
  security: securityConfigSchema,
  server: serverConfigSchema,
  storage: storageConfigSchema,
  logging: loggingConfigSchema,
  rateLimit: rateLimitConfigSchema,
  queue: queueConfigSchema,
  session: sessionConfigSchema,
  requestProcessor: requestProcessorConfigSchema,
  features: featuresConfigSchema,
});

// ===========================================
// Type Exports
// ===========================================
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type AIHubConfig = z.infer<typeof aiHubConfigSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type QueueConfig = z.infer<typeof queueConfigSchema>;
export type SessionConfig = z.infer<typeof sessionConfigSchema>;
export type RequestProcessorConfig = z.infer<
  typeof requestProcessorConfigSchema
>;
export type FeaturesConfig = z.infer<typeof featuresConfigSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;
