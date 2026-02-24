/**
 * Context block cache key and get/set helpers.
 * DO NOT use for caching client context between requests. Client sends full context each time.
 */

const cache = new Map<string, unknown>();

export function parseContextCacheKey(sessionId: string, suffix: string): string {
  return `ctx:${sessionId}:${suffix}`;
}

export function getCachedContext<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCachedContext(key: string, value: unknown): void {
  cache.set(key, value);
}

export function clearContextCache(sessionId?: string): void {
  if (!sessionId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`ctx:${sessionId}:`)) cache.delete(k);
  }
}
