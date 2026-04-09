/**
 * Storage Utilities
 * 
 * Common utilities for file system operations used by services.
 * Defaults to `<repo>/a2a-client/storage`, but can point to any path (for example `$HOME/a2a-client`) via `A2A_CLIENT_STORAGE_DIR`.
 */

import * as fs from 'fs/promises';
import path from 'path';
import { isNodeEnoent } from '@a2a/shared/node-errors.mjs';

export { unwrapKvStoredValue } from '@a2a/shared/kv-unwrap.mjs';
export { isNodeEnoent };

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Get the storage directory path
 * Uses A2A_CLIENT_STORAGE_DIR or local storage (a2a-client/storage)
 */
export function getStorageDir(): string {
    if (process.env.A2A_CLIENT_STORAGE_DIR) return process.env.A2A_CLIENT_STORAGE_DIR;
    // Default to local storage in project for web client compatibility
    return path.join(process.cwd(), '..', 'storage');
}

/** Root directory for `kv/*` namespaces (SDK storage layout). */
export function getKvRoot(): string {
    return path.join(getStorageDir(), 'kv');
}

/** Global `storage/sessions` root (step folders and non–project-path session JSON), not `.a2a/sessions`. */
export function getStorageSessionsRoot(): string {
    return path.join(getStorageDir(), 'sessions');
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
    } catch (e) {
        if (isNodeEnoent(e)) {
            return fallback;
        }
        console.error('[storage] readJsonFile:', filePath, e instanceof Error ? e.message : e);
        throw e instanceof Error ? e : new Error(String(e));
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
    } catch (e) {
        if (!isNodeEnoent(e)) {
            console.error('[storage] writeJsonFile: could not remove previous file:', filePath, e instanceof Error ? e.message : e);
        }
    }
    await fs.rename(tmp, filePath);
}
