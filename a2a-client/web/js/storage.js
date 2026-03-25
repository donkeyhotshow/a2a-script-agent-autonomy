/**
 * Custom storage API that replaces localStorage with file-based storage
 * Uses the a2a-client storage system
 * 
 * Supports two storage modes:
 * - Default: KV storage via /api/storage/:namespace/:key
 * - Sessions: Numbered folder storage via /api/a2a/sessions
 */

(function (global) {
    'use strict';

    // Fixed storage base URL - no dynamic lookup needed
    const STORAGE_BASE = '/api/storage';
    const SESSIONS_BASE = '/api/a2a/sessions';

    const STORAGE_DEFAULT_TIMEOUT = 10000;

    async function storageFetch(url, options = {}) {
        const controller = new AbortController();
        const { timeout = STORAGE_DEFAULT_TIMEOUT, ...rest } = options;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            return await fetch(url, {
                ...rest,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    class CustomStorage {
        constructor(namespace = 'default') {
            this.namespace = namespace;
        }

        /**
         * Get item from storage
         */
        async getItem(key) {
            try {
                const response = await storageFetch(`${STORAGE_BASE}/${this.namespace}/${key}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        console.log('[CustomStorage] Key not found (404), returning null:', key);
                        return null; // Item not found
                    }
                    throw new Error(`Storage get failed: ${response.status}`);
                }

                const text = await response.text();
                if (!text || text.trim().startsWith('<')) {
                    return null;
                }
                try {
                    const data = JSON.parse(text);
                    // Handle both { value: ... } format and direct string format
                    return data.value !== undefined ? data.value : data;
                } catch {
                    // If not JSON, return the text directly
                    return text;
                }
            } catch (error) {
                console.error('[CustomStorage] Get failed:', error.message || error);
                throw error;
            }
        }

        /**
         * Set item in storage
         */
        async setItem(key, value) {
            try {
                // Always serialize as JSON
                const body = JSON.stringify({
                    value: typeof value === 'string' ? value : value,
                    timestamp: new Date().toISOString()
                });
                
                const response = await storageFetch(`${STORAGE_BASE}/${this.namespace}/${key}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: body
                });

                if (!response.ok) {
                    throw new Error(`Storage set failed: ${response.status}`);
                }
            } catch (error) {
                console.warn('[CustomStorage] Set failed:', error);
                throw error;
            }
        }

        /**
         * Remove item from storage
         */
        async removeItem(key) {
            try {
                const response = await storageFetch(`${STORAGE_BASE}/${this.namespace}/${key}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok && response.status !== 404) {
                    throw new Error(`Storage remove failed: ${response.status}`);
                }
            } catch (error) {
                console.warn('[CustomStorage] Remove failed:', error);
                throw error;
            }
        }

        /**
         * Clear all items in namespace
         */
        async clear() {
            try {
                const response = await storageFetch(`${STORAGE_BASE}/${this.namespace}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Storage clear failed: ${response.status}`);
                }
            } catch (error) {
                console.warn('[CustomStorage] Clear failed:', error);
                throw error;
            }
        }

        /**
         * Get all keys in namespace
         */
        async keys() {
            try {
                const response = await storageFetch(`${STORAGE_BASE}/${this.namespace}/keys`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Storage keys failed: ${response.status}`);
                }

                const data = await response.json();
                return data.keys || [];
        } catch (error) {
            console.error('[CustomStorage] Keys failed:', error);
            throw error;
        }
        }

        /**
         * In-memory sync fallback when API is unavailable.
         * No localStorage - uses memory only.
         */
        setItemSync(key, value) {
            // Store in memory only (session-only fallback)
            if (!global.__storageFallback) global.__storageFallback = new Map();
            const fullKey = `${this.namespace}:${key}`;
            global.__storageFallback.set(fullKey, JSON.stringify(value));
        }

        /**
         * In-memory sync fallback when API is unavailable.
         * No localStorage - uses memory only.
         */
        getItemSync(key) {
            if (!global.__storageFallback) return null;
            const fullKey = `${this.namespace}:${key}`;
            const data = global.__storageFallback.get(fullKey);
            return data ? JSON.parse(data) : null;
        }

        /**
         * In-memory sync fallback - remove from memory only.
         */
        removeItemSync(key) {
            if (!global.__storageFallback) return;
            const fullKey = `${this.namespace}:${key}`;
            global.__storageFallback.delete(fullKey);
        }
    }

    // Create storage instances for different namespaces
    const storage = {
        // Default storage
        default: new CustomStorage('default'),

        // Session-specific storage
        sessions: new CustomStorage('sessions'),

        // UI state storage
        ui: new CustomStorage('ui'),

        // App configuration storage
        config: new CustomStorage('config'),

        // Panels storage
        panels: new CustomStorage('panels'),

        // AI actions storage
        aiActions: new CustomStorage('ai-actions')
    };

    // Export
    global.CustomStorage = CustomStorage;
    global.StorageAPI = storage;

})(typeof window !== 'undefined' ? window : globalThis);
