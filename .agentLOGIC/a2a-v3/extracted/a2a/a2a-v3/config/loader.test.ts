import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateConfig, validateConfigSafe } from './loader.js';
import type { AppConfig } from './types.js';

const ALL_ENV_KEYS = [
  'SERVER_PORT', 'CLIENT_API_PORT', 'WEB_PORT', 'PROXY_PORT', 'OLLAMA_PORT', 'POSTGRES_PORT', 'REDIS_PORT',
  'DATABASE_URL', 'REDIS_URL', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB',
  'OLLAMA_HOST', 'OLLAMA_MODEL', 'OLLAMA_TIMEOUT', 'OLLAMA_MODELS', 'OLLAMA_KEEP_ALIVE', 'OLLAMA_IDLE_TIMEOUT', 'OLLAMA_AUTO_START',
  'LLM_PROVIDER', 'USE_OLLAMA', 'AI_HUB_URL', 'POLL_INTERVAL_MS', 'POLL_TIMEOUT_MS', 'OPENAI_API_KEY', 'OPENAI_MODEL',
  'JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN', 'ENCRYPTION_KEY', 'SKIP_AUTH', 'API_KEY_PREFIX',
  'NODE_ENV', 'HOST', 'A2A_DEFAULT_EMAIL', 'A2A_DEFAULT_PASSWORD',
  'PROXY_HOST', 'STORAGE_DIR', 'PROMISES_DIR', 'FORWARD_TIMEOUT_SECONDS', 'PROMISE_TTL_SECONDS', 'PROMISE_MAX_WORKERS',
  'AI_HUB_CONFIG', 'OLLAMA_SERVER_HEADER', 'SIMULATION_ENABLED', 'SIMULATION_DATA_PATH', 'HEALTH_CHECK_INTERVAL', 'HEALTH_CHECK_TIMEOUT',
  'GIT_SSH_KEY_PATH', 'GIT_CLONE_BASE_PATH', 'FILE_CACHE_PATH', 'MAX_FILE_SIZE_MB',
  'LOG_LEVEL', 'LOG_FORMAT',
  'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS',
  'QUEUE_CONCURRENCY', 'INDEXING_CONCURRENCY',
  'EMBEDDING_DIMENSION', 'CHUNK_MAX_TOKENS', 'CHUNK_OVERLAP_TOKENS',
  'SESSION_TIMEOUT_MS', 'SESSION_MAX_INACTIVE_MS',
  'PLEXE_API_URL', 'PLEXE_API_KEY',
  'REQUEST_PROCESSOR_INTERVAL_MS'
];

const MINIMAL_ENV = {
  SERVER_PORT: '3000',
  JWT_SECRET: 'a'.repeat(32),
  DATABASE_URL: 'postgres://localhost:5432/a2a',
  A2A_DEFAULT_EMAIL: 'test@example.com'
};

describe('loader', () => {
  beforeEach(() => {
    ALL_ENV_KEYS.forEach(key => delete process.env[key]);
  });

  describe('validateConfig', () => {
    it('validates full config with minimal env vars', () => {
      Object.entries(MINIMAL_ENV).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const config = validateConfig();

      expect(config.ports.serverPort).toBe(3000);
      expect(config.security.jwtSecret).toHaveLength(32);
      expect(config.database.databaseUrl).toBe('postgres://localhost:5432/a2a');
      expect(config.server.defaultEmail).toBe('test@example.com');
    });

    it('throws on invalid port', () => {
      Object.entries(MINIMAL_ENV).forEach(([key, value]) => {
        process.env[key] = value;
      });
      process.env.SERVER_PORT = 'invalid';

      expect(() => validateConfig()).toThrow(/ports.serverPort/);
    });

    it('throws on missing JWT_SECRET', () => {
      Object.entries({...MINIMAL_ENV, JWT_SECRET: ''}).forEach(([key, value]) => {
        if (value !== '') process.env[key] = value;
      });

      expect(() => validateConfig()).toThrow(/jwtSecret/);
    });

    it('applies schema defaults and coercions', () => {
      Object.entries({
        ...MINIMAL_ENV,
        SKIP_AUTH: 'true',
        QUEUE_CONCURRENCY: '5',
        SERVER_PORT: '3001'
      }).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const config = validateConfig();

      expect(config.ports.serverPort).toBe(3001);
      expect(config.security.skipAuth).toBe(true);
      expect(config.queue.concurrency).toBe(5);
      expect(config.ports.ollamaPort).toBe(11435);
    });
  });

  describe('validateConfigSafe', () => {
    it('returns success with valid config', () => {
      Object.entries(MINIMAL_ENV).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const result = validateConfigSafe();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.ports.serverPort).toBe(3000);
      }
    });

    it('returns failure with errors array', () => {
      Object.entries(MINIMAL_ENV).forEach(([key, value]) => {
        process.env[key] = value;
      });
      process.env.SERVER_PORT = 'invalid';

      const result = validateConfigSafe();

      expect(result.success).toBe(false);
      expect(result.errors.some(err => err.includes('serverPort'))).toBe(true);
    });
  });

  describe('computed config logic', () => {
    it('computes promisesDir from storageDir if not set', () => {
      Object.entries({
        ...MINIMAL_ENV,
        STORAGE_DIR: './proxy_logs'
      }).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const config = validateConfig();

      expect(config.proxy.promisesDir).toBe('./proxy_logs/promises');
    });

    it('uses explicit PROMISES_DIR if set', () => {
      Object.entries({
        ...MINIMAL_ENV,
        STORAGE_DIR: './logs',
        PROMISES_DIR: './custom/promises'
      }).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const config = validateConfig();

      expect(config.proxy.promisesDir).toBe('./custom/promises');
    });
  });

  describe('error formatting through thrown error', () => {
    it('throws error with formatted validation message', () => {
      Object.entries(MINIMAL_ENV).forEach(([key, value]) => {
        process.env[key] = value;
      });
      process.env.SERVER_PORT = 'invalid';

      expect(() => validateConfig()).toThrow(/Configuration validation failed/);
      expect(() => validateConfig()).toThrow(/serverPort/);
    });
  });
});
