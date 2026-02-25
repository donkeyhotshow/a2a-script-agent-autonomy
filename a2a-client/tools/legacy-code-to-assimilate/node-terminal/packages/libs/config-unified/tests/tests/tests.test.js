/**
 * Тесты для TestsConfigManager
 * Тестирует функциональность управления конфигурацией тестов
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

import { TestsConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-tests-config.json');
const TEST_SCHEMA_PATH = path.join(__dirname, 'test-schema.json');

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: vi.fn(),
    fstat: vi.fn(), // Mock fstat for stat() in getConfig
    writeFile: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
  };
});

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

describe('TestsConfigManager', () => {
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
      types: {
        unit: { command: 'npm run test:unit', report: 'reports/unit.json' },
        integration: { command: 'npm run test:integration', report: 'reports/integration.json' }
      },
      matrix: [
        { appId: 'app1', types: ['unit', 'integration'] },
        { appId: 'app2', types: ['unit'] }
      ],
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test configuration'
      }
    };

    mockSchemaContent = {
      type: 'object',
      properties: {
        types: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9_-]+$': {
              type: 'object',
              properties: {
                command: { type: 'string' },
                report: { type: 'string' }
              },
              required: ['command', 'report'],
              additionalProperties: false
            }
          },
          additionalProperties: false
        },
        matrix: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              appId: { type: 'string' },
              types: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['appId', 'types'],
            additionalProperties: false
          }
        },
        metadata: {
          type: 'object',
          properties: {
            created: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            description: { type: 'string' }
          },
          required: ['created', 'version', 'description'],
          additionalProperties: false
        }
      },
      required: ['types', 'matrix', 'metadata'],
      additionalProperties: false
    };

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
      return JSON.stringify({}); // Default for other readFileSync calls
    });

    manager = new TestsConfigManager();
    manager.configPath = TEST_CONFIG_PATH;
    manager.schemaPath = TEST_SCHEMA_PATH;
    manager.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError;
    console.warn.mockRestore();
  });

  it('должен корректно инициализироваться', () => {
    expect(manager).toBeInstanceOf(TestsConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(manager.schemaPath).toBe(TEST_SCHEMA_PATH);
    expect(manager.validate).toBeDefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('должен выводить ошибку, если схема не загружена или не скомпилирована', () => {
    vi.clearAllMocks();
    readFileSync.mockImplementation(() => { throw new Error('Schema file not found'); });

    const brokenManager = new TestsConfigManager();
    expect(brokenManager.validate).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load or compile schema for tests config: Schema file not found'));
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации тестов:', expect.any(Error));
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
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию тестов, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию тестов, используется по умолчанию');
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена', async () => {
      const invalidConfig = { ...mockConfigContent, types: { unit: { command: 123, report: 'reports/unit.json' } } };
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Tests Configuration failed validation: data/types/unit/command must be string"));
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, types: { ...mockConfigContent.types, e2e: { command: 'npm run test:e2e', report: 'reports/e2e.json' } } };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, types: { ...mockConfigContent.types, performance: { command: 'npm run test:perf', report: 'reports/perf.json' } } };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, types: { ...mockConfigContent.types, security: { command: 'npm run test:sec', report: 'reports/sec.json' } } };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации тестов:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.types).toEqual({});
      expect(defaultConfig.matrix).toEqual([]);
      expect(defaultConfig.metadata).toBeDefined();
    });
  });

  describe('getTestType', () => {
    it('должен возвращать тип теста по имени', async () => {
      const unitTest = await manager.getTestType('unit');
      expect(unitTest).toEqual(mockConfigContent.types.unit);
    });

    it('должен возвращать null для несуществующего типа теста', async () => {
      const nonExistentType = await manager.getTestType('non-existent');
      expect(nonExistentType).toBeNull();
    });
  });

  describe('getTestMatrix', () => {
    it('должен возвращать матрицу тестов', async () => {
      const matrix = await manager.getTestMatrix();
      expect(matrix).toEqual(mockConfigContent.matrix);
    });
  });

  describe('addTestType', () => {
    it('должен добавлять новый тип теста', async () => {
      const newTestType = { command: 'npm run test:e2e', report: 'reports/e2e.json' };
      await manager.addTestType('e2e', newTestType);
      const config = await manager.getConfig(true);
      expect(config.types.e2e).toEqual(newTestType);
    });

    it('должен выбрасывать ошибку при добавлении существующего типа теста', async () => {
      const duplicateTestType = { command: 'npm run test:unit', report: 'reports/unit.json' };
      await expect(manager.addTestType('unit', duplicateTestType))
        .rejects.toThrow('Тип теста unit уже существует');
    });
  });

  describe('updateTestMatrixEntry', () => {
    it('должен обновлять запись в матрице тестов', async () => {
      const updates = { types: ['unit'] };
      await manager.updateTestMatrixEntry('app1', updates);
      const config = await manager.getConfig(true);
      expect(config.matrix[0].types).toEqual(['unit']);
    });

    it('должен выбрасывать ошибку при обновлении несуществующей записи', async () => {
      const updates = { types: ['unit'] };
      await expect(manager.updateTestMatrixEntry('non-existent-app', updates))
        .rejects.toThrow('Запись для appId non-existent-app не найдена в матрице тестов');
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, types: { ...mockConfigContent.types, smoke: { command: 'npm run test:smoke', report: 'reports/smoke.json' } } };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch();

      await manager.saveConfig({ ...mockConfigContent, types: { ...mockConfigContent.types, status: { command: 'npm run test:status', report: 'reports/status.json' } } });
      expect(watcher).toHaveBeenCalledTimes(1);
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, types: { ...mockConfigContent.types, lint: { command: 'npm run lint', report: 'reports/lint.json' } } };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации тестов:', expect.any(Error));
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
      expect(info.name).toBe('tests');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0);
      expect(info.lastModified).toBeDefined();
    });
  });
});
