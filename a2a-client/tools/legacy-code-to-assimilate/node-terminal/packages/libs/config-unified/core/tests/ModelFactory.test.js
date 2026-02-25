const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { ModelFactory } = require('../ModelFactory.cjs');
const { BaseModel } = require('../BaseModel.cjs');

// Mock fs and path for createModelFromFile
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
  extname: jest.fn(),
  resolve: jest.fn((p) => p), // Mock resolve to return path directly
}));

// Mock global fetch for createModelFromURL
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ModelFactory', () => {
  let factory;

  beforeEach(() => {
    factory = new ModelFactory();
    factory.clear(); // Ensure clean state
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  class TestModel extends BaseModel {
    constructor(config, options) {
      super(config, options);
      this.type = 'test';
    }
  }

  class AnotherTestModel extends BaseModel {
    constructor(config, options) {
      super(config, options);
      this.type = 'anotherTest';
    }
  }

  const testSchema = {
    type: 'object',
    properties: {
      data: { type: 'string' },
    },
    required: ['data'],
  };

  it('should register a model type and schema', () => {
    factory.registerModelType('test', TestModel, testSchema);
    expect(factory.isRegistered('test')).toBe(true);
    expect(factory.getSchema('test')).toEqual(testSchema);
    expect(factory.getRegisteredTypes()).toEqual(['test']);
  });

  it('should create a model instance', () => {
    factory.registerModelType('test', TestModel);
    const config = { data: 'some data' };
    const model = factory.createModel('test', config);
    expect(model).toBeInstanceOf(TestModel);
    expect(model.config).toEqual(config);
  });

  it('should throw an error if model type is not registered', () => {
    expect(() => factory.createModel('nonExistent', {})).toThrow('Model type \"nonExistent\" is not registered');
  });

  it('should create a model with schema', () => {
    factory.registerModelType('test', TestModel, testSchema);
    const config = { data: 'some data' };
    const model = factory.createModel('test', config);
    expect(model.schema).toEqual(testSchema);
    const validation = model.validate(config);
    expect(validation.valid).toBe(true);
  });

  describe('createModelFromFile', () => {
    it('should create a model from a JSON file', async () => {
      factory.registerModelType('test', TestModel);
      const mockFileContent = JSON.stringify({ data: 'file data' });
      const fs = await import('fs');
      fs.readFileSync.mockReturnValue(mockFileContent);

      const model = await factory.createModelFromFile('test', '/fake/path/config.json');
      expect(model).toBeInstanceOf(TestModel);
      expect(model.config).toEqual({ data: 'file data' });
      expect(fs.readFileSync).toHaveBeenCalledWith('/fake/path/config.json', 'utf8');
    });

    it('should throw an error if file reading fails', async () => {
      factory.registerModelType('test', TestModel);
      const fs = await import('fs');
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File error');
      });

      await expect(factory.createModelFromFile('test', '/fake/path/nonexistent.json'))
        .rejects.toThrow(/Failed to create model from file/);
    });

    it('should throw an error for invalid JSON file', async () => {
      factory.registerModelType('test', TestModel);
      const fs = await import('fs');
      fs.readFileSync.mockReturnValue('invalid json');

      await expect(factory.createModelFromFile('test', '/fake/path/invalid.json'))
        .rejects.toThrow(/Failed to create model from file/);
    });
  });

  describe('createModelFromURL', () => {
    it('should create a model from a URL', async () => {
      factory.registerModelType('test', TestModel);
      const mockResponse = { data: 'url data' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const model = await factory.createModelFromURL('test', 'http://example.com/config.json');
      expect(model).toBeInstanceOf(TestModel);
      expect(model.config).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('http://example.com/config.json');
    });

    it('should throw an error if URL fetching fails', async () => {
      factory.registerModelType('test', TestModel);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(factory.createModelFromURL('test', 'http://example.com/nonexistent.json'))
        .rejects.toThrow(/Failed to create model from URL/);
    });

    it('should throw an error for invalid JSON from URL', async () => {
      factory.registerModelType('test', TestModel);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(factory.createModelFromURL('test', 'http://example.com/invalid.json'))
        .rejects.toThrow(/Failed to create model from URL/);
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return a list of registered model types', () => {
      factory.registerModelType('test', TestModel);
      factory.registerModelType('anotherTest', AnotherTestModel);
      expect(factory.getRegisteredTypes()).toEqual(['test', 'anotherTest']);
    });
  });

  describe('isRegistered', () => {
    it('should return true for a registered type', () => {
      factory.registerModelType('test', TestModel);
      expect(factory.isRegistered('test')).toBe(true);
    });

    it('should return false for an unregistered type', () => {
      expect(factory.isRegistered('nonExistent')).toBe(false);
    });
  });

  describe('getSchema', () => {
    it('should return the schema for a registered type', () => {
      factory.registerModelType('test', TestModel, testSchema);
      expect(factory.getSchema('test')).toEqual(testSchema);
    });

    it('should return undefined if no schema is registered for the type', () => {
      factory.registerModelType('test', TestModel);
      expect(factory.getSchema('test')).toBeUndefined();
    });
  });

  describe('setSchema', () => {
    it('should set a schema for a registered type', () => {
      factory.registerModelType('test', TestModel);
      const newSchema = { type: 'string' };
      factory.setSchema('test', newSchema);
      expect(factory.getSchema('test')).toEqual(newSchema);
    });
  });

  describe('createModelsFromConfig', () => {
    it('should create multiple models from a config object', () => {
      factory.registerModelType('test', TestModel);
      factory.registerModelType('anotherTest', AnotherTestModel);

      const configs = {
        test: { data: 'config for test' },
        anotherTest: { value: 123 },
      };

      const models = factory.createModelsFromConfig(configs);
      expect(models.size).toBe(2);
      expect(models.get('test')).toBeInstanceOf(TestModel);
      expect(models.get('anotherTest')).toBeInstanceOf(AnotherTestModel);
      expect(models.get('test').config).toEqual({ data: 'config for test' });
    });

    it('should skip models with unregistered types and log a warning', () => {
      factory.registerModelType('test', TestModel);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const configs = {
        test: { data: 'config for test' },
        unregistered: { data: 'should be skipped' },
      };

      const models = factory.createModelsFromConfig(configs);
      expect(models.size).toBe(1);
      expect(models.has('test')).toBe(true);
      expect(models.has('unregistered')).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to create model \"unregistered\":', 'Model type \"unregistered\" is not registered');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('createModelAuto', () => {
    it('should create a model with automatically detected type (apps-list)', () => {
      factory.registerModelType('apps-list', TestModel);
      const config = { apps: [{ id: 'app1' }] };
      const model = factory.createModelAuto(config);
      expect(model).toBeInstanceOf(TestModel);
      expect(model.config).toEqual(config);
    });

    it('should create a model with automatically detected type (services)', () => {
      factory.registerModelType('services', AnotherTestModel);
      const config = { services: [{ id: 'service1' }] };
      const model = factory.createModelAuto(config);
      expect(model).toBeInstanceOf(AnotherTestModel);
      expect(model.config).toEqual(config);
    });

    it('should return a BaseModel if type cannot be detected or is unregistered', () => {
      const config = { unknownProperty: 'value' };
      const model = factory.createModelAuto(config);
      expect(model).toBeInstanceOf(BaseModel);
      expect(model.config).toEqual(config);
    });

    it('should return a BaseModel for non-object config', () => {
      const model = factory.createModelAuto(null);
      expect(model).toBeInstanceOf(BaseModel);
      expect(model.config).toEqual(null);
    });
  });

  describe('detectModelType', () => {
    it('should detect \'services\' type', () => {
      const type = factory.detectModelType({ services: [] });
      expect(type).toBe('services');
    });

    it('should detect \'servers\' type', () => {
      const type = factory.detectModelType({ servers: [] });
      expect(type).toBe('servers');
    });

    it('should detect \'apps-list\' type', () => {
      const type = factory.detectModelType({ apps: [] });
      expect(type).toBe('apps-list');
    });

    it('should detect \'project-types\' type', () => {
      const type = factory.detectModelType({ projectTypes: [] });
      expect(type).toBe('project-types');
    });

    it('should detect \'service-groups\' type', () => {
      const type = factory.detectModelType({ groups: {} });
      expect(type).toBe('service-groups');
    });

    it('should detect \'ports\' type', () => {
      const type = factory.detectModelType({ ports: [] });
      expect(type).toBe('ports');
    });

    it('should detect \'settings\' type', () => {
      const type = factory.detectModelType({ settings: {} });
      expect(type).toBe('settings');
    });

    it('should return null for unknown config structure', () => {
      const type = factory.detectModelType({ unknown: 'property' });
      expect(type).toBeNull();
    });

    it('should return null for non-object config', () => {
      expect(factory.detectModelType(null)).toBeNull();
      expect(factory.detectModelType(123)).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all registered model types and schemas', () => {
      factory.registerModelType('test', TestModel, testSchema);
      expect(factory.getRegisteredTypes().length).toBe(1);
      factory.clear();
      expect(factory.getRegisteredTypes().length).toBe(0);
      expect(factory.modelTypes.size).toBe(0);
      expect(factory.schemas.size).toBe(0);
    });
  });
});
