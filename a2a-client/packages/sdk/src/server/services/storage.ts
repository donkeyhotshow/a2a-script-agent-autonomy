/**
 * Storage Utilities
 * 
 * Common utilities for file system operations used by services.
 */

import * as fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Get the storage directory path
 * Resolves to a2a-client/storage relative to the SDK
 */
export function getStorageDir(): string {
    // Resolve a2a-client root: from .../sdk/src/server or .../sdk/dist/server -> .../sdk -> .../a2a-client
    const sdkRoot = path.resolve(__dirname, '../..');
    const a2aClientRoot = path.resolve(sdkRoot, '../..');
    return process.env.A2A_CLIENT_STORAGE_DIR || path.join(a2aClientRoot, 'storage');
}

/**
 * Projects storage file path
 */
export const PROJECTS_FILE = path.join(getStorageDir(), 'projects.json');

/**
 * Config storage file path
 */
export const CONFIG_FILE = path.join(getStorageDir(), 'config.json');

/**
 * Default client configuration
 */
export const DEFAULT_CONFIG = {
    serverUrl: process.env.A2A_SERVER_URL || 'http://localhost:3000/api/v1',
    token: process.env.A2A_SERVER_TOKEN || null,
};

// ============================================================================
// File Utilities
// ============================================================================

/**
 * Read JSON file with fallback
 */
export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

/**
 * Write JSON file atomically (write to temp first, then rename)
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    try {
        await fs.rm(filePath, { force: true });
    } catch {
        // ignore
    }
    await fs.rename(tmp, filePath);
}
