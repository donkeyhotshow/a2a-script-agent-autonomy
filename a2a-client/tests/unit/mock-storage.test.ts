/**
 * Unit Tests for MockStorage
 * 
 * Tests the mock localStorage/sessionStorage implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
    MockStorage, 
    createMockStorage,
    setupMockLocalStorage,
    setupMockSessionStorage,
    setupMockStorage,
    storageFixtures,
    createStorageMock
} from '../mocks/storage/mock-storage.js';

describe('MockStorage', () => {
    let storage: MockStorage;

    beforeEach(() => {
        storage = new MockStorage({ type: 'localStorage' });
    });

    describe('basic operations', () => {
        it('should set and get item', () => {
            storage.setItem('key', 'value');
            
            expect(storage.getItem('key')).toBe('value');
        });

        it('should return null for non-existent key', () => {
            expect(storage.getItem('nonexistent')).toBeNull();
        });

        it('should remove item', () => {
            storage.setItem('key', 'value');
            storage.removeItem('key');
            
            expect(storage.getItem('key')).toBeNull();
        });

        it('should clear all items', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');
            storage.clear();
            
            expect(storage.getItem('key1')).toBeNull();
            expect(storage.getItem('key2')).toBeNull();
        });
    });

    describe('key and length', () => {
        it('should return correct length', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');
            
            expect(storage.length).toBe(2);
        });

        it('should return key by index', () => {
            storage.setItem('first', 'value1');
            storage.setItem('second', 'value2');
            
            expect(storage.key(0)).toBe('first');
            expect(storage.key(1)).toBe('second');
            expect(storage.key(2)).toBeNull();
        });
    });

    describe('utility methods', () => {
        it('should check if key exists', () => {
            storage.setItem('exists', 'value');
            
            expect(storage.hasKey('exists')).toBe(true);
            expect(storage.hasKey('nonexistent')).toBe(false);
        });

        it('should get all keys', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');
            
            const keys = storage.getKeys();
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
        });

        it('should get all data', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');
            
            const data = storage.getAll();
            expect(data.key1).toBe('value1');
            expect(data.key2).toBe('value2');
        });

        it('should set multiple items', () => {
            storage.setMultiple({
                key1: 'value1',
                key2: 'value2'
            });
            
            expect(storage.getItem('key1')).toBe('value1');
            expect(storage.getItem('key2')).toBe('value2');
        });
    });

    describe('event listeners', () => {
        it('should add and remove event listener', () => {
            const listener = vi.fn();
            
            storage.addEventListener('storage', listener);
            storage.setItem('key', 'value');
            
            expect(listener).toHaveBeenCalledTimes(1);
            
            storage.removeEventListener('storage', listener);
            storage.setItem('key2', 'value2');
            
            expect(listener).toHaveBeenCalledTimes(1);
        });
    });

    describe('initial data', () => {
        it('should initialize with provided data', () => {
            const storageWithData = new MockStorage({
                initialData: { initial: 'data' },
                type: 'localStorage'
            });
            
            expect(storageWithData.getItem('initial')).toBe('data');
        });
    });

    describe('reset', () => {
        it('should reset to initial state', () => {
            const storageWithData = new MockStorage({
                initialData: { initial: 'data' },
                type: 'localStorage'
            });
            
            storageWithData.setItem('new', 'value');
            storageWithData.reset();
            
            expect(storageWithData.getItem('initial')).toBe('data');
            expect(storageWithData.getItem('new')).toBeNull();
        });
    });
});

describe('storageFixtures', () => {
    it('should create valid session data', () => {
        const sessionData = storageFixtures.createSession('test_session', { test: true });
        const parsed = JSON.parse(sessionData);
        
        expect(parsed.id).toBe('test_session');
        expect(parsed.test).toBe(true);
        expect(parsed.createdAt).toBeDefined();
    });

    it('should provide user preferences fixture', () => {
        const prefs = JSON.parse(storageFixtures.userPreferences);
        
        expect(prefs.theme).toBe('dark');
        expect(prefs.language).toBe('en');
    });

    it('should provide cached results fixture', () => {
        const cached = JSON.parse(storageFixtures.cachedResults);
        
        expect(cached.promise_001).toBeDefined();
        expect(cached.promise_001.status).toBe('completed');
    });
});

describe('global storage setup', () => {
    it('should create mock localStorage', () => {
        const localStorage = setupMockLocalStorage();
        
        expect(localStorage).toBeInstanceOf(MockStorage);
    });

    it('should create mock sessionStorage', () => {
        const sessionStorage = setupMockSessionStorage();
        
        expect(sessionStorage).toBeInstanceOf(MockStorage);
    });

    it('should setup both storages', () => {
        const { localStorage, sessionStorage } = setupMockStorage();
        
        expect(localStorage).toBeInstanceOf(MockStorage);
        expect(sessionStorage).toBeInstanceOf(MockStorage);
    });
});

describe('createStorageMock', () => {
    it('should create storage with initial data', () => {
        const storage = createStorageMock({ test: 'data' });
        
        expect(storage.getItem('test')).toBe('data');
    });
});
