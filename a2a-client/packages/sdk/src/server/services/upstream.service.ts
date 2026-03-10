/**
 * Upstream Service
 * 
 * Handles communication with the A2A server - fetching and posting data.
 */

import type { ClientConfig } from '../models/session.model.js';
import { loadConfig } from './config.service.js';

// Use node-fetch for server-side requests
// Note: In a real implementation, you would use the 'node-fetch' package or native fetch in Node 18+
let fetch: typeof import('node-fetch').default;
import('node-fetch').then(module => {
    fetch = module.default;
}).catch(() => {
    // Fallback to global fetch if available (Node 18+)
    // @ts-ignore
    fetch = globalThis.fetch;
});

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

    const url = `${serverBaseUrl.replace(/\/?$/, '')}${pathName}`;
    
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
    return cfg.serverUrl.replace(/\/?$/, '');
}
