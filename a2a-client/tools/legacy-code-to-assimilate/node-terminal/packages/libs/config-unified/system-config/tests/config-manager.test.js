import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

import { SystemConfigManager } from '../config-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-config.json');
const TEST_SCHEMA_PATH = path.join(__dirname, '../schema.json');

// Mock fs/promises and fs for isolated testing
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

describe('SystemConfigManager', () => {
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
      serviceManager: {
        retryDelaysMs: [100, 200, 300],
        restartBackoffMs: [1000, 2000, 3000],
        commandMaxRetries: 2,
        commandRetryDelayMs: 500
      },
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test System Configuration'
      }
    };

    // Using the schema from the parent directory
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

    manager = new SystemConfigManager();
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
    expect(manager).toBeInstanceOf(SystemConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(manager.schemaPath).toBe(TEST_SCHEMA_PATH);
    expect(manager.validateConfig).toBeDefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('должен выводить ошибку, если схема не загружена или не скомпилирована', () => {
    vi.clearAllMocks();
    readFileSync.mockImplementation(() => { throw new Error('Schema file not found'); });

    const brokenManager = new SystemConfigManager();
    expect(brokenManager.validateConfig).toBeDefined(); // Still exists, but won't validate
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load or compile schema for system config: Schema file not found'));
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения системной конфигурации:', expect.any(Error));
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
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить системную конфигурацию, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить системную конфигурацию, используется по умолчанию');
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена', async () => {
      const invalidConfig = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: [50] } }; // Меньше minimum
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig); // Возвращаем невалидную, но загруженную конфигурацию
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("System Configuration failed validation:"), expect.any(Array));
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: [600, 700, 800] } };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: [700, 800, 900] } };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: [800, 900, 1000] } };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения системной конфигурации:', expect.any(Error));
    });

    it('должен выбрасывать ошибку, если сохраняется невалидная конфигурация', async () => {
      const invalidConfig = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: [50] } };
      await expect(manager.saveConfig(invalidConfig)).rejects.toThrow('Attempted to save an invalid system configuration.');
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.serviceManager).toBeDefined();
      expect(defaultConfig.serviceManager.retryDelaysMs).toBeDefined();
      expect(defaultConfig.metadata).toBeDefined();
    });
  });

  describe('getServiceManagerConfig', () => {
    it('должен возвращать конфигурацию serviceManager', async () => {
      const smConfig = await manager.getServiceManagerConfig();
      expect(smConfig).toEqual(mockConfigContent.serviceManager);
    });

    it('должен возвращать пустой объект, если serviceManager отсутствует', async () => {
      fs.readFile.mockResolvedValueOnce(JSON.stringify({ metadata: { created: "", version: "", description: "" } }));
      manager.clearCache();
      const smConfig = await manager.getServiceManagerConfig();
      expect(smConfig).toEqual({});
    });
  });

  describe('getRetryDelays', () => {
    it('должен возвращать задержки повторных попыток', async () => {
      const delays = await manager.getRetryDelays();
      expect(delays).toEqual(mockConfigContent.serviceManager.retryDelaysMs);
    });

    it('должен возвращать пустой массив, если retryDelaysMs отсутствует', async () => {
      const configWithoutRetryDelays = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: undefined } };
      fs.readFile.mockResolvedValueOnce(JSON.stringify(configWithoutRetryDelays));
      manager.clearCache();
      const delays = await manager.getRetryDelays();
      expect(delays).toEqual([]);
    });
  });

  describe('getRestartBackoff', () => {
    it('должен возвращать задержки для перезапуска', async () => {
      const backoff = await manager.getRestartBackoff();
      expect(backoff).toEqual(mockConfigContent.serviceManager.restartBackoffMs);
    });

    it('должен возвращать пустой массив, если restartBackoffMs отсутствует', async () => {
      const configWithoutRestartBackoff = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, restartBackoffMs: undefined } };
      fs.readFile.mockResolvedValueOnce(JSON.stringify(configWithoutRestartBackoff));
      manager.clearCache();
      const backoff = await manager.getRestartBackoff();
      expect(backoff).toEqual([]);
    });
  });

  describe('getCommandMaxRetries', () => {
    it('должен возвращать максимальное количество повторных попыток команды', async () => {
      const maxRetries = await manager.getCommandMaxRetries();
      expect(maxRetries).toBe(mockConfigContent.serviceManager.commandMaxRetries);
    });
  });

  describe('getCommandRetryDelayMs', () => {
    it('должен возвращать задержку повторной попытки команды', async () => {
      const retryDelay = await manager.getCommandRetryDelayMs();
      expect(retryDelay).toBe(mockConfigContent.serviceManager.commandRetryDelayMs);
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: [900, 1000, 1100] } };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch();

      await manager.saveConfig({ ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: [1000, 1100, 1200] } });
      expect(watcher).toHaveBeenCalledTimes(1);
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, serviceManager: { ...mockConfigContent.serviceManager, retryDelaysMs: [1100, 1200, 1300] } };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе системной конфигурации:', expect.any(Error));
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
      expect(info.name).toBe('system-config');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0);
      expect(info.lastModified).toBeDefined();
    });
  });
});
