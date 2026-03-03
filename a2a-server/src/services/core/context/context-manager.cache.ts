/**
 * ContextManager cache (by session + type).
 * DO NOT use for persisting client context or user code between requests.
 * Server must not cache context for "next iteration" — client sends context each time.
 */

import type {ContextType} from './context-manager.types.js';

const cache = new Map<string, unknown>();

export function contextCacheKey(sessionId: string, type: ContextType): string {
    return `ctx:${sessionId}:${type}`;
}

export function getContextCached<T>(key: string): T | undefined {
    return cache.get(key) as T | undefined;
}

export function setContextCached(key: string, value: unknown): void {
    cache.set(key, value);
}

export function clearContextCache(sessionId?: string): void {
    if (!sessionId) {
        cache.clear();
        return;
    }
    const prefix = `ctx:${sessionId}:`;
    for (const k of cache.keys()) {
        if (k.startsWith(prefix)) cache.delete(k);
    }
}

