/**
 * Session ID rules shared by Vite Client API (`@a2a-client/vite-plugin`) and `@a2a/sdk` routes.
 */

export const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

const MAX_LEN = 64;

export function isValidSessionId(id) {
    return typeof id === 'string' && SAFE_SEGMENT.test(id) && id.length <= MAX_LEN;
}