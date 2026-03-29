/**
 * Mock Storage for a2a-client SDK Tests
 * 
 * @deprecated localStorage/sessionStorage is deprecated in production code.
 * Use StorageAPI (file-based via /api/storage) instead.
 * 
 * This mock is provided for backward compatibility with legacy tests only.
 * For new tests, use:
 * 
 * - FileStorageBackend from './session-storage/storage-backends.js'
 * - MemoryStorageBackend for in-memory testing
 * - Or mock the StorageAPI directly
 * 
 * Migration example:
 * ```typescript
 * // Old (deprecated):
 * import { createMockStorage } from './mocks/storage/mock-storage.js';
 * const storage = createMockStorage({ initialData: { key: 'value' } });
 * 
 * // New (recommended):
 * import { MemoryStorageBackend } from '../../packages/history/src/session-storage/storage-backends.js';
 * const backend = new MemoryStorageBackend();
 * await backend.set('key', 'value');
 * ```
 * 
 * Provides mock implementation for localStorage/sessionStorage:
 * - In-memory storage
 * - Supports get, set, remove, clear operations
 * - Compatible with browser and Node.js environments
 */

export interface StorageData {
    [key: string]: string;
}

export interface MockStorageConfig {
    /** Initial data to populate storage */
    initialData?: StorageData;
    /** Enable verbose logging */
    verbose?: boolean;
    /** Storage type: 'localStorage' | 'sessionStorage' */
    type?: 'localStorage' | 'sessionStorage';
}

/**
 * Mock Storage class mimicking localStorage/sessionStorage API
 */
export class MockStorage {
    private data: StorageData;
    private config: Required<MockStorageConfig>;
    private listeners: Map<string, Array<(event: StorageEvent) => void>> = new Map();

    constructor(config: MockStorageConfig = {}) {
        this.config = {
            initialData: config.initialData || {},
            verbose: config.verbose || false,
            type: config.type || 'localStorage'
        };
        this.data = { ...this.config.initialData };
    }

    /**
     * Get item from storage
     */
    getItem(key: string): string | null {
        const value = this.data[key] ?? null;
        if (this.config.verbose) {
            console.log(`[MockStorage:${this.config.type}] getItem("${key}")`, value);
        }
        return value;
    }

    /**
     * Set item in storage
     */
    setItem(key: string, value: string): void {
        const oldValue = this.data[key];
        this.data[key] = value;
        
        if (this.config.verbose) {
            console.log(`[MockStorage:${this.config.type}] setItem("${key}", "${value}")`);
        }

        // Notify listeners
        this.notifyListeners(key, oldValue, value);
    }

    /**
     * Remove item from storage
     */
    removeItem(key: string): void {
        const oldValue = this.data[key];
        delete this.data[key];
        
        if (this.config.verbose) {
            console.log(`[MockStorage:${this.config.type}] removeItem("${key}")`);
        }

        this.notifyListeners(key, oldValue, null);
    }

    /**
     * Clear all storage
     */
    clear(): void {
        this.data = {};
        
        if (this.config.verbose) {
            console.log(`[MockStorage:${this.config.type}] clear()`);
        }

        // Notify all listeners
        for (const key of Object.keys(this.data)) {
            this.notifyListeners(key, this.data[key], null);
        }
    }

    /**
     * Get storage key by index
     */
    key(index: number): string | null {
        const keys = Object.keys(this.data);
        return keys[index] ?? null;
    }

    /**
     * Get storage length
     */
    get length(): number {
        return Object.keys(this.data).length;
    }

