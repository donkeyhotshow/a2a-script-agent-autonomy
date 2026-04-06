/**
 * Upstream Service
 * 
 * Handles communication with the A2A server - fetching and posting data.
 */

import type { ClientConfig } from '../models/session.model.js';
import { loadConfig } from './config.service.js';

/** Strip trailing slash and accidental `/api/v1` so `.../api/v1` + `/api/v1/invoke` does not double the path. */
export function normalizeA2aServerBaseUrl(serverBaseUrl: string): string {
    return String(serverBaseUrl || '')
        .replace(/\/?$/, '')
        .replace(/\/api\/v1$/i, '');
}

/**
 * Fetch from the server with authentication
 */
export async function serverFetch(
    method: string,
    serverBaseUrl: string,
    pathName: string,
    body: unknown | null = null
): Promise<Response> {
    const cfg = await loadConfig();
    const headers: Record<string, string> = {};
    if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
    if (body != null) headers['Content-Type'] = 'application/json';

    const url = `${normalizeA2aServerBaseUrl(serverBaseUrl)}${pathName}`;
    
    const fetchFn = await import('node-fetch');
    return fetchFn.default(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
    }) as unknown as Response;
}

/**
 * Get the server base URL from config
 */
export async function getServerBaseUrl(): Promise<string> {
    const cfg = await loadConfig();
    return normalizeA2aServerBaseUrl(cfg.serverUrl);
}
