const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { ModelRegistry } = require('../ModelRegistry.cjs');
const { BaseModel } = require('../BaseModel.cjs');
const { ModelFactory } = require('../ModelFactory.cjs');

// Mock ModelFactory and BaseModel to control their behavior
jest.mock('../ModelFactory.cjs');
jest.mock('../BaseModel.cjs');

describe('ModelRegistry', () => {
  let registry;
  let mockApiClient;
  let mockModelInstance;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock BaseModel instance
    mockModelInstance = {
      config: {}, // Represents internal config
      isLoaded: false,
      cacheMap: new Map(),
      events: new Map(),
      lastModified: null,
      // Mock methods of BaseModel
      set: jest.fn(function(key, value) {
        const keys = key.split('.');
        let target = this.config;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
            target[keys[i]] = {};
          }
          target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
        this.lastModified = new Date();
        this.clearCache();
        return this;
      }),
      get: jest.fn(function(key, defaultValue = null) {
        if (!key) return this.config;
        const keys = key.split('.');
        let value = this.config;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            return defaultValue;
          }
        }
        return value;
      }),
      load: jest.fn(async function() {
        this.isLoaded = true;
        this.emit('loaded', { config: this.config });
        return this;
      }),
      save: jest.fn(async function() {
        this.emit('saved', { config: this.config });
        return this;
      }),
      reset: jest.fn(function() {
        this.config = {};
        this.cacheMap.clear();
        this.events.clear();
        this.isLoaded = false;
        this.lastModified = null;
        this.emit('reset');
      }),
      isModelLoaded: jest.fn(function() { return this.isLoaded; }),
      getMetadata: jest.fn(function() {
        return {
          version: this.get('version', '1.0.0'),
          lastModified: this.lastModified,
          isLoaded: this.isLoaded,
          cacheSize: this.cacheMap.size,
          eventListeners: Array.from(this.events.keys()),
        };
      }),
      on: jest.fn(function(event, callback) {
        if (!this.events.has(event)) {
          this.events.set(event, []);
        }
        this.events.get(event).push(callback);
      }),
      emit: jest.fn(function(event, data) {
        if (!this.events.has(event)) return;
        this.events.get(event).forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in event handler for "${event}":`, error);
          }
        });
      }),
      cache: jest.fn(function(key, value, ttl = 300000) {
        const expiresAt = Date.now() + ttl;
        this.cacheMap.set(key, { value, expiresAt });
      }),
      getCached: jest.fn(function(key) {
        const cached = this.cacheMap.get(key);
        if (!cached) return null;
        if (Date.now() > cached.expiresAt) {
          this.cacheMap.delete(key);
          return null;
        }
        return cached.value;
      }),
      clearCache: jest.fn(function() {
        this.cacheMap.clear();
      }),
    };
    
    // Ensure BaseModel constructor returns the mock instance
    BaseModel.mockImplementation(() => mockModelInstance);

    // Setup mock ModelFactory
    ModelFactory.mockImplementation(() => ({
      registerModelType: jest.fn(),
      setSchema: jest.fn(),
      createModel: jest.fn((name, config) => {
        // Return a fresh mockModelInstance for each createModel call
        const newMockModel = { ...mockModelInstance, config: { ...config } };
        // Deep copy the config to ensure isolation
        newMockModel.config = JSON.parse(JSON.stringify(config));
        // Re-mock methods for the new instance to ensure correct `this` context
        newMockModel.set = jest.fn(function(key, value) {
          const keys = key.split('.');
          let target = this.config;
          for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
              target[keys[i]] = {};
            }
            target = target[keys[i]];
          }
          target[keys[keys.length - 1]] = value;
          return this; // Return this for chaining
        });
        newMockModel.get = jest.fn(function(key, defaultValue = null) {
          if (!key) return this.config;
          const keys = key.split('.');
          let value = this.config;
          for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
              value = value[k];
            } else {
              return defaultValue;
            }
          }
          return value;
        });
        newMockModel.load = jest.fn(async function() { this.isLoaded = true; return this; });
        newMockModel.reset = jest.fn(function() { this.config = {}; this.isLoaded = false; });
        newMockModel.isModelLoaded = jest.fn(function() { return this.isLoaded; });
        newMockModel.getMetadata = jest.fn(function() {
          return { isLoaded: this.isLoaded, cacheSize: this.cacheMap.size, eventListeners: Array.from(this.events.keys()) };
        });
        newMockModel.save = jest.fn(async function() { return this; });
        newMockModel.on = jest.fn(function(event, callback) {
          if (!this.events.has(event)) { this.events.set(event, []); }
          this.events.get(event).push(callback);
        });
        newMockModel.emit = jest.fn(function(event, data) {
          if (!this.events.has(event)) return;
          this.events.get(event).forEach(cb => cb(data));
        });
        newMockModel.cache = jest.fn(function(key, value) { this.cacheMap.set(key, { value, expiresAt: Date.now() + 300000 }); });
        newMockModel.getCached = jest.fn(function(key) {
          const cached = this.cacheMap.get(key);
          if (!cached) return null;
          if (Date.now() > cached.expiresAt) { this.cacheMap.delete(key); return null; }
          return cached.value;
        });
        newMockModel.clearCache = jest.fn(function() { this.cacheMap.clear(); });

        return newMockModel;
      }),
    }));

    mockApiClient = {
      get: jest.fn(),
    };

    registry = new ModelRegistry({ apiClient: mockApiClient });
  });

  it('should initialize with a ModelFactory instance', () => {
    expect(registry.factory).toBeInstanceOf(ModelFactory);
    expect(registry.models).toBeInstanceOf(Map);
    expect(registry.isInitialized).toBe(false);
  });

  describe('initialize', () => {
    it('should register default models and load configurations', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock the createModel calls within ModelRegistry's loadConfiguration
      registry.factory.createModel.mockImplementation((name, config) => {
        const newMockModel = { ...mockModelInstance, config: { ...config } };
        newMockModel.load = jest.fn(async function() { this.isLoaded = true; return this; });
        newMockModel.set = jest.fn(function(key, value) { this.config[key] = value; return this; });
        newMockModel.isModelLoaded = jest.fn(() => true);
        newMockModel.getMetadata = jest.fn(() => ({ isLoaded: true, cacheSize: 0, eventListeners: [] }));
        return newMockModel;
      });

      mockApiClient.get.mockResolvedValue({ data: { test: 'config' } });

      await registry.initialize();

      expect(registry.factory.registerModelType).toHaveBeenCalledWith('base', BaseModel);
      expect(registry.factory.setSchema).toHaveBeenCalledWith('base', expect.any(Object));
      expect(mockApiClient.get).toHaveBeenCalledTimes(28); // For each configDir
      expect(registry.models.size).toBe(28);
      expect(registry.isInitialized).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('ModelRegistry initialized with 28 models');

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should not re-initialize if already initialized', async () => {
      registry.isInitialized = true;
      await registry.initialize();
      expect(registry.factory.registerModelType).not.toHaveBeenCalled();
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      registry.factory.registerModelType.mockImplementation(() => { throw new Error('Registration error'); });

      await expect(registry.initialize()).rejects.toThrow('Registration error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize ModelRegistry:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadConfiguration', () => {
    it('should load configuration via API if apiClient is present', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockApiClient.get.mockResolvedValue({ data: { some: 'data' } });

      registry.factory.createModel.mockImplementation((name, config) => {
        const newMockModel = { ...mockModelInstance, config: { ...config } };
        newMockModel.load = jest.fn(async function() { this.isLoaded = true; return this; });
        newMockModel.set = jest.fn(function(key, value) { this.config[key] = value; return this; });
        return newMockModel;
      });

      const model = await registry.loadConfiguration('testConfig');
      expect(mockApiClient.get).toHaveBeenCalledWith('/config/testConfig');
      expect(model.get('data')).toBe('some data');
      expect(model.get('modelName')).toBe('testConfig');
      expect(model.isLoaded).toBe(true);
      expect(registry.models.get('testConfig')).toBe(model);
      expect(consoleLogSpy).toHaveBeenCalledWith('Loaded model \"testConfig\" from API');
      consoleLogSpy.mockRestore();
    });

    it('should return default config if API call fails and no apiClient', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      registry = new ModelRegistry(); // No apiClient

      registry.factory.createModel.mockImplementation((name, config) => {
        const newMockModel = { ...mockModelInstance, config: { ...config } };
        newMockModel.load = jest.fn(async function() { this.isLoaded = true; return this; });
        newMockModel.set = jest.fn(function(key, value) { this.config[key] = value; return this; });
        return newMockModel;
      });

      const model = await registry.loadConfiguration('testConfig');
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(model.get('modelName')).toBe('testConfig');
      expect(model.isLoaded).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith('ModelRegistry: API client not provided. Falling back to file loading (no-op in browser).');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Config file not found for \"testConfig\", creating empty model');
      consoleWarnSpy.mockRestore();
    });

    it('should handle existing loading promise', async () => {
      const loadingPromise = new Promise(resolve => setTimeout(() => resolve(mockModelInstance), 10));
      registry.loadingPromises.set('testConfig', loadingPromise);

      const model = await registry.loadConfiguration('testConfig');
      expect(model).toBe(mockModelInstance);
      expect(registry.factory.createModel).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return a registered model', async () => {
      const testModel = new BaseModel({});
      registry.add('testModel', testModel);
      expect(registry.get('testModel')).toBe(testModel);
    });

    it('should throw an error for a non-existent model', () => {
      expect(() => registry.get('nonExistent')).toThrow('Model \"nonExistent\" is not loaded');
    });
  });

  describe('has', () => {
    it('should return true if model exists', () => {
      registry.add('testModel', mockModelInstance);
      expect(registry.has('testModel')).toBe(true);
    });

    it('should return false if model does not exist', () => {
      expect(registry.has('nonExistent')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered models', () => {
      const model1 = new BaseModel({});
      const model2 = new BaseModel({});
      registry.add('model1', model1);
      registry.add('model2', model2);
      const allModels = registry.getAll();
      expect(allModels.size).toBe(2);
      expect(allModels.get('model1')).toBe(model1);
      expect(allModels.get('model2')).toBe(model2);
      expect(allModels).not.toBe(registry.models); // Should be a copy
    });
  });

  describe('getModelNames', () => {
    it('should return an array of model names', () => {
      registry.add('model1', mockModelInstance);
      registry.add('model2', mockModelInstance);
      expect(registry.getModelNames()).toEqual(['model1', 'model2']);
    });
  });

  describe('add', () => {
    it('should add a BaseModel instance', () => {
      const newModel = new BaseModel({});
      registry.add('newModel', newModel);
      expect(registry.has('newModel')).toBe(true);
    });

    it('should throw an error if not a BaseModel instance', () => {
      expect(() => registry.add('invalidModel', {})).toThrow('Model must be an instance of BaseModel');
    });
  });

  describe('remove', () => {
    it('should remove a model and reset it', () => {
      const modelToRemove = new BaseModel({});
      registry.add('toRemove', modelToRemove);
      expect(registry.has('toRemove')).toBe(true);
      registry.remove('toRemove');
      expect(registry.has('toRemove')).toBe(false);
      expect(modelToRemove.reset).toHaveBeenCalled();
    });

    it('should do nothing if model does not exist', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      registry.remove('nonExistent');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('reload', () => {
    it('should remove and reload a specific model', async () => {
      const mockConfig = { initial: 'data' };
      const reloadedConfig = { reloaded: 'data' };
      mockApiClient.get.mockResolvedValueOnce({ data: reloadedConfig });

      registry.factory.createModel.mockImplementationOnce((name, config) => {
        const newMockModel = { ...mockModelInstance, config: { ...config } };
        newMockModel.load = jest.fn(async function() { this.isLoaded = true; return this; });
        newMockModel.set = jest.fn(function(key, value) { this.config[key] = value; return this; });
        newMockModel.isModelLoaded = jest.fn(() => true);
        newMockModel.getMetadata = jest.fn(() => ({ isLoaded: true, cacheSize: 0, eventListeners: [] }));
        return newMockModel;
      });

      await registry.loadConfiguration('testReload');
      const initialModel = registry.get('testReload');
      expect(initialModel.get('initial')).toBe('data');

      // Mock the createModel for the reload call
      registry.factory.createModel.mockImplementationOnce((name, config) => {
        const newMockModel = { ...mockModelInstance, config: { ...config } };
        newMockModel.load = jest.fn(async function() { this.isLoaded = true; return this; });
        newMockModel.set = jest.fn(function(key, value) { this.config[key] = value; return this; });
        newMockModel.isModelLoaded = jest.fn(() => true);
        newMockModel.getMetadata = jest.fn(() => ({ isLoaded: true, cacheSize: 0, eventListeners: [] }));
        return newMockModel;
      });

      const reloadedModel = await registry.reload('testReload');
      expect(initialModel.reset).toHaveBeenCalled(); // Original model should be reset
      expect(registry.has('testReload')).toBe(true);
      expect(registry.get('testReload')).toBe(reloadedModel);
      expect(reloadedModel.get('reloaded')).toBe('data');
    });
  });

  describe('reloadAll', () => {
    it('should reload all registered models', async () => {
      registry.add('modelA', new BaseModel({ id: 'A' }));
      registry.add('modelB', new BaseModel({ id: 'B' }));

      const configA = { new: 'configA' };
      const configB = { new: 'configB' };

      mockApiClient.get.mockImplementation((url) => {
        if (url.includes('modelA')) return Promise.resolve({ data: configA });
        if (url.includes('modelB')) return Promise.resolve({ data: configB });
        return Promise.resolve({ data: {} });
      });

      // Mock createModel for reloadAll calls
      registry.factory.createModel.mockImplementation((name, config) => {
        const newMockModel = { ...mockModelInstance, config: { ...config } };
        newMockModel.load = jest.fn(async function() { this.isLoaded = true; return this; });
        newMockModel.set = jest.fn(function(key, value) { this.config[key] = value; return this; });
        newMockModel.isModelLoaded = jest.fn(() => true);
        newMockModel.getMetadata = jest.fn(() => ({ isLoaded: true, cacheSize: 0, eventListeners: [] }));
        return newMockModel;
      });

      await registry.reloadAll();
      expect(registry.models.size).toBe(2); // Should still have 2 models
      expect(registry.get('modelA').get('new')).toBe('configA');
      expect(registry.get('modelB').get('new')).toBe('configB');
    });
  });

  describe('saveAll', () => {
    it('should call save on all registered models', async () => {
      const model1 = { save: jest.fn(async () => {}) };
      const model2 = { save: jest.fn(async () => {}) };
      registry.add('model1', model1);
      registry.add('model2', model2);

      await registry.saveAll();
      expect(model1.save).toHaveBeenCalled();
      expect(model2.save).toHaveBeenCalled();
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for all models and registry status', async () => {
      registry.isInitialized = true;
      const model1 = new BaseModel({});
      model1.isLoaded = true; // Manually set for test
      model1.cache('key1', 'value1');
      model1.on('event1', jest.fn());
      model1.set('version', '1.0.0');
      registry.add('model1', model1);

      const model2 = new BaseModel({});
      model2.set('version', '1.1.0');
      registry.add('model2', model2);

      const metadata = registry.getMetadata();
      expect(metadata.totalModels).toBe(2);
      expect(metadata.isInitialized).toBe(true);
      expect(metadata.models.model1.isLoaded).toBe(true);
      expect(metadata.models.model1.cacheSize).toBe(1);
      expect(metadata.models.model1.eventListeners).toEqual(['event1']);
      expect(metadata.models.model2.isLoaded).toBe(false);
    });
  });

  describe('find', () => {
    it('should find models matching criteria', () => {
      const modelA = new BaseModel({ type: 'service', status: 'active' });
      const modelB = new BaseModel({ type: 'service', status: 'inactive' });
      const modelC = new BaseModel({ type: 'app', status: 'active' });

      registry.add('modelA', modelA);
      registry.add('modelB', modelB);
      registry.add('modelC', modelC);

      const results = registry.find({ type: 'service', status: 'active' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('modelA');
      expect(results[0].model).toBe(modelA);
    });

    it('should return empty array if no matches', () => {
      registry.add('modelA', new BaseModel({ type: 'service' }));
      const results = registry.find({ type: 'app' });
      expect(results.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all models and reset initialization status', () => {
      registry.add('model1', mockModelInstance);
      registry.isInitialized = true;

      registry.clear();
      expect(registry.models.size).toBe(0);
      expect(registry.loadingPromises.size).toBe(0);
      expect(registry.isInitialized).toBe(false);
      expect(mockModelInstance.reset).toHaveBeenCalled(); // ensure reset is called on models
    });
  });

  describe('getStats', () => {
    it('should return correct statistics about the registry', async () => {
      const model1 = new BaseModel({});
      model1.isLoaded = true;
      model1.cache('key1', 'value1');
      model1.on('event1', jest.fn());
      registry.add('model1', model1);

      const model2 = new BaseModel({});
      model2.on('event2', jest.fn());
      model2.on('event3', jest.fn());
      registry.add('model2', model2);

      const stats = registry.getStats();
      expect(stats.totalModels).toBe(2);
      expect(stats.loadedModels).toBe(1);
      expect(stats.totalCacheSize).toBe(1);
      expect(stats.totalEventListeners).toBe(3); // 1 from model1, 2 from model2
    });
  });
});
