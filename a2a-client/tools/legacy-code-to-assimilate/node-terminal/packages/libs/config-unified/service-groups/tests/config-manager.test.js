import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Импортируем сам класс, чтобы можно было подменить пути к файлам конфига
import { ServiceGroupsManager } from '../config-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-service-groups-config.json');

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

describe('ServiceGroupsManager', () => {
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
      groups: [
        {
          id: 'auth-group',
          name: 'Authentication Services',
          description: 'Services related to user authentication and authorization.',
          services: ['auth-service', 'token-manager'],
          enabled: true,
          autoStart: true,
        },
        {
          id: 'data-group',
          name: 'Data Management Services',
          description: 'Services for database interaction and data processing.',
          services: ['database-service', 'cache-service'],
          enabled: false,
          autoStart: false,
        },
      ],
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test Service Groups Configuration',
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
    manager = new ServiceGroupsManager();
    manager.configPath = TEST_CONFIG_PATH;
    manager.clearCache(); // Убеждаемся, что кэш чист для каждого теста
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError; // Восстанавливаем оригинальный console.error
    console.warn.mockRestore(); // Восстанавливаем оригинальный console.warn
  });

  it('должен корректно инициализироваться', () => {
    expect(manager).toBeInstanceOf(ServiceGroupsManager);
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации групп сервисов:', expect.any(Error));
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
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию групп сервисов, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию групп сервисов, используется по умолчанию');
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, groups: [] };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, groups: [{ id: 'new-group' }] };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, groups: [{ id: 'error-group' }] };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации групп сервисов:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.groups).toEqual([]);
      expect(defaultConfig.metadata).toBeDefined();
    });
  });

  describe('getAllGroups', () => {
    it('должен возвращать все группы', async () => {
      const groups = await manager.getAllGroups();
      expect(groups).toEqual(mockConfigContent.groups);
    });
  });

  describe('getGroupById', () => {
    it('должен возвращать группу по ID', async () => {
      const group = await manager.getGroupById('auth-group');
      expect(group).toEqual(mockConfigContent.groups[0]);
    });

    it('должен возвращать undefined для несуществующей группы', async () => {
      const group = await manager.getGroupById('non-existent-group');
      expect(group).toBeUndefined();
    });
  });

  describe('getServicesInGroup', () => {
    it('должен возвращать список сервисов в группе', async () => {
      const services = await manager.getServicesInGroup('auth-group');
      expect(services).toEqual(['auth-service', 'token-manager']);
    });

    it('должен возвращать пустой массив для несуществующей группы', async () => {
      const services = await manager.getServicesInGroup('non-existent-group');
      expect(services).toEqual([]);
    });
  });

  describe('isGroupEnabled', () => {
    it('должен возвращать true для включенной группы', async () => {
      const isEnabled = await manager.isGroupEnabled('auth-group');
      expect(isEnabled).toBe(true);
    });

    it('должен возвращать false для выключенной группы', async () => {
      const isEnabled = await manager.isGroupEnabled('data-group');
      expect(isEnabled).toBe(false);
    });

    it('должен возвращать false для несуществующей группы', async () => {
      const isEnabled = await manager.isGroupEnabled('non-existent-group');
      expect(isEnabled).toBe(false);
    });
  });

  describe('doesGroupAutoStart', () => {
    it('должен возвращать true для группы с автозапуском', async () => {
      const autoStart = await manager.doesGroupAutoStart('auth-group');
      expect(autoStart).toBe(true);
    });

    it('должен возвращать false для группы без автозапуска', async () => {
      const autoStart = await manager.doesGroupAutoStart('data-group');
      expect(autoStart).toBe(false);
    });

    it('должен возвращать false для несуществующей группы', async () => {
      const autoStart = await manager.doesGroupAutoStart('non-existent-group');
      expect(autoStart).toBe(false);
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, groups: [{ id: 'new-watched-group' }] };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch(); // Удаляем наблюдателя

      await manager.saveConfig({ ...mockConfigContent, groups: [{ id: 'another-group' }] });
      expect(watcher).toHaveBeenCalledTimes(1); // Не должен вызываться снова
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, groups: [{ id: 'error-watcher-group' }] };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации групп сервисов:', expect.any(Error));
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
      expect(info.name).toBe('service-groups');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0); // Наблюдатели еще не добавлены
      expect(info.lastModified).toBeDefined();
    });
  });
});
