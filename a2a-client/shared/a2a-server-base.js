/**
 * A2A Server origin (no trailing slash) for direct calls from Client API / Vite plugin.
 * Matches `process.env.A2A_SERVER_URL` convention (see AGENTS.md).
 */

export function getA2aServerBaseUrl() {
    // Prefer explicit configuration; only fall back to localhost in non-production dev/test.
    const envUrl = process.env.A2A_SERVER_URL;
    const raw =
        envUrl ||
        (process.env.NODE_ENV === 'production'
            ? ''
            : 'http://localhost:3000');
    if (!raw) {
        throw new Error(
            'A2A_SERVER_URL is required in production (e.g. "http://localhost:3000" or "http://localhost:3000/api/v1").'
        );
    }
    return String(raw).replace(/\/$/, '').replace(/\/api\/v1$/i, '');
}
