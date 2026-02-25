import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

import { TaskTypesConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-task-types-config.json');
const TEST_SCHEMA_PATH = path.join(__dirname, 'test-task-types-schema.json');

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: vi.fn(),
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

describe('TaskTypesConfigManager', () => {
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
      taskTypes: {
        COMPONENT: {
          name: 'Component Development',
          description: 'Develop a new UI component or update an existing one.',
          priority: 'High',
          estimatedTime: '4h',
          requiresReview: true,
          tags: ['frontend', 'ui', 'react', 'vue']
        },
        API: {
          name: 'API Endpoint',
          description: 'Implement a new API endpoint or modify an existing one.',
          priority: 'High',
          estimatedTime: '6h',
          requiresReview: true,
          tags: ['backend', 'api', 'node']
        }
      },
      qualityThresholds: {
        testCoverage: {
          minPercentage: 80,
          enforce: true,
          priority: 'Critical'
        },
        linterErrors: {
          maxCount: 0,
          enforce: true,
          priority: 'High'
        }
      },
      generationSettings: {
        indentationSize: 2,
        useTabs: false,
        maxLineLength: 120
      },
      fileNaming: {
        component: {
          pattern: 'PascalCase',
          extension: '.vue'
        },
        api: {
          pattern: 'camelCase',
          extension: '.js'
        }
      },
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test Task Types Configuration'
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
        return '{}';
    });

    manager = new TaskTypesConfigManager();
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
    expect(manager).toBeInstanceOf(TaskTypesConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(manager.schemaPath).toBe(TEST_SCHEMA_PATH);
    expect(manager.validate).toBeDefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('должен выводить ошибку, если схема не загружена или не скомпилирована', () => {
    vi.clearAllMocks();
    readFileSync.mockImplementation(() => { throw new Error('Schema file not found'); });

    const brokenManager = new TaskTypesConfigManager();
    expect(brokenManager.validate).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load or compile schema for task types config: Schema file not found'));
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации типов задач:', expect.any(Error));
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
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию типов задач, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию типов задач, используется по умолчанию');
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена', async () => {
      const invalidConfig = { ...mockConfigContent, taskTypes: { ...mockConfigContent.taskTypes, COMPONENT: { ...mockConfigContent.taskTypes.COMPONENT, priority: 'Invalid' } } };
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Task Types Configuration failed validation: data/taskTypes/COMPONENT/priority must be equal to one of the allowed values"));
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, generationSettings: { ...mockConfigContent.generationSettings, indentationSize: 4 } };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, generationSettings: { ...mockConfigContent.generationSettings, indentationSize: 6 } };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, generationSettings: { ...mockConfigContent.generationSettings, indentationSize: 8 } };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации типов задач:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.taskTypes).toEqual({});
      expect(defaultConfig.metadata).toBeDefined();
    });
  });

  describe('getTaskTypes', () => {
    it('должен возвращать все типы задач', async () => {
      const taskTypes = await manager.getTaskTypes();
      expect(taskTypes).toEqual(mockConfigContent.taskTypes);
    });
  });

  describe('getQualityThresholds', () => {
    it('должен возвращать все пороги качества', async () => {
      const qualityThresholds = await manager.getQualityThresholds();
      expect(qualityThresholds).toEqual(mockConfigContent.qualityThresholds);
    });
  });

  describe('getGenerationSettings', () => {
    it('должен возвращать все настройки генерации', async () => {
      const generationSettings = await manager.getGenerationSettings();
      expect(generationSettings).toEqual(mockConfigContent.generationSettings);
    });
  });

  describe('getFileNaming', () => {
    it('должен возвращать все настройки именования файлов', async () => {
      const fileNaming = await manager.getFileNaming();
      expect(fileNaming).toEqual(mockConfigContent.fileNaming);
    });
  });

  describe('getTaskType', () => {
    it('должен возвращать тип задачи по ID', async () => {
      const componentTaskType = await manager.getTaskType('COMPONENT');
      expect(componentTaskType).toEqual(mockConfigContent.taskTypes.COMPONENT);
    });

    it('должен возвращать undefined для несуществующего типа задачи', async () => {
      const nonExistentTaskType = await manager.getTaskType('NON_EXISTENT');
      expect(nonExistentTaskType).toBeUndefined();
    });
  });

  describe('getQualityThreshold', () => {
    it('должен возвращать порог качества по ID', async () => {
      const testCoverageThreshold = await manager.getQualityThreshold('testCoverage');
      expect(testCoverageThreshold).toEqual(mockConfigContent.qualityThresholds.testCoverage);
    });

    it('должен возвращать undefined для несуществующего порога качества', async () => {
      const nonExistentThreshold = await manager.getQualityThreshold('nonExistent');
      expect(nonExistentThreshold).toBeUndefined();
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, generationSettings: { ...mockConfigContent.generationSettings, indentationSize: 10 } };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch();

      await manager.saveConfig({ ...mockConfigContent, generationSettings: { ...mockConfigContent.generationSettings, indentationSize: 12 } });
      expect(watcher).toHaveBeenCalledTimes(1);
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, generationSettings: { ...mockConfigContent.generationSettings, indentationSize: 14 } };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации типов задач:', expect.any(Error));
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
      expect(info.name).toBe('task-types');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0);
      expect(info.lastModified).toBeDefined();
    });
  });
});
