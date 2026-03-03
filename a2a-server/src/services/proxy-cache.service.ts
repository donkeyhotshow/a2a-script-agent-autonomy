/**
 * Multi-level caching service for Proxy client.
 *
 * Provides L1 (in-memory) and L2 (Redis) caching with TTL support.
 * Aligns with AI Hub Proxy caching strategy for unified caching layer.
 */

import {logger} from '../utils/logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisClient = any;

export interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export interface CacheConfig {
    /** Enable caching */
    enabled: boolean;
    /** TTL in seconds (default: 300) */
    ttlSeconds: number;
    /** Maximum items in memory cache (default: 1000) */
    maxItems: number;
    /** Redis URL for L2 cache (optional) */
    redisUrl?: string;
    /** Cache key prefix */
    keyPrefix: string;
}

export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
}

/**
 * Build cache key from request parameters
 */
export function buildCacheKey(
    endpoint: string,
    payload: unknown,
    prefix: string
): string {
    const payloadStr = JSON.stringify(payload);
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < payloadStr.length; i++) {
        const char = payloadStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `${prefix}:${endpoint}:${Math.abs(hash).toString(36)}`;
}

/**
 * In-memory cache with TTL and LRU eviction
 */
class MemoryCache {
    private cache = new Map<string, CacheEntry<unknown>>();
    private accessOrder: string[] = [];
    private readonly ttlMs: number;
    private readonly maxItems: number;
    private stats: CacheStats = {hits: 0, misses: 0, evictions: 0, size: 0};

    constructor(ttlSeconds: number, maxItems: number) {
        this.ttlMs = ttlSeconds * 1000;
        this.maxItems = maxItems;
    }

    get<T>(key: string): T | undefined {
        this.cleanupExpired();

        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return undefined;
        }

        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            this.stats.misses++;
            return undefined;
        }

        // Update access order for LRU
        this.updateAccessOrder(key);
        this.stats.hits++;
        return entry.value as T;
    }

    set<T>(key: string, value: T, ttlSeconds?: number): void {
        this.cleanupExpired();

        const ttlMs = (ttlSeconds ?? this.ttlMs / 1000) * 1000;
        const expiresAt = Date.now() + ttlMs;

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
            this.evictLRU();
        }

        this.cache.set(key, {value, expiresAt});
        this.updateAccessOrder(key);
        this.stats.size = this.cache.size;
    }

    delete(key: string): boolean {
        const existed = this.cache.delete(key);
        if (existed) {
            this.removeFromAccessOrder(key);
        }
        this.stats.size = this.cache.size;
        return existed;
    }

    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
        this.stats = {hits: 0, misses: 0, evictions: 0, size: 0};
    }

    getStats(): CacheStats {
        return {...this.stats, size: this.cache.size};
    }

    private cleanupExpired(): void {
        const now = Date.now();
        const entriesToDelete: string[] = [];
        this.cache.forEach((entry, key) => {
            if (entry.expiresAt < now) {
                entriesToDelete.push(key);
            }
        });
        for (const key of entriesToDelete) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
        }
        this.stats.size = this.cache.size;
    }

    private evictLRU(): void {
        while (this.accessOrder.length > 0 && this.cache.size >= this.maxItems) {
            const oldestKey = this.accessOrder.shift();
            if (oldestKey && this.cache.has(oldestKey)) {
                this.cache.delete(oldestKey);
                this.stats.evictions++;
                break;
            }
        }
    }

    private updateAccessOrder(key: string): void {
        this.removeFromAccessOrder(key);
        this.accessOrder.push(key);
    }

    private removeFromAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }
}

/**
 * Redis cache wrapper (L2 cache)
 */
class RedisCache {
    private client: RedisClient = null;
    private readonly ttlSeconds: number;
    private connected = false;
    private readonly keyPrefix: string;

    constructor(redisUrl: string, ttlSeconds: number, keyPrefix: string) {
        this.ttlSeconds = ttlSeconds;
        this.keyPrefix = keyPrefix;
        this.connect(redisUrl);
    }