    /**
     * Add event listener for storage changes
     */
    addEventListener(type: string, listener: (event: StorageEvent) => void): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(type: string, listener: (event: StorageEvent) => void): void {
        const listeners = this.listeners.get(type);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Notify all listeners of storage change
     */
    private notifyListeners(key: string, oldValue: string | null, newValue: string | null): void {
        // Omit storageArea: jsdom rejects non-Storage values; listeners only need key/values.
        const event = new StorageEvent('storage', {
            key: key ?? undefined,
            oldValue: oldValue ?? undefined,
            newValue: newValue ?? undefined,
            url: 'http://localhost/'
        });

        const listeners = this.listeners.get('storage');
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(event);
                } catch (e) {
                    console.error('[MockStorage] Listener error:', e);
                }
            }
        }
    }

    /**
     * Check if key exists
     */
    hasKey(key: string): boolean {
        return key in this.data;
    }

    /**
     * Get all keys
     */
    getKeys(): string[] {
        return Object.keys(this.data);
    }

    /**
     * Get all items as object
     */
    getAll(): StorageData {
        return { ...this.data };
    }

    /**
     * Set multiple items at once
     */
    setMultiple(items: StorageData): void {
        for (const [key, value] of Object.entries(items)) {
            this.setItem(key, value);
        }
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        this.data = { ...this.config.initialData };
        
        if (this.config.verbose) {
            console.log(`[MockStorage:${this.config.type}] reset()`);
        }
    }

    /**
     * Get the underlying data (for testing)
     */
    getData(): StorageData {
        return { ...this.data };
    }

    /**
     * Create a StorageEvent-like object
     */
    createStorageEvent(key: string, oldValue: string | null, newValue: string | null): StorageEvent {
        return new StorageEvent('storage', {
            key,
            oldValue,
            newValue,
            storageArea: this as any,
            url: 'http://localhost'
        });
    }
}

/**
 * Create MockStorage instance
 */
export function createMockStorage(config?: MockStorageConfig): MockStorage {
    return new MockStorage(config);
}

/**
 * Global storage instances
 */
let globalLocalStorage: MockStorage | null = null;
let globalSessionStorage: MockStorage | null = null;

/**
 * Setup global mock localStorage
 */
export function setupMockLocalStorage(config?: MockStorageConfig): MockStorage {
    globalLocalStorage = new MockStorage({ ...config, type: 'localStorage' });
    return globalLocalStorage;
}

/**
 * Setup global mock sessionStorage
 */
export function setupMockSessionStorage(config?: MockStorageConfig): MockStorage {
    globalSessionStorage = new MockStorage({ ...config, type: 'sessionStorage' });
    return globalSessionStorage;
}

/**
 * Get global mock localStorage
 */
export function getMockLocalStorage(): MockStorage | null {
    return globalLocalStorage;
}

/**
 * Get global mock sessionStorage
 */
export function getMockSessionStorage(): MockStorage | null {
    return globalSessionStorage;
}

/**
 * Setup all storage mocks (localStorage + sessionStorage)
 */
export function setupMockStorage(config?: MockStorageConfig): { localStorage: MockStorage; sessionStorage: MockStorage } {
    const local = setupMockLocalStorage(config);
    const session = setupMockSessionStorage(config);
    return { localStorage: local, sessionStorage: session };
}

/**
 * Get mock storage (prefers localStorage if available)
 */
export function getMockStorage(): MockStorage | null {
    return globalLocalStorage;
}

/**
 * Polyfill global storage for Node.js environment
 */
export function installGlobalStorage(): void {
    if (typeof globalThis !== 'undefined') {
        const localStorage = new MockStorage({ type: 'localStorage' });
        const sessionStorage = new MockStorage({ type: 'sessionStorage' });

        // Only set if not already defined
        if (!globalThis.localStorage) {
            (globalThis as any).localStorage = localStorage;
        }
        if (!globalThis.sessionStorage) {
            (globalThis as any).sessionStorage = sessionStorage;
        }
    }
}

/**
 * Restore original storage (cleanup)
 */
export function restoreOriginalStorage(): void {
    // In a real scenario, you'd restore the original references
    // For now, we just nullify our globals
    if (globalThis) {
        (globalThis as any).localStorage = undefined;
        (globalThis as any).sessionStorage = undefined;
    }
    globalLocalStorage = null;
    globalSessionStorage = null;
}

/**
 * Common test data for storage
 */
export const storageFixtures = {
    sessionData: {
        sessionId: 'session_001',
        sessionData: JSON.stringify({
            id: 'session_001',
            createdAt: new Date().toISOString(),
            context: {},
            history: []
        })
    },

    userPreferences: JSON.stringify({
        theme: 'dark',
        language: 'en',
        notifications: true
    }),

    cachedResults: JSON.stringify({
        promise_001: { status: 'completed', result: {} },
        promise_002: { status: 'pending', result: null }
    }),

    createSession: (sessionId: string, data: object = {}): string => {
        return JSON.stringify({
            id: sessionId,
            createdAt: new Date().toISOString(),
            ...data
        });
    }
};

/**
 * Create storage mock with initial data
 */
export function createStorageMock(initialData: StorageData = {}): MockStorage {
    return new MockStorage({ initialData });
}
