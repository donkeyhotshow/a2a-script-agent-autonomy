import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuration schema with validation
const configSchema = z.object({
  // Server
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),

  // Database
  databaseUrl: z.string().url(),

  // Redis
  redisUrl: z.string().default('redis://localhost:6379'),
  redisPassword: z.string().optional(),

  // Auth
  jwtSecret: z.string().min(64).transform(val => {
    // Додаткова валідація: перевірка сили ключа
    if (process.env['NODE_ENV'] === 'production') {
      const hasUppercase = /[A-Z]/.test(val);
      const hasLowercase = /[a-z]/.test(val);
      const hasNumber = /\d/.test(val);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);
      
      if (!(hasUppercase && hasLowercase && hasNumber && hasSpecial)) {
        throw new Error('JWT_SECRET must contain uppercase, lowercase, number, and special character in production');
      }
    }
    return val;
  }),
  jwtExpiresIn: z.string().default('1h'),
  jwtRefreshExpiresIn: z.string().default('7d'),
  apiKeyPrefix: z.string().default('sk_a2a_'),

  // Plexe ML
  plexeApiUrl: z.string().url().optional(),
  plexeApiKey: z.string().optional(),

  // Git
  gitSshKeyPath: z.string().default('./ssh_keys'),
  gitCloneBasePath: z.string().default('./repos'),

  // File Storage
  fileCachePath: z.string().default('./file_cache'),
  maxFileSizeMb: z.coerce.number().default(10),

  // Rate Limiting
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMaxRequests: z.coerce.number().default(200),

  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  logFormat: z.enum(['json', 'pretty']).default('json'),

  // WebSocket
  wsPort: z.coerce.number().default(3001),
  wsHeartbeatIntervalMs: z.coerce.number().default(30000),

  // Queue
  queueConcurrency: z.coerce.number().default(5),
  indexingConcurrency: z.coerce.number().default(2),

  // ML / Embeddings
  embeddingDimension: z.coerce.number().default(768),
  chunkMaxTokens: z.coerce.number().default(512),
  chunkOverlapTokens: z.coerce.number().default(50),

  // Session
  sessionTimeoutMs: z.coerce.number().default(3600000),
  sessionMaxInactiveMs: z.coerce.number().default(1800000),

  // Request Processor (timer loop)
  requestProcessorIntervalMs: z.coerce.number().default(5000),
});

// Parse and validate configuration
function loadConfig() {
  const rawConfig = {
    nodeEnv: process.env['NODE_ENV'],
    port: process.env['PORT'],
    host: process.env['HOST'],
    databaseUrl: process.env['DATABASE_URL'],
    redisUrl: process.env['REDIS_URL'],
    redisPassword: process.env['REDIS_PASSWORD'],
    jwtSecret: process.env['JWT_SECRET'],
    jwtExpiresIn: process.env['JWT_EXPIRES_IN'],
    jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'],
    apiKeyPrefix: process.env['API_KEY_PREFIX'],
    plexeApiUrl: process.env['PLEXE_API_URL'],
    plexeApiKey: process.env['PLEXE_API_KEY'],
    gitSshKeyPath: process.env['GIT_SSH_KEY_PATH'],
    gitCloneBasePath: process.env['GIT_CLONE_BASE_PATH'],
    fileCachePath: process.env['FILE_CACHE_PATH'],
    maxFileSizeMb: process.env['MAX_FILE_SIZE_MB'],
    rateLimitWindowMs: process.env['RATE_LIMIT_WINDOW_MS'],
    rateLimitMaxRequests: process.env['RATE_LIMIT_MAX_REQUESTS'],
    logLevel: process.env['LOG_LEVEL'],
    logFormat: process.env['LOG_FORMAT'],
    wsPort: process.env['WS_PORT'],
    wsHeartbeatIntervalMs: process.env['WS_HEARTBEAT_INTERVAL_MS'],
    queueConcurrency: process.env['QUEUE_CONCURRENCY'],
    indexingConcurrency: process.env['INDEXING_CONCURRENCY'],
    embeddingDimension: process.env['EMBEDDING_DIMENSION'],
    chunkMaxTokens: process.env['CHUNK_MAX_TOKENS'],
    chunkOverlapTokens: process.env['CHUNK_OVERLAP_TOKENS'],
    sessionTimeoutMs: process.env['SESSION_TIMEOUT_MS'],
    sessionMaxInactiveMs: process.env['SESSION_MAX_INACTIVE_MS'],
    requestProcessorIntervalMs: process.env['REQUEST_PROCESSOR_INTERVAL_MS'],
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}

export const config = loadConfig();

// Type export
export type Config = z.infer<typeof configSchema>;

// Convenience exports
export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';
