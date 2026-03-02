/**
 * Message build cache (by session + key).
 * For server-side build artifacts only. Do not cache client context or code.
 */

const cache = new Map<string, unknown>();

export function messageCacheKey(sessionId: string, key: string): string {
    return `msg:${sessionId}:${key}`;
}

export function getMessageCache<T>(key: string): T | undefined {
    return cache.get(key) as T | undefined;
}

export function setMessageCache(key: string, value: unknown): void {
    cache.set(key, value);
}
