import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapEnvironmentVariables } from './env-mapper.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

vi.mock('dotenv');
vi.mock('path');
vi.mock('url');

const mockFileURLToPath = vi.fn();
vi.mocked(fileURLToPath).mockReturnValue('/mock/filename');
const mockDirname = vi.fn();
vi.mocked(path.dirname).mockReturnValue('/mock/dir');
vi.mocked(path.resolve).mockReturnValue('/mock/root');

vi.mocked(dotenv.config).mockImplementation(() => ({}));

const ALL_ENV_KEYS = [
  // ports
  'SERVER_PORT', 'CLIENT_API_PORT', 'WEB_PORT', 'PROXY_PORT', 'LOCAL_LLM_PORT', 'POSTGRES_PORT', 'REDIS_PORT',
  // database
  'DATABASE_URL', 'REDIS_URL', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB',
  // ai
  'LOCAL_LLM_UPSTREAM_URL', 'LOCAL_LLM_MODEL', 'LOCAL_LLM_TIMEOUT', 'LOCAL_LLM_MODELS', 'LOCAL_LLM_KEEP_ALIVE', 'LOCAL_LLM_IDLE_TIMEOUT', 'LOCAL_LLM_AUTO_START',
  'LLM_PROVIDER', 'USE_LOCAL_LLM', 'AI_HUB_URL', 'POLL_INTERVAL_MS', 'POLL_TIMEOUT_MS', 'OPENAI_API_KEY', 'OPENAI_MODEL',
  // security
  'JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN', 'ENCRYPTION_KEY', 'SKIP_AUTH', 'API_KEY_PREFIX',
  // server
  'NODE_ENV', 'HOST', 'A2A_DEFAULT_EMAIL', 'A2A_DEFAULT_PASSWORD',
  // proxy
  'PROXY_HOST', 'STORAGE_DIR', 'PROMISES_DIR', 'FORWARD_TIMEOUT_SECONDS', 'PROMISE_TTL_SECONDS', 'PROMISE_MAX_WORKERS',
  'AI_HUB_CONFIG', 'LOCAL_LLM_SERVER_HEADER', 'SIMULATION_ENABLED', 'SIMULATION_DATA_PATH', 'HEALTH_CHECK_INTERVAL', 'HEALTH_CHECK_TIMEOUT',
  // storage
  'GIT_SSH_KEY_PATH', 'GIT_CLONE_BASE_PATH', 'FILE_CACHE_PATH', 'MAX_FILE_SIZE_MB',
  // logging
  'LOG_LEVEL', 'LOG_FORMAT',
  // rateLimit
  'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS',
  // queue
  'QUEUE_CONCURRENCY', 'INDEXING_CONCURRENCY',
  // ml
  'EMBEDDING_DIMENSION', 'CHUNK_MAX_TOKENS', 'CHUNK_OVERLAP_TOKENS',
  // session
  'SESSION_TIMEOUT_MS', 'SESSION_MAX_INACTIVE_MS',
  // plexe
  'PLEXE_API_URL', 'PLEXE_API_KEY',
  // requestProcessor
  'REQUEST_PROCESSOR_INTERVAL_MS'
];

