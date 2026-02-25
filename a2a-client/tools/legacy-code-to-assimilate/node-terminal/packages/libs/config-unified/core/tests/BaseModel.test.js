const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { BaseModel } = require('../BaseModel.cjs');

describe('BaseModel', () => {
  let model;
  let schema;
  let initialConfig;

  beforeEach(() => {
    schema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string', format: 'email' },
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
          required: ['street', 'city'],
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        dynamicField: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9]+$': { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      required: ['id', 'name'],
    };

    initialConfig = {
      id: 'user1',
      name: 'John Doe',
      age: 30,
      email: 'john.doe@example.com',
      address: {
        street: '123 Main St',
        city: 'Anytown',
      },
      tags: ['developer', 'backend'],
      dynamicField: { prop1: 'value1' },
    };

    model = new BaseModel(initialConfig, { schema });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    model.clearCache();
  });

  it('should initialize with given config and schema', () => {
    expect(model.config).toEqual(initialConfig);
    expect(model.schema).toEqual(schema);
    expect(model.isLoaded).toBe(false);
    expect(model.cacheMap.size).toBe(0);
    expect(model.events.size).toBe(0);
  });

  describe('Validation', () => {
    it('should validate a valid configuration', () => {
      const validation = model.validate(initialConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should invalidate an invalid configuration missing required fields', () => {
      const invalidConfig = { name: 'Jane Doe' }; // Missing 'id'
      const validation = model.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].instancePath).toBe('/id');
    });

    it('should invalidate an invalid configuration with wrong type', () => {
      const invalidConfig = { ...initialConfig, age: 'thirty' }; // age should be number
      const validation = model.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].instancePath).toBe('/age');
    });

    it('should invalidate an invalid configuration with invalid email format', () => {
      const invalidConfig = { ...initialConfig, email: 'invalid-email' };
      const validation = model.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].instancePath).toBe('/email');
    });

    it('should validate an object against a patternProperty', () => {
      const validConfig = { ...initialConfig, dynamicField: { validKey: 'someValue' } };
      const validation = model.validate(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should invalidate an object against a patternProperty if additional properties are not allowed', () => {
      const invalidConfig = { ...initialConfig, dynamicField: { 'invalid-key!': 'someValue' } };
      const validation = model.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('get', () => {
    it('should return the entire config if no key is provided', () => {
      expect(model.get()).toEqual(initialConfig);
    });

    it('should return a top-level value', () => {
      expect(model.get('name')).toBe('John Doe');
    });

    it('should return a nested value', () => {
      expect(model.get('address.city')).toBe('Anytown');
    });

    it('should return default value for a non-existent key', () => {
      expect(model.get('nonExistent', 'default')).toBe('default');
    });

    it('should return default value for a non-existent nested key', () => {
      expect(model.get('address.zip', '12345')).toBe('12345');
    });

    it('should return null for a non-existent key if no default value is provided', () => {
      expect(model.get('nonExistent')).toBeNull();
    });

    it('should return array elements correctly', () => {
      expect(model.get('tags')).toEqual(['developer', 'backend']);
    });
  });

  describe('set', () => {
    it('should set a top-level value and update lastModified', () => {
      const now = new Date();
      jest.setSystemTime(now);
      model.set('age', 31);
      expect(model.get('age')).toBe(31);
      expect(model.lastModified).toEqual(now);
    });

    it('should set a nested value', () => {
      model.set('address.street', '456 Oak Ave');
      expect(model.get('address.street')).toBe('456 Oak Ave');
    });

    it('should create nested objects if they do not exist', () => {
      model.set('new.nested.value', 100);
      expect(model.get('new.nested.value')).toBe(100);
    });

    it('should throw an error for invalid value based on schema', () => {
      expect(() => model.set('age', 'invalid')).toThrow('Validation failed for key \"age\"');
    });

    it('should throw an error for missing required nested fields when setting a parent object', () => {
      expect(() => model.set('address', { street: 'Missing City' })).toThrow('Validation failed');
    });

    it('should emit a \'change\' event', () => {
      const listener = jest.fn();
      model.on('change', listener);
      model.set('name', 'Jane Doe');
      expect(listener).toHaveBeenCalledWith({
        key: 'name',
        value: 'Jane Doe',
        config: model.config,
      });
    });

    it('should clear the cache on set', () => {
      model.cache('someKey', 'someValue');
      expect(model.cacheMap.size).toBe(1);
      model.set('age', 31);
      expect(model.cacheMap.size).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return a copy of the entire config', () => {
      const allConfig = model.getAll();
      expect(allConfig).toEqual(initialConfig);
      expect(allConfig).not.toBe(model.config); // Should be a copy
    });
  });

  describe('updateAll', () => {
    it('should update the entire config with valid data', () => {
      const newConfig = {
        id: 'user2',
        name: 'Jane Smith',
        age: 25,
        address: { street: '101 Park Ave', city: 'New York' },
      };
      model.updateAll(newConfig);
      expect(model.config).toEqual(newConfig);
      expect(model.lastModified).toBeInstanceOf(Date);
    });

    it('should throw an error for invalid full config', () => {
      const invalidConfig = { name: 'Invalid' }; // Missing 'id'
      expect(() => model.updateAll(invalidConfig)).toThrow('Validation failed');
    });

    it('should emit an \'update\' event', () => {
      const listener = jest.fn();
      model.on('update', listener);
      const newConfig = { ...initialConfig, name: 'Updated Name' };
      model.updateAll(newConfig);
      expect(listener).toHaveBeenCalledWith({ config: newConfig });
    });

    it('should clear the cache on updateAll', () => {
      model.cache('someKey', 'someValue');
      expect(model.cacheMap.size).toBe(1);
      model.updateAll({ ...initialConfig, name: 'Changed' });
      expect(model.cacheMap.size).toBe(0);
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should correctly serialize and deserialize the model', () => {
      const json = model.toJSON();
      const newModel = BaseModel.fromJSON(json);

      expect(newModel.config).toEqual(model.config);
      expect(newModel.schema).toEqual(model.schema);
      expect(newModel.lastModified.toISOString()).toEqual(model.lastModified.toISOString()); // Compare ISO strings for Date objects
      expect(newModel.isLoaded).toBe(true);
    });

    it('should retain event listeners after fromJSON', () => {
        // Note: fromJSON creates a new instance, so event listeners are not directly transferred
        // This test rather checks if the new instance itself can register and emit events.
        const json = model.toJSON();
        const newModel = BaseModel.fromJSON(json);
        const listener = jest.fn();
        newModel.on('change', listener);
        newModel.set('name', 'Deserialized Name');
        expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('getVersion', () => {
    it('should return the version from config if present', () => {
      expect(model.getVersion()).toBe(initialConfig.version || '1.0.0'); // Assuming config doesn't have version yet
      model.set('version', '2.0.0');
      expect(model.getVersion()).toBe('2.0.0');
    });

    it('should return default version if not present', () => {
      const noVersionConfig = { id: 'test', name: 'test' };
      const noVersionModel = new BaseModel(noVersionConfig, { schema });
      expect(noVersionModel.getVersion()).toBe('1.0.0');
    });
  });

  describe('Cache', () => {
    it('should cache a value and retrieve it', () => {
      model.cache('testKey', 'testValue', 10000);
      expect(model.getCached('testKey')).toBe('testValue');
    });

    it('should return null for expired cache entry', () => {
      model.cache('expiredKey', 'expiredValue', 100);
      jest.advanceTimersByTime(200);
      expect(model.getCached('expiredKey')).toBeNull();
    });

    it('should clear cache', () => {
      model.cache('key1', 'value1');
      model.cache('key2', 'value2');
      expect(model.cacheMap.size).toBe(2);
      model.clearCache();
      expect(model.cacheMap.size).toBe(0);
    });
  });

  describe('Events', () => {
    it('should register and emit events', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      model.on('testEvent', listener1);
      model.on('testEvent', listener2);

      const eventData = { message: 'Hello' };
      model.emit('testEvent', eventData);

      expect(listener1).toHaveBeenCalledWith(eventData);
      expect(listener2).toHaveBeenCalledWith(eventData);
    });

    it('should unregister event listeners', () => {
      const listener = jest.fn();
      model.on('testEvent', listener);
      model.off('testEvent', listener);
      model.emit('testEvent', { message: 'Hello' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple events', () => {
      const changeListener = jest.fn();
      const updateListener = jest.fn();

      model.on('change', changeListener);
      model.on('update', updateListener);

      model.set('name', 'New Name');
      model.updateAll({ ...initialConfig, age: 35 });

      expect(changeListener).toHaveBeenCalledOnce();
      expect(updateListener).toHaveBeenCalledOnce();
    });

    it('should handle errors in event handlers gracefully', () => {
      const crashingListener = jest.fn(() => { throw new Error('Crashing'); });
      const workingListener = jest.fn();

      model.on('errorEvent', crashingListener);
      model.on('errorEvent', workingListener);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      model.emit('errorEvent', { type: 'test' });

      expect(crashingListener).toHaveBeenCalledTimes(1);
      expect(workingListener).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in event handler for \"errorEvent\":', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('isModelLoaded and load/save methods', () => {
    it('should set isLoaded to true after load() and emit \'loaded\'', async () => {
      const listener = jest.fn();
      model.on('loaded', listener);
      expect(model.isModelLoaded()).toBe(false);
      await model.load();
      expect(model.isModelLoaded()).toBe(true);
      expect(listener).toHaveBeenCalledWith({ config: initialConfig });
    });

    it('should emit \'saved\' after save() ', async () => {
      const listener = jest.fn();
      model.on('saved', listener);
      await model.save();
      expect(listener).toHaveBeenCalledWith({ config: initialConfig });
    });
  });

  describe('getMetadata', () => {
    it('should return correct metadata', async () => {
      await model.load();
      model.cache('someKey', 'someValue');
      model.on('testEvent', () => {});

      const metadata = model.getMetadata();
      expect(metadata.version).toBe(model.getVersion());
      expect(metadata.lastModified).toBe(model.lastModified);
      expect(metadata.isLoaded).toBe(true);
      expect(metadata.cacheSize).toBe(1);
      expect(metadata.eventListeners).toEqual(['testEvent']);
    });
  });

  describe('reset', () => {
    it('should reset the model to its initial state', async () => {
      await model.load();
      model.set('age', 40);
      model.cache('someKey', 'someValue');
      const listener = jest.fn();
      model.on('reset', listener);

      expect(model.get('age')).toBe(40);
      expect(model.cacheMap.size).toBe(1);
      expect(model.isLoaded).toBe(true);

      model.reset();

      expect(model.config).toEqual({}); // Empty config after reset
      expect(model.cacheMap.size).toBe(0);
      expect(model.events.size).toBe(0);
      expect(model.isLoaded).toBe(false);
      expect(model.lastModified).toBeNull();
      expect(listener).toHaveBeenCalledOnce();
    });
  });
});
