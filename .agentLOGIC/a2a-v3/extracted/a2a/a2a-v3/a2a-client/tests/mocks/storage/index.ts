/**
 * Storage Mocks Index
 * 
 * @deprecated localStorage/sessionStorage is deprecated in production code.
 * Use StorageAPI (file-based) instead.
 * 
 * This module is kept for backward compatibility with legacy tests only.
 * See: a2a-client/tests/mocks/README.md for migration guide.
 */

export { 
    MockStorage, 
    createMockStorage,
    setupMockLocalStorage,
    setupMockSessionStorage,
    setupMockStorage,
    getMockLocalStorage,
    getMockSessionStorage,
    getMockStorage,
    installGlobalStorage,
    restoreOriginalStorage,
    storageFixtures,
    createStorageMock
} from './mock-storage.js';
export type { 
    MockStorageConfig, 
    StorageData 
} from './mock-storage.js';
