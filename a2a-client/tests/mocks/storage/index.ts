/**
 * Storage Mocks Index
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
