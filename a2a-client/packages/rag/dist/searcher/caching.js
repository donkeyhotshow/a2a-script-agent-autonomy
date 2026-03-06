"use strict";
/**
 * Search Cache
 * Handles caching of search indexes and results
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchCache = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG = {
    cacheDir: '.a2a/cache',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
};
/**
 * Search Cache class
 * Manages caching of search indexes and results
 */
class SearchCache {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
        this.memoryCache = new Map();
    }
    /**
     * Set the cache directory
     */
    setCacheDir(cacheDir) {
        this.config.cacheDir = cacheDir;
    }
    /**
     * Check if cache is enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
    /**
     * Enable/disable caching
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }
    /**
     * Save data to cache
     */
    async save(key, data) {
        if (!this.config.enabled)
            return;
        const entry = {
            data,
            timestamp: Date.now(),
            version: '1.0',
        };
        // Save to memory cache
        this.memoryCache.set(key, entry);
        // Save to disk
        await promises_1.default.mkdir(this.config.cacheDir, { recursive: true });
        const filePath = this.getCacheFilePath(key);
        await promises_1.default.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    }
    /**
     * Load data from cache
     */
    async load(key) {
        if (!this.config.enabled)
            return null;
        // Check memory cache first
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && !this.isExpired(memoryEntry.timestamp)) {
            return memoryEntry.data;
        }
        // Load from disk
        try {
            const filePath = this.getCacheFilePath(key);
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            const entry = JSON.parse(content);
            if (this.isExpired(entry.timestamp)) {
                await this.delete(key);
                return null;
            }
            // Store in memory cache
            this.memoryCache.set(key, entry);
            return entry.data;
        }
        catch {
            return null;
        }
    }
    /**
     * Check if cache exists and is valid
     */
    async exists(key) {
        // Check memory cache
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && !this.isExpired(memoryEntry.timestamp)) {
            return true;
        }
        // Check disk cache
        try {
            const filePath = this.getCacheFilePath(key);
            const stats = await promises_1.default.stat(filePath);
            return stats.isFile();
        }
        catch {
            return false;
        }
    }
    /**
     * Check if cache is expired
     */
    isExpired(timestamp) {
        return Date.now() - timestamp > this.config.maxAge;
    }
    /**
     * Delete cache entry
     */
    async delete(key) {
        this.memoryCache.delete(key);
        try {
            const filePath = this.getCacheFilePath(key);
            await promises_1.default.unlink(filePath);
        }
        catch {
            // Ignore errors
        }
    }
    /**
     * Clear all cache
     */
    async clear() {
        this.memoryCache.clear();
        try {
            await promises_1.default.rm(this.config.cacheDir, { recursive: true, force: true });
        }
        catch {
            // Ignore errors
        }
    }
    /**
     * Get cache file path
     */
    getCacheFilePath(key) {
        return path_1.default.join(this.config.cacheDir, `${key}.json`);
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            memorySize: this.memoryCache.size,
            enabled: this.config.enabled,
            cacheDir: this.config.cacheDir,
        };
    }
}
exports.SearchCache = SearchCache;
