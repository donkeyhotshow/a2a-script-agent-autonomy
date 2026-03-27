/**
 * A2A Server origin (no trailing slash) for direct calls from Client API / Vite plugin.
 * Matches `process.env.A2A_SERVER_URL` convention (see AGENTS.md).
 */

export function getA2aServerBaseUrl() {
    const raw = process.env.A2A_SERVER_URL || 'http://localhost:3000';
    return String(raw).replace(/\/$/, '').replace(/\/api\/v1$/i, '');
}
