/**
 * Config Service
 * 
 * Manages client configuration - server URL and authentication token.
 */

import type { ClientConfig } from '../models/session.model.js';
import { readJsonFile, writeJsonFile, CONFIG_FILE, DEFAULT_CONFIG } from './storage.js';

/**
 * Load client configuration from storage
 */
export async function loadConfig(): Promise<ClientConfig> {
    return readJsonFile(CONFIG_FILE, DEFAULT_CONFIG);
}

/**
 * Save client configuration to storage
 */
export async function saveConfig(config: ClientConfig): Promise<ClientConfig> {
    const normalized: ClientConfig = {
        serverUrl: String(config.serverUrl || DEFAULT_CONFIG.serverUrl).replace(/\/?$/, ''),
        token: config.token ?? null,
    };
    await writeJsonFile(CONFIG_FILE, normalized);
    return normalized;
}