    private async connect(redisUrl: string): Promise<void> {
        try {
            // Dynamic import to avoid hard dependency
            const redis = await import('redis');
            this.client = redis.createClient({url: redisUrl});

            this.client.on('error', (err: Error) => {
                logger.error('[RedisCache] connection error', {error: err.message});
                this.connected = false;
            });

            this.client.on('connect', () => {
                logger.info('[RedisCache] connected');
                this.connected = true;
            });

            await this.client.connect();
        } catch {
            logger.warn('[RedisCache] redis not available, using memory cache only');
            this.connected = false;
        }
    }

    async get<T>(key: string): Promise<T | undefined> {
        if (!this.connected || !this.client) {
            return undefined;
        }

        try {
            const value = await this.client.get(this.keyPrefix + key);
            if (!value) {
                return undefined;
            }
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error('[RedisCache] get error', {error: String(error)});
            return undefined;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        if (!this.connected || !this.client) {
            return;
        }

        try {
            const ttl = ttlSeconds ?? this.ttlSeconds;
            await this.client.set(
                this.keyPrefix + key,
                JSON.stringify(value),
                {EX: ttl}
            );
        } catch (error) {
            logger.error('[RedisCache] set error', {error: String(error)});
        }
    }

    async delete(key: string): Promise<void> {
        if (!this.connected || !this.client) {
            return;
        }

        try {
            await this.client.del(this.keyPrefix + key);
        } catch (error) {
            logger.error('[RedisCache] delete error', {error: String(error)});
        }
    }

    isConnected(): boolean {
        return this.connected;
    }
}

/**
 * Multi-level cache service
 */
export class ProxyCacheService {
    private memoryCache: MemoryCache;
    private redisCache?: RedisCache;
    private config: CacheConfig;

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            ttlSeconds: config.ttlSeconds ?? 300,
            maxItems: config.maxItems ?? 1000,
            redisUrl: config.redisUrl,
            keyPrefix: config.keyPrefix ?? 'proxy',
        };

        this.memoryCache = new MemoryCache(
            this.config.ttlSeconds,
            this.config.maxItems
        );

        if (this.config.redisUrl) {
            this.redisCache = new RedisCache(
                this.config.redisUrl,
                this.config.ttlSeconds,
                this.config.keyPrefix
            );
        }
    }

    /**
     * Get value from cache (L1 -> L2)
     */
    async get<T>(key: string): Promise<T | undefined> {
        if (!this.config.enabled) {
            return undefined;
        }

        // Try L1 first
        const l1Value = this.memoryCache.get<T>(key);
        if (l1Value !== undefined) {
            logger.debug('[ProxyCache] L1 hit', {key});
            return l1Value;
        }

        // Try L2 if available
        if (this.redisCache) {
            const l2Value = await this.redisCache.get<T>(key);
            if (l2Value !== undefined) {
                // Promote to L1
                this.memoryCache.set(key, l2Value);
                logger.debug('[ProxyCache] L2 hit', {key});
                return l2Value;
            }
        }

        return undefined;
    }

    /**
     * Set value in cache (L1 and L2)
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        if (!this.config.enabled) {
            return;
        }

        // Set in L1
        this.memoryCache.set(key, value, ttlSeconds);

        // Set in L2 if available
        if (this.redisCache) {
            await this.redisCache.set(key, value, ttlSeconds);
        }

        logger.debug('[ProxyCache] cached', {key, ttl: ttlSeconds ?? this.config.ttlSeconds});
    }

    /**
     * Delete value from cache
     */
    async delete(key: string): Promise<void> {
        this.memoryCache.delete(key);
        if (this.redisCache) {
            await this.redisCache.delete(key);
        }
    }

    /**
     * Clear all caches
     */
    clear(): void {
        this.memoryCache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return this.memoryCache.getStats();
    }

    /**
     * Check if caching is enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Build cache key for request
     */
    buildKey(endpoint: string, payload: unknown): string {
        return buildCacheKey(endpoint, payload, this.config.keyPrefix);
    }
}

// Singleton instance
let defaultCacheService: ProxyCacheService | undefined;

/**
 * Get or create default cache service
 */
export function getProxyCacheService(
    config?: Partial<CacheConfig>
): ProxyCacheService {
    if (!defaultCacheService) {
        defaultCacheService = new ProxyCacheService(config);
    }
    return defaultCacheService;
}

/**
 * Reset default cache service (for testing)
 */
export function resetProxyCacheService(): void {
    defaultCacheService = undefined;
}
