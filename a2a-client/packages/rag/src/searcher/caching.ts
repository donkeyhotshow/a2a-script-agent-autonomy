/**
 * Search Cache
 * Handles caching of search indexes and results
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Cache configuration options
 */
export interface CacheConfig {
    /** Directory to store cache files */
    cacheDir: string;
    /** Maximum cache age in milliseconds */
    maxAge?: number;
    /** Enable/disable caching */
    enabled?: boolean;
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
    cacheDir: '.a2a/cache',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
};

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: string;
}

/**
 * Search Cache class
 * Manages caching of search indexes and results
 */
export class SearchCache {
    private config: Required<CacheConfig>;
    private memoryCache: Map<string, CacheEntry<unknown>>;

    constructor(config: CacheConfig = {}) {
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config } as Required<CacheConfig>;
        this.memoryCache = new Map();
    }

    /**
     * Set the cache directory
     */
    setCacheDir(cacheDir: string): void {
        this.config.cacheDir = cacheDir;
    }

    /**
     * Check if cache is enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Enable/disable caching
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }

    /**
     * Save data to cache
     */
    async save<T>(key: string, data: T): Promise<void> {
        if (!this.config.enabled) return;

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            version: '1.0',
        };

        // Save to memory cache
        this.memoryCache.set(key, entry as CacheEntry<unknown>);

        // Save to disk
        await fs.mkdir(this.config.cacheDir, { recursive: true });
        const filePath = this.getCacheFilePath(key);
        await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    }

    /**
     * Load data from cache
     */
    async load<T>(key: string): Promise<T | null> {
        if (!this.config.enabled) return null;

        // Check memory cache first
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && !this.isExpired(memoryEntry.timestamp)) {
            return memoryEntry.data as T;
        }

        // Load from disk
        try {
            const filePath = this.getCacheFilePath(key);
            const content = await fs.readFile(filePath, 'utf-8');
            const entry = JSON.parse(content) as CacheEntry<T>;

            if (this.isExpired(entry.timestamp)) {
                await this.delete(key);
                return null;
            }

            // Store in memory cache
            this.memoryCache.set(key, entry as CacheEntry<unknown>);

            return entry.data;
        } catch {
            return null;
        }
    }

    /**
     * Check if cache exists and is valid
     */
    async exists(key: string): Promise<boolean> {
        // Check memory cache
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && !this.isExpired(memoryEntry.timestamp)) {
            return true;
        }

        // Check disk cache
        try {
            const filePath = this.getCacheFilePath(key);
            const stats = await fs.stat(filePath);
            return stats.isFile();
        } catch {
            return false;
        }
    }

    /**
     * Check if cache is expired
     */
    private isExpired(timestamp: number): boolean {
        return Date.now() - timestamp > this.config.maxAge;
    }

    /**
     * Delete cache entry
     */
    async delete(key: string): Promise<void> {
        this.memoryCache.delete(key);

        try {
            const filePath = this.getCacheFilePath(key);
            await fs.unlink(filePath);
        } catch {
            // Ignore errors
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        this.memoryCache.clear();

        try {
            await fs.rm(this.config.cacheDir, { recursive: true, force: true });
        } catch {
            // Ignore errors
        }
    }

    /**
     * Get cache file path
     */
    private getCacheFilePath(key: string): string {
        return path.join(this.config.cacheDir, `${key}.json`);
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        memorySize: number;
        enabled: boolean;
        cacheDir: string;
    } {
        return {
            memorySize: this.memoryCache.size,
            enabled: this.config.enabled,
            cacheDir: this.config.cacheDir,
        };
    }
}
