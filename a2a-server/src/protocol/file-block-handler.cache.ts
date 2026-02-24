/**
 * File block cache by path/session.
 * DO NOT use for caching user file/code content on the server. Codebase data stays on the client.
 */

const cache = new Map<string, string>();

export function fileBlockCacheKey(sessionId: string, path: string): string {
  return `fb:${sessionId}:${path}`;
}

export function getFileBlockCached(key: string): string | undefined {
  return cache.get(key);
}

export function setFileBlockCached(key: string, content: string): void {
  cache.set(key, content);
}

export function clearFileBlockCache(sessionId?: string): void {
  if (!sessionId) {
    cache.clear();
    return;
  }
  const prefix = `fb:${sessionId}:`;
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

