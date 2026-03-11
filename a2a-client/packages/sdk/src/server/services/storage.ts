/**
 * Storage Utilities
 * 
 * Common utilities for file system operations used by services.
 * Storage is outside project - in user data dir (~/.a2a-client)
 */

import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
