/**
 * Search Cache
 * Handles caching of search indexes and results
 */
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
export declare class SearchCache {
    private config;
    private memoryCache;
    constructor(config?: CacheConfig);
    /**
     * Set the cache directory
     */
    setCacheDir(cacheDir: string): void;
    /**
     * Check if cache is enabled
     */
    isEnabled(): boolean;
    /**
     * Enable/disable caching
     */
    setEnabled(enabled: boolean): void;
    /**
     * Save data to cache
     */
    save<T>(key: string, data: T): Promise<void>;
    /**
     * Load data from cache
     */
    load<T>(key: string): Promise<T | null>;
    /**
     * Check if cache exists and is valid
     */
    exists(key: string): Promise<boolean>;
    /**
     * Check if cache is expired
     */
    private isExpired;
    /**
     * Delete cache entry
     */
    delete(key: string): Promise<void>;
    /**
     * Clear all cache
     */
    clear(): Promise<void>;
    /**
     * Get cache file path
     */
    private getCacheFilePath;
    /**
     * Get cache statistics
     */
    getStats(): {
        memorySize: number;
        enabled: boolean;
        cacheDir: string;
    };
}
