/**
 * Custom storage API that replaces localStorage with file-based storage
 * Uses the a2a-client storage system
 */

(function (global) {
    'use strict';

    const STORAGE_BASE_URL = '/api/storage';

    // Fetch with timeout and retry logic
    const DEFAULT_TIMEOUT = 10000; // 10 seconds
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 second base for exponential backoff

    async function fetchWithRetry(url, options = {}, retryCount = 0) {
        const controller = new AbortController();
        const timeout = options.timeout || DEFAULT_TIMEOUT;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            // Don't retry if aborted or max retries reached
            if (error.name === 'AbortError' || retryCount >= MAX_RETRIES) {
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = BASE_DELAY * Math.pow(2, retryCount);
            console.warn(`[CustomStorage] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms: ${url}`);
            await new Promise(resolve => setTimeout(resolve, delay));

            return fetchWithRetry(url, options, retryCount + 1);
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
                const response = await fetchWithRetry(`${STORAGE_BASE_URL}/${this.namespace}/${key}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        return null; // Item not found
                    }
                    throw new Error(`Storage get failed: ${response.status}`);
                }

                const data = await response.json();
                return data.value;
            } catch (error) {
                console.warn('[CustomStorage] Get failed:', error);
                return null;
            }
        }

        /**
         * Set item in storage
         */
        async setItem(key, value) {
            try {
                const response = await fetchWithRetry(`${STORAGE_BASE_URL}/${this.namespace}/${key}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        value: value,
                        timestamp: new Date().toISOString()
                    })
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
                const response = await fetchWithRetry(`${STORAGE_BASE_URL}/${this.namespace}/${key}`, {
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
                const response = await fetchWithRetry(`${STORAGE_BASE_URL}/${this.namespace}`, {
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
                const response = await fetchWithRetry(`${STORAGE_BASE_URL}/${this.namespace}/keys`, {
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
                console.warn('[CustomStorage] Keys failed:', error);
                return [];
            }
        }

        /**
         * Synchronous versions that fallback to localStorage for immediate access
         * These are useful for initialization before async storage is available
         */
        getItemSync(key) {
            try {
                return localStorage.getItem(`${this.namespace}:${key}`);
            } catch {
                return null;
            }
        }

        setItemSync(key, value) {
            try {
                localStorage.setItem(`${this.namespace}:${key}`, value);
            } catch (error) {
                console.warn('[CustomStorage] Sync set failed:', error);
            }
        }

        removeItemSync(key) {
            try {
                localStorage.removeItem(`${this.namespace}:${key}`);
            } catch (error) {
                console.warn('[CustomStorage] Sync remove failed:', error);
            }
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