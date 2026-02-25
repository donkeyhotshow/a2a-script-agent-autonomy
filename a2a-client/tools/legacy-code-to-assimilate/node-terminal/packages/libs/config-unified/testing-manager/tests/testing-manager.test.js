import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

import { TestingConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-config.json');
const TEST_SCHEMA_PATH = path.join(__dirname, 'test-schema.json');
const TEST_SUITES_DIR_PATH = path.join(__dirname, 'data', 'test-suites');

// Mock fs/promises and fs for isolated testing
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
    mkdir: vi.fn(() => Promise.resolve()),
    readdir: vi.fn(() => Promise.resolve([]))
  };
});

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

describe('TestingConfigManager', () => {
  let manager;
  let mockConfigContent;
  let mockSchemaContent;
  let mockStatResult;
  let originalConsoleError;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(async () => {
    originalConsoleError = console.error;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockConfigContent = {
      generalSettings: {
        testFramework: 'vitest',
        reportFormat: 'json',
        verbose: true
      },
      libraryPaths: {
        'app-framework': '/libs/app-framework',
        'core': '/libs/core'
      },
      testCategories: {
        unit: {
          pattern: '*.unit.test.js',
          runner: 'vitest'
        },
        integration: {
          pattern: '*.integration.test.js',
          runner: 'vitest'
        }
      },
      systemDefaults: {
        daemon: {
          enabled: true,
          scanInterval: 5000,
          logPath: 'logs/daemon.log'
        },
        reportGeneration: {
          outputPath: 'reports/',
          includeCodeCoverage: true
        }
      },
      testSuiteTemplate: {
        settings: {
          retries: 1,
          timeout: 10000
        },
        steps: []
      },
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test Testing Manager Configuration'
      }
    };

    mockSchemaContent = JSON.parse(readFileSync(TEST_SCHEMA_PATH, 'utf8'));

    mockStatResult = {
      mtime: {
        getTime: () => Date.now(),
      },
    };

    fs.readFile.mockResolvedValue(JSON.stringify(mockConfigContent));
    fs.writeFile.mockResolvedValue(undefined);
    fs.stat.mockResolvedValue(mockStatResult);
    readFileSync.mockImplementation((filePath, encoding) => {
      if (filePath === TEST_SCHEMA_PATH) {
        return JSON.stringify(mockSchemaContent);
      }
      if (filePath === path.join(TEST_SUITES_DIR_PATH, 'testing-taskmanager.json')) {
        return JSON.stringify({
          name: 'Testing TaskManager',
          description: 'A suite of tests for the TaskManager service.',
          appId: 'task-manager-service',
          settings: {
            retries: 2,
            timeout: 20000,
            environment: 'test'
          },
          tests: [],
          metadata: {
            created: '2023-01-01T00:00:00.000Z',
            version: '1.0.0'
          }
        });
      }
      if (filePath === path.join(TEST_SUITES_DIR_PATH, 'autoclicker.json')) {
        return JSON.stringify({
          name: 'Autoclicker Functional Tests',
          description: 'Functional tests for the Autoclicker application.',
          appId: 'autoclicker',
          settings: {
            browser: 'chromium',
            headless: false,
            viewport: {
              width: 1280,
              height: 720
            }
          },
          tests: [],
          metadata: {
            created: '2023-01-01T00:00:00.000Z',
            version: '1.0.0'
          }
        });
      }
      return '{}';
    });

    manager = new TestingConfigManager();
    manager.configPath = TEST_CONFIG_PATH;
    manager.schemaPath = TEST_SCHEMA_PATH;
    manager.testSuitesDirPath = TEST_SUITES_DIR_PATH; // Set the mocked path
    manager.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError;
    console.warn.mockRestore();
  });

  it('должен корректно инициализироваться', () => {
    expect(manager).toBeInstanceOf(TestingConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(manager.schemaPath).toBe(TEST_SCHEMA_PATH);
    expect(manager.validate).toBeDefined();
    expect(manager.testSuitesDirPath).toBe(TEST_SUITES_DIR_PATH);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('должен выводить ошибку, если схема не загружена или не скомпилирована', () => {
    vi.clearAllMocks();
    readFileSync.mockImplementation(() => { throw new Error('Schema file not found'); });

    const brokenManager = new TestingConfigManager();
    expect(brokenManager.validate).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load or compile schema for testing-manager config: Schema file not found'));
  });

  describe('getConfig', () => {
    it('должен загружать конфигурацию из файла, если кэш пуст', async () => {
      const config = await manager.getConfig();
      expect(config).toEqual(mockConfigContent);
      expect(fs.readFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, 'utf-8');
    });

    it('должен использовать кэш, если доступен и не принудительная перезагрузка', async () => {
      manager.cache = mockConfigContent;
      manager.lastModified = mockStatResult.mtime.getTime();
      const config = await manager.getConfig(false);
      expect(config).toEqual(mockConfigContent);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('должен перезагружать конфигурацию, если forceReload истинно', async () => {
      manager.cache = { someOtherData: true };
      const config = await manager.getConfig(true);
      expect(config).toEqual(mockConfigContent);
      expect(fs.readFile).toHaveBeenCalled();
    });

    it('должен возвращать конфигурацию по умолчанию при ошибке загрузки', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      const config = await manager.getConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(fs.readFile).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации тестирования:', expect.any(Error));
    });
  });

  describe('loadConfig', () => {
    it('должен загружать конфигурацию из файла', async () => {
      const config = await manager.loadConfig();
      expect(config).toEqual(mockConfigContent);
      expect(fs.readFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, 'utf-8');
    });

    it('должен возвращать конфигурацию по умолчанию, если файл не найден', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию тестирования, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию тестирования, используется по умолчанию');
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена', async () => {
      const invalidConfig = { ...mockConfigContent, generalSettings: { ...mockConfigContent.generalSettings, testFramework: 123 } };
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Testing Task Manager Configuration failed validation: data/generalSettings/testFramework must be string"));
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, generalSettings: { ...mockConfigContent.generalSettings, testFramework: 'jest' } };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, generalSettings: { ...mockConfigContent.generalSettings, testFramework: 'cypress' } };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, generalSettings: { ...mockConfigContent.generalSettings, testFramework: 'playwright' } };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации тестирования:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.generalSettings).toEqual({});
      expect(defaultConfig.metadata).toBeDefined();
    });
  });

  describe('getGeneralSettings', () => {
    it('должен возвращать общие настройки', async () => {
      const settings = await manager.getGeneralSettings();
      expect(settings).toEqual(mockConfigContent.generalSettings);
    });
  });

  describe('getLibraryPaths', () => {
    it('должен возвращать пути к библиотекам', async () => {
      const paths = await manager.getLibraryPaths();
      expect(paths).toEqual(mockConfigContent.libraryPaths);
    });
  });

  describe('getTestCategories', () => {
    it('должен возвращать категории тестов', async () => {
      const categories = await manager.getTestCategories();
      expect(categories).toEqual(mockConfigContent.testCategories);
    });
  });

  describe('getSystemDefaults', () => {
    it('должен возвращать системные настройки по умолчанию', async () => {
      const defaults = await manager.getSystemDefaults();
      expect(defaults).toEqual(mockConfigContent.systemDefaults);
    });
  });

  describe('getTestSuiteTemplate', () => {
    it('должен возвращать шаблон тестового набора', async () => {
      const template = await manager.getTestSuiteTemplate();
      expect(template).toEqual(mockConfigContent.testSuiteTemplate);
    });
  });

  describe('loadTestSuite', () => {
    it('должен загружать тестовый набор из файла и кэшировать его', async () => {
      const suite = await manager.loadTestSuite('testing-taskmanager');
      expect(suite.name).toBe('Testing TaskManager');
      expect(manager.testSuites.has('testing-taskmanager')).toBe(true);
      expect(readFileSync).toHaveBeenCalledWith(path.join(TEST_SUITES_DIR_PATH, 'testing-taskmanager.json'), 'utf8');
    });

    it('должен возвращать кэшированный тестовый набор без повторной загрузки', async () => {
      await manager.loadTestSuite('testing-taskmanager'); // Load and cache
      readFileSync.mockClear(); // Clear mock calls
      const suite = await manager.loadTestSuite('testing-taskmanager'); // Load again
      expect(suite.name).toBe('Testing TaskManager');
      expect(readFileSync).not.toHaveBeenCalled(); // Should not call readFileSync again
    });

    it('должен выбрасывать ошибку, если тестовый набор не найден', async () => {
      readFileSync.mockImplementation((filePath) => {
        if (filePath === path.join(TEST_SUITES_DIR_PATH, 'non-existent-suite.json')) {
          throw new Error('File not found');
        }
        return '{}';
      });
      await expect(manager.loadTestSuite('non-existent-suite')).rejects.toThrow("Test suite 'non-existent-suite' not found or invalid.");
    });

    it('должен выбрасывать ошибку, если тестовый набор невалиден (не JSON)', async () => {
      readFileSync.mockImplementation((filePath) => {
        if (filePath === path.join(TEST_SUITES_DIR_PATH, 'invalid-suite.json')) {
          return 'invalid json';
        }
        return '{}';
      });
      await expect(manager.loadTestSuite('invalid-suite')).rejects.toThrow("Test suite 'invalid-suite' not found or invalid.");
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, generalSettings: { ...mockConfigContent.generalSettings, verbose: false } };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch();

      await manager.saveConfig({ ...mockConfigContent, generalSettings: { ...mockConfigContent.generalSettings, verbose: true } });
      expect(watcher).toHaveBeenCalledTimes(1);
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, generalSettings: { ...mockConfigContent.generalSettings, verbose: false } };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации тестирования:', expect.any(Error));
    });
  });

  describe('clearCache', () => {
    it('должен очищать кэш', async () => {
      await manager.getConfig();
      expect(manager.cache).toBeDefined();
      expect(manager.lastModified).toBeDefined();

      manager.clearCache();
      expect(manager.cache).toBeNull();
      expect(manager.lastModified).toBeNull();
    });
  });

  describe('getInfo', () => {
    it('должен возвращать информацию о менеджере', async () => {
      await manager.getConfig();
      const info = manager.getInfo();
      expect(info.name).toBe('testing-manager');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0);
      expect(info.lastModified).toBeDefined();
    });
  });
});