describe('env-mapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all relevant process.env
    ALL_ENV_KEYS.forEach(key => delete process.env[key]);
    // Reset NODE_ENV if set
    delete process.env.NODE_ENV;
  });

  describe('ports section', () => {
    it('maps all port env vars correctly', () => {
      process.env.SERVER_PORT = '3000';
      process.env.CLIENT_API_PORT = '3001';
      process.env.WEB_PORT = '5173';
      process.env.PROXY_PORT = '11434';
      process.env.LOCAL_LLM_PORT = '11435';
      process.env.POSTGRES_PORT = '5432';
      process.env.REDIS_PORT = '6379';

      const result = mapEnvironmentVariables();

      expect(result.ports.serverPort).toBe('3000');
      expect(result.ports.clientApiPort).toBe('3001');
      expect(result.ports.webPort).toBe('5173');
      expect(result.ports.proxyPort).toBe('11434');
      expect(result.ports.localLlmPort).toBe('11435');
      expect(result.ports.postgresPort).toBe('5432');
      expect(result.ports.redisPort).toBe('6379');
    });

    it('leaves undefined ports as undefined', () => {
      const result = mapEnvironmentVariables();
      expect(result.ports.serverPort).toBeUndefined();
    });
  });

  describe('database section', () => {
    it('maps database env vars', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost/db';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.POSTGRES_USER = 'a2a';
      process.env.POSTGRES_PASSWORD = 'secret';
      process.env.POSTGRES_DB = 'a2a_server';

      const result = mapEnvironmentVariables();

      expect(result.database.databaseUrl).toBe('postgres://user:pass@localhost/db');
      expect(result.database.redisUrl).toBe('redis://localhost:6379');
      expect(result.database.postgresUser).toBe('a2a');
      expect(result.database.postgresPassword).toBe('secret');
      expect(result.database.postgresDb).toBe('a2a_server');
    });
  });

  describe('ai section', () => {
    it('maps AI/LLM env vars', () => {
      process.env.LOCAL_LLM_UPSTREAM_URL = 'http://localhost:11435';
      process.env.LOCAL_LLM_MODEL = 'qwen2.5:7b';
      process.env.LOCAL_LLM_TIMEOUT = '60';
      process.env.OPENAI_API_KEY = 'sk-123';
      process.env.OPENAI_MODEL = 'gpt-4o-mini';

      const result = mapEnvironmentVariables();

      expect(result.ai.localLlmUpstreamUrl).toBe('http://localhost:11435');
      expect(result.ai.localLlmModel).toBe('qwen2.5:7b');
      expect(result.ai.localLlmTimeout).toBe('60');
      expect(result.ai.openaiApiKey).toBe('sk-123');
      expect(result.ai.openaiModel).toBe('gpt-4o-mini');
    });
  });

  describe('security section', () => {
    it('maps security env vars', () => {
      process.env.JWT_SECRET = 'super-secret-32-chars-long';
      process.env.SKIP_AUTH = 'true';
      process.env.API_KEY_PREFIX = 'sk_custom_';

      const result = mapEnvironmentVariables();

      expect(result.security.jwtSecret).toBe('super-secret-32-chars-long');
      expect(result.security.skipAuth).toBe('true');
      expect(result.security.apiKeyPrefix).toBe('sk_custom_');
    });
  });

  describe('server section', () => {
    it('maps server env vars', () => {
      process.env.NODE_ENV = 'test';
      process.env.HOST = '0.0.0.0';
      process.env.A2A_DEFAULT_EMAIL = 'test@example.com';

      const result = mapEnvironmentVariables();

      expect(result.server.nodeEnv).toBe('test');
      expect(result.server.host).toBe('0.0.0.0');
      expect(result.server.defaultEmail).toBe('test@example.com');
    });
  });

  // Continue for other sections similarly...
  describe('proxy section', () => {
    it('maps proxy env vars', () => {
      process.env.PROXY_HOST = '0.0.0.0';
      process.env.STORAGE_DIR = './logs';
      process.env.PROMISE_TTL_SECONDS = '86400';

      const result = mapEnvironmentVariables();

      expect(result.proxy.proxyHost).toBe('0.0.0.0');
      expect(result.proxy.storageDir).toBe('./logs');
      expect(result.proxy.promiseTtlSeconds).toBe('86400');
    });
  });

  describe('storage section', () => {
    it('maps storage env vars', () => {
      process.env.GIT_CLONE_BASE_PATH = './repos';
      process.env.MAX_FILE_SIZE_MB = '50';

      const result = mapEnvironmentVariables();

      expect(result.storage.gitCloneBasePath).toBe('./repos');
      expect(result.storage.maxFileSizeMb).toBe('50');
    });
  });

  describe('logging section', () => {
    it('maps logging env vars', () => {
      process.env.LOG_LEVEL = 'debug';
      process.env.LOG_FORMAT = 'pretty';

      const result = mapEnvironmentVariables();

      expect(result.logging.logLevel).toBe('debug');
      expect(result.logging.logFormat).toBe('pretty');
    });
  });

  describe('rateLimit section', () => {
    it('maps rate limit env vars', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '60000';
      process.env.RATE_LIMIT_MAX_REQUESTS = '100';

      const result = mapEnvironmentVariables();

      expect(result.rateLimit.windowMs).toBe('60000');
      expect(result.rateLimit.maxRequests).toBe('100');
    });
  });

  describe('queue section', () => {
    it('maps queue env vars', () => {
      process.env.QUEUE_CONCURRENCY = '10';

      const result = mapEnvironmentVariables();

      expect(result.queue.concurrency).toBe('10');
    });
  });

  describe('ml section', () => {
    it('maps ML env vars', () => {
      process.env.EMBEDDING_DIMENSION = '1536';

      const result = mapEnvironmentVariables();

      expect(result.ml.embeddingDimension).toBe('1536');
    });
  });

  describe('session section', () => {
    it('maps session env vars', () => {
      process.env.SESSION_TIMEOUT_MS = '3600000';

      const result = mapEnvironmentVariables();

      expect(result.session.timeoutMs).toBe('3600000');
    });
  });

  describe('plexe section', () => {
    it('maps plexe env vars', () => {
      process.env.PLEXE_API_URL = 'https://api.plexe.ai';

      const result = mapEnvironmentVariables();

      expect(result.plexe.apiUrl).toBe('https://api.plexe.ai');
    });
  });

  describe('requestProcessor section', () => {
    it('maps request processor env vars', () => {
      process.env.REQUEST_PROCESSOR_INTERVAL_MS = '5000';

      const result = mapEnvironmentVariables();

      expect(result.requestProcessor.intervalMs).toBe('5000');
    });
  });

  it('returns all sections in result', () => {
    const result = mapEnvironmentVariables();
    expect(result).toHaveProperty('ports');
    expect(result).toHaveProperty('database');
    expect(result).toHaveProperty('ai');
    expect(result).toHaveProperty('security');
    expect(result).toHaveProperty('server');
    expect(result).toHaveProperty('proxy');
    expect(result).toHaveProperty('storage');
    expect(result).toHaveProperty('logging');
    expect(result).toHaveProperty('rateLimit');
    expect(result).toHaveProperty('queue');
    expect(result).toHaveProperty('ml');
    expect(result).toHaveProperty('session');
    expect(result).toHaveProperty('plexe');
    expect(result).toHaveProperty('requestProcessor');
  });
});
