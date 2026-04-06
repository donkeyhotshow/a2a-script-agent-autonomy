/**
 * Config Loader — loads non-secret server defaults from config/server.config.json.
 * Environment variables of the same name always take precedence.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../config/server.config.json');

interface ServerConfig {
  REQUEST_RETRY_DELAY_MS: number;
  REQUEST_MAX_RETRIES: number;
  GRAY_ROOM_MAX_INTERRUPTS: number;
  GRAY_ROOM_LLM_TIMEOUT_MS: number;
  SESSION_CLEANUP_INTERVAL_MS: number;
  MAX_HISTORY_LENGTH: number;
  RAG_DEFAULT_LIMIT: number;
  RAG_MAX_LIMIT: number;
  POLICY_LOG_VIOLATIONS: boolean;
}

function loadConfig(): ServerConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as ServerConfig;
  } catch {
    // Fallback defaults if file is missing (e.g. in tests)
    return {
      REQUEST_RETRY_DELAY_MS: 15000,
      REQUEST_MAX_RETRIES: 15,
      GRAY_ROOM_MAX_INTERRUPTS: 8,
      GRAY_ROOM_LLM_TIMEOUT_MS: 120000,
      SESSION_CLEANUP_INTERVAL_MS: 3600000,
      MAX_HISTORY_LENGTH: 50,
      RAG_DEFAULT_LIMIT: 10,
      RAG_MAX_LIMIT: 50,
      POLICY_LOG_VIOLATIONS: true,
    };
  }
}

const fileDefaults = loadConfig();

/**
 * Read a numeric config value. Environment variable of the same name takes precedence.
 */
export function getConfigNumber(key: keyof ServerConfig): number {
  const envVal = process.env[key];
  if (envVal !== undefined) {
    const parsed = Number(envVal);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const def = fileDefaults[key];
  return typeof def === 'number' ? def : 0;
}

/**
 * Read a boolean config value. Environment variable of the same name takes precedence ('1'/'true' = true).
 */
export function getConfigBoolean(key: keyof ServerConfig): boolean {
  const envVal = process.env[key];
  if (envVal !== undefined) {
    return envVal === '1' || envVal.toLowerCase() === 'true';
  }
  const def = fileDefaults[key];
  return typeof def === 'boolean' ? def : false;
}

/** Convenience: REQUEST_RETRY_DELAY_MS */
export const requestRetryDelayMs = () => getConfigNumber('REQUEST_RETRY_DELAY_MS');
/** Convenience: REQUEST_MAX_RETRIES */
export const requestMaxRetries = () => getConfigNumber('REQUEST_MAX_RETRIES');
/** Convenience: GRAY_ROOM_MAX_INTERRUPTS */
export const grayRoomMaxInterrupts = () => getConfigNumber('GRAY_ROOM_MAX_INTERRUPTS');
