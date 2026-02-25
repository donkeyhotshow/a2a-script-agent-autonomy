import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Импортируем сам класс, чтобы можно было подменить пути к файлам конфига
import { ServicesConfigManager } from '../config-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-services-config.json');

// Мокаем fs/promises, чтобы контролировать чтение файлов
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

describe('ServicesConfigManager', () => {
  let manager;
  let mockConfigContent;
  let mockStatResult;
  let originalConsoleError; // Для захвата console.error
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(async () => {
    // Мокаем console.error и console.warn перед каждым тестом
    originalConsoleError = console.error;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockConfigContent = {
      global: {
        maxInstances: 10,
        logLevel: 'info',
      },
      services: {
        'auth-service': {
          port: 3001,
          protocol: 'http',
          enabled: true,
          dependencies: [],
        },
        'user-service': {
          port: 3002,
          protocol: 'http',
          enabled: false,
          dependencies: ['auth-service'],
        },
      },
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test Services Configuration',
      },
    };

    mockStatResult = {
      mtime: {
        getTime: () => Date.now(),
      },
    };

    // Устанавливаем моки для fs
    fs.readFile.mockResolvedValue(JSON.stringify(mockConfigContent));
    fs.writeFile.mockResolvedValue(undefined);
    fs.stat.mockResolvedValue(mockStatResult);

    // Создаем новый менеджер с подмененным путем
    manager = new ServicesConfigManager();
    manager.configPath = TEST_CONFIG_PATH;
    manager.clearCache(); // Убеждаемся, что кэш чист для каждого теста
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError; // Восстанавливаем оригинальный console.error
    console.warn.mockRestore(); // Восстанавливаем оригинальный console.warn
  });

  it('должен корректно инициализироваться', () => {
    expect(manager).toBeInstanceOf(ServicesConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации сервисов:', expect.any(Error));
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
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию сервисов, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию сервисов, используется по умолчанию');
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, global: { maxInstances: 5 } };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, global: { maxInstances: 6 } };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, global: { maxInstances: 7 } };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации сервисов:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.global).toEqual({});
      expect(defaultConfig.services).toEqual({});
      expect(defaultConfig.metadata).toBeDefined();
    });
  });

  describe('getGlobalConfig', () => {
    it('должен возвращать глобальную конфигурацию', async () => {
      const globalConfig = await manager.getGlobalConfig();
      expect(globalConfig).toEqual(mockConfigContent.global);
    });
  });

  describe('getService', () => {
    it('должен возвращать конфигурацию сервиса по ID', async () => {
      const authService = await manager.getService('auth-service');
      expect(authService).toEqual(mockConfigContent.services['auth-service']);
    });

    it('должен возвращать undefined для несуществующего сервиса', async () => {
      const nonExistentService = await manager.getService('non-existent-service');
      expect(nonExistentService).toBeUndefined();
    });
  });

  describe('getAllServices', () => {
    it('должен возвращать все сервисы', async () => {
      const allServices = await manager.getAllServices();
      expect(allServices).toEqual(mockConfigContent.services);
    });
  });

  describe('addService', () => {
    it('должен добавлять новый сервис', async () => {
      const newServiceConfig = {
        port: 3003,
        protocol: 'https',
        enabled: true,
        dependencies: [],
      };
      await manager.addService('new-service', newServiceConfig);
      const config = await manager.getConfig(true);
      expect(config.services['new-service']).toEqual(newServiceConfig);
    });

    it('должен выбрасывать ошибку, если сервис с ID уже существует', async () => {
      const duplicateServiceConfig = { port: 3004 };
      await expect(manager.addService('auth-service', duplicateServiceConfig)).rejects.toThrow('Сервис с ID auth-service уже существует');
    });
  });

  describe('updateService', () => {
    it('должен обновлять существующий сервис', async () => {
      const updates = { enabled: false };
      await manager.updateService('auth-service', updates);
      const updatedService = await manager.getService('auth-service');
      expect(updatedService.enabled).toBe(false);
      // Остальные поля должны остаться без изменений
      expect(updatedService.port).toBe(3001);
    });

    it('должен выбрасывать ошибку, если сервис не найден', async () => {
      const updates = { enabled: true };
      await expect(manager.updateService('non-existent-service', updates)).rejects.toThrow('Сервис с ID non-existent-service не найден');
    });
  });

  describe('deleteService', () => {
    it('должен удалять существующий сервис', async () => {
      await manager.deleteService('auth-service');
      const config = await manager.getConfig(true);
      expect(config.services['auth-service']).toBeUndefined();
    });

    it('должен выбрасывать ошибку, если сервис не найден', async () => {
      await expect(manager.deleteService('non-existent-service')).rejects.toThrow('Сервис с ID non-existent-service не найден');
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, global: { logLevel: 'debug' } };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch(); // Удаляем наблюдателя

      await manager.saveConfig({ ...mockConfigContent, global: { logLevel: 'trace' } });
      expect(watcher).toHaveBeenCalledTimes(1); // Не должен вызываться снова
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, global: { logLevel: 'fatal' } };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации сервисов:', expect.any(Error));
    });
  });

  describe('clearCache', () => {
    it('должен очищать кэш', async () => {
      await manager.getConfig(); // Заполняем кэш
      expect(manager.cache).toBeDefined();
      expect(manager.lastModified).toBeDefined();

      manager.clearCache();
      expect(manager.cache).toBeNull();
      expect(manager.lastModified).toBeNull();
    });
  });

  describe('getInfo', () => {
    it('должен возвращать информацию о менеджере', async () => {
      await manager.getConfig(); // Заполняем кэш для hasCache и lastModified
      const info = manager.getInfo();
      expect(info.name).toBe('services');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0); // Наблюдатели еще не добавлены
      expect(info.lastModified).toBeDefined();
    });
  });
});
