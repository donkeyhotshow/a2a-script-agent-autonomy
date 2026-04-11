/**
 * Abstract Base Registry - Common registry implementation
 *
 * Eliminates duplicate code from all registry classes
 */

import {logger} from '../../../utils/src/lib/logger.js';

export abstract class BaseRegistry<K, V> {
    protected readonly storage: Map<K, V> = new Map();
    protected readonly registryName: string;

    protected constructor(registryName: string) {
        this.registryName = registryName;
        logger.info(`[${this.registryName}] Initialized`);
    }

    /**
     * Register an item in the registry
     */
    register(key: K, value: V): void {
        this.storage.set(key, value);
        logger.info(`[${this.registryName}] Item registered`, {key: String(key)});
    }

    /**
     * Get an item by key
     * Returns the item or undefined if not found
     */
    get(key: K): V | undefined {
        return this.storage.get(key);
    }

    /**
     * Get an item by key with null fallback
     * Returns the item or null if not found
     */
    getOrNull(key: K): V | null {
        return this.storage.get(key) || null;
    }

    /**
     * Check if an item exists for the given key
     */
    has(key: K): boolean {
        return this.storage.has(key);
    }

    /**
     * Get all registered items
     */
    getAll(): V[] {
        return Array.from(this.storage.values());
    }

    /**
     * Get all registered keys
     */
    listKeys(): K[] {
        return Array.from(this.storage.keys());
    }

    /**
     * Get the count of registered items
     */
    get count(): number {
        return this.storage.size;
    }

    /**
     * Clear all items from the registry
     */
    clear(): void {
        this.storage.clear();
        logger.info(`[${this.registryName}] Cleared all items`);
    }

    /**
     * Remove an item from the registry
     */
    unregister(key: K): boolean {
        const existed = this.storage.delete(key);
        if (existed) {
            logger.info(`[${this.registryName}] Item unregistered`, {key: String(key)});
        }
        return existed;
    }
}
