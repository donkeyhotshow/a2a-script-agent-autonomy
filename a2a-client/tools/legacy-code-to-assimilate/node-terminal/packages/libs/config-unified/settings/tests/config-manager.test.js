import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Импортируем сам класс, чтобы можно было подменить пути к файлам конфига и схемы
import { SettingsConfigManager } from '../config-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-settings-config.json');
const TEST_SCHEMA_PATH = path.join(__dirname, 'test-settings-schema.json');

// Мокаем fs/promises и readFileSync, чтобы контролировать чтение файлов
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
    readFileSync: vi.fn(), // Мокаем readFileSync для контроля загрузки схемы
  };
});

describe('SettingsConfigManager', () => {
  let manager;
  let mockConfigContent;
  let mockSchemaContent;
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
      connection: {
        serverUrl: 'http://localhost:3000',
        websocketUrl: 'ws://localhost:3000',
        timeout: 5000,
        retries: 3,
      },
      performance: {
        autoRefresh: true,
        refreshInterval: 5000,
        realTimeMonitoring: true,
        maxMemoryRecords: 1000,
        dataCompression: true,
      },
      security: {
        requireAuth: true,
        apiKey: 'test-api-key',
        useHttps: true,
        verifySsl: true,
        sessionTimeout: 3600,
      },
      logging: {
        level: 'debug',
        retentionDays: 30,
      },
      interface: {
        theme: 'dark',
        language: 'en-US',
        dateFormat: 'YYYY-MM-DD',
        dashboardWidgets: ['cpu', 'memory', 'network'],
      },
      notifications: {
        enabled: true,
        systemNotifications: true,
        errorNotifications: true,
        completionNotifications: true,
        soundNotifications: true,
        soundVolume: 0.8,
      },
      systemInfo: {
        appVersion: '1.0.0',
        os: 'Linux',
        arch: 'x64',
        memory: '16GB',
        freeSpace: '1TB',
        uptime: '1h',
      },
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test Settings Configuration',
      },
    };

    mockSchemaContent = JSON.parse(readFileSync(TEST_SCHEMA_PATH, 'utf8'));

    mockStatResult = {
      mtime: {
        getTime: () => Date.now(),
      },
    };

    // Устанавливаем моки для fs
    fs.readFile.mockResolvedValue(JSON.stringify(mockConfigContent));
    fs.writeFile.mockResolvedValue(undefined);
    fs.stat.mockResolvedValue(mockStatResult);
    // Мокаем readFileSync только для SettingsConfigManager, чтобы он читал нашу тестовую схему
    readFileSync.mockImplementation((filePath, encoding) => {
        if (filePath === TEST_SCHEMA_PATH) {
            return JSON.stringify(mockSchemaContent);
        }
        // Для других файлов используем оригинальную реализацию или заглушку
        return '{}';
    });

    // Создаем новый менеджер с подмененными путями
    manager = new SettingsConfigManager();
    manager.configPath = TEST_CONFIG_PATH;
    manager.schemaPath = TEST_SCHEMA_PATH;
    manager.clearCache(); // Убеждаемся, что кэш чист для каждого теста
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError; // Восстанавливаем оригинальный console.error
    console.warn.mockRestore(); // Восстанавливаем оригинальный console.warn
  });

  it('должен корректно инициализироваться', () => {
    expect(manager).toBeInstanceOf(SettingsConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(manager.schemaPath).toBe(TEST_SCHEMA_PATH);
    expect(manager.validate).toBeDefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled(); // Схема должна загрузиться без ошибок
  });

  it('должен выводить ошибку, если схема не загружена или не скомпилирована', () => {
    vi.clearAllMocks();
    readFileSync.mockImplementation(() => { throw new Error('Schema file not found'); });

    const brokenManager = new SettingsConfigManager();
    expect(brokenManager.validate).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load or compile schema for project types config: Schema file not found')); // Ошибка была здесь в исходном коде
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации настроек:', expect.any(Error));
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
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию настроек, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию настроек, используется по умолчанию');
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена', async () => {
      const invalidConfig = { ...mockConfigContent, connection: { ...mockConfigContent.connection, timeout: 500 } }; // Меньше minimum
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig); // Возвращаем невалидную, но загруженную конфигурацию
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Settings config validation errors: [ { instancePath: '/connection/timeout', schemaPath: '#/properties/connection/properties/timeout/minimum', keyword: 'minimum', params: { comparison: '>=', limit: 1000 }, message: 'must be >= 1000' } ]"));
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, connection: { ...mockConfigContent.connection, timeout: 6000 } };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, connection: { ...mockConfigContent.connection, timeout: 7000 } };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, connection: { ...mockConfigContent.connection, timeout: 8000 } };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации настроек:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.connection).toEqual({});
      expect(defaultConfig.metadata).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('должен валидировать корректную конфигурацию', () => {
      const isValid = manager.validateConfig(mockConfigContent);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('должен выводить ошибки для невалидной конфигурации', () => {
      const invalidConfig = { ...mockConfigContent, connection: { ...mockConfigContent.connection, timeout: 500 } };
      manager.validateConfig(invalidConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Settings config validation errors:"), expect.any(Array));
    });
  });

  describe('getConnectionServerUrl', () => {
    it('должен возвращать URL сервера подключения', async () => {
      const url = await manager.getConnectionServerUrl();
      expect(url).toBe(mockConfigContent.connection.serverUrl);
    });
  });

  describe('getConnectionWebsocketUrl', () => {
    it('должен возвращать URL вебсокет подключения', async () => {
      const url = await manager.getConnectionWebsocketUrl();
      expect(url).toBe(mockConfigContent.connection.websocketUrl);
    });
  });

  describe('getConnectionTimeout', () => {
    it('должен возвращать таймаут подключения', async () => {
      const timeout = await manager.getConnectionTimeout();
      expect(timeout).toBe(mockConfigContent.connection.timeout);
    });
  });

  describe('getConnectionRetries', () => {
    it('должен возвращать количество повторных попыток подключения', async () => {
      const retries = await manager.getConnectionRetries();
      expect(retries).toBe(mockConfigContent.connection.retries);
    });
  });

  describe('getPerformanceAutoRefresh', () => {
    it('должен возвращать статус автообновления производительности', async () => {
      const autoRefresh = await manager.getPerformanceAutoRefresh();
      expect(autoRefresh).toBe(mockConfigContent.performance.autoRefresh);
    });
  });

  describe('getPerformanceRefreshInterval', () => {
    it('должен возвращать интервал обновления производительности', async () => {
      const interval = await manager.getPerformanceRefreshInterval();
      expect(interval).toBe(mockConfigContent.performance.refreshInterval);
    });
  });

  describe('getPerformanceRealTimeMonitoring', () => {
    it('должен возвращать статус мониторинга в реальном времени', async () => {
      const monitoring = await manager.getPerformanceRealTimeMonitoring();
      expect(monitoring).toBe(mockConfigContent.performance.realTimeMonitoring);
    });
  });

  describe('getPerformanceMaxMemoryRecords', () => {
    it('должен возвращать максимальное количество записей памяти', async () => {
      const maxRecords = await manager.getPerformanceMaxMemoryRecords();
      expect(maxRecords).toBe(mockConfigContent.performance.maxMemoryRecords);
    });
  });

  describe('getPerformanceDataCompression', () => {
    it('должен возвращать статус сжатия данных', async () => {
      const compression = await manager.getPerformanceDataCompression();
      expect(compression).toBe(mockConfigContent.performance.dataCompression);
    });
  });

  describe('getSecurityRequireAuth', () => {
    it('должен возвращать статус необходимости аутентификации', async () => {
      const requireAuth = await manager.getSecurityRequireAuth();
      expect(requireAuth).toBe(mockConfigContent.security.requireAuth);
    });
  });

  describe('getSecurityApiKey', () => {
    it('должен возвращать ключ API безопасности', async () => {
      const apiKey = await manager.getSecurityApiKey();
      expect(apiKey).toBe(mockConfigContent.security.apiKey);
    });
  });

  describe('getSecurityUseHttps', () => {
    it('должен возвращать статус использования HTTPS', async () => {
      const useHttps = await manager.getSecurityUseHttps();
      expect(useHttps).toBe(mockConfigContent.security.useHttps);
    });
  });

  describe('getSecurityVerifySsl', () => {
    it('должен возвращать статус проверки SSL', async () => {
      const verifySsl = await manager.getSecurityVerifySsl();
      expect(verifySsl).toBe(mockConfigContent.security.verifySsl);
    });
  });

  describe('getSecuritySessionTimeout', () => {
    it('должен возвращать таймаут сессии безопасности', async () => {
      const sessionTimeout = await manager.getSecuritySessionTimeout();
      expect(sessionTimeout).toBe(mockConfigContent.security.sessionTimeout);
    });
  });

  describe('getLoggingLevel', () => {
    it('должен возвращать уровень логирования', async () => {
      const level = await manager.getLoggingLevel();
      expect(level).toBe(mockConfigContent.logging.level);
    });
  });

  describe('getLoggingRetentionDays', () => {
    it('должен возвращать количество дней хранения логов', async () => {
      const retentionDays = await manager.getLoggingRetentionDays();
      expect(retentionDays).toBe(mockConfigContent.logging.retentionDays);
    });
  });

  describe('getInterfaceTheme', () => {
    it('должен возвращать тему интерфейса', async () => {
      const theme = await manager.getInterfaceTheme();
      expect(theme).toBe(mockConfigContent.interface.theme);
    });
  });

  describe('getInterfaceLanguage', () => {
    it('должен возвращать язык интерфейса', async () => {
      const language = await manager.getInterfaceLanguage();
      expect(language).toBe(mockConfigContent.interface.language);
    });
  });

  describe('getInterfaceDateFormat', () => {
    it('должен возвращать формат даты интерфейса', async () => {
      const dateFormat = await manager.getInterfaceDateFormat();
      expect(dateFormat).toBe(mockConfigContent.interface.dateFormat);
    });
  });

  describe('getInterfaceDashboardWidgets', () => {
    it('должен возвращать виджеты панели управления интерфейса', async () => {
      const widgets = await manager.getInterfaceDashboardWidgets();
      expect(widgets).toEqual(mockConfigContent.interface.dashboardWidgets);
    });
  });

  describe('getNotificationsEnabled', () => {
    it('должен возвращать статус включения уведомлений', async () => {
      const enabled = await manager.getNotificationsEnabled();
      expect(enabled).toBe(mockConfigContent.notifications.enabled);
    });
  });

  describe('getNotificationsSystemNotifications', () => {
    it('должен возвращать статус системных уведомлений', async () => {
      const systemNotifications = await manager.getNotificationsSystemNotifications();
      expect(systemNotifications).toBe(mockConfigContent.notifications.systemNotifications);
    });
  });

  describe('getNotificationsErrorNotifications', () => {
    it('должен возвращать статус уведомлений об ошибках', async () => {
      const errorNotifications = await manager.getNotificationsErrorNotifications();
      expect(errorNotifications).toBe(mockConfigContent.notifications.errorNotifications);
    });
  });

  describe('getNotificationsCompletionNotifications', () => {
    it('должен возвращать статус уведомлений о завершении', async () => {
      const completionNotifications = await manager.getNotificationsCompletionNotifications();
      expect(completionNotifications).toBe(mockConfigContent.notifications.completionNotifications);
    });
  });

  describe('getNotificationsSoundNotifications', () => {
    it('должен возвращать статус звуковых уведомлений', async () => {
      const soundNotifications = await manager.getNotificationsSoundNotifications();
      expect(soundNotifications).toBe(mockConfigContent.notifications.soundNotifications);
    });
  });

  describe('getNotificationsSoundVolume', () => {
    it('должен возвращать громкость звуковых уведомлений', async () => {
      const soundVolume = await manager.getNotificationsSoundVolume();
      expect(soundVolume).toBe(mockConfigContent.notifications.soundVolume);
    });
  });

  describe('getSystemInfoAppVersion', () => {
    it('должен возвращать версию приложения', async () => {
      const appVersion = await manager.getSystemInfoAppVersion();
      expect(appVersion).toBe(mockConfigContent.systemInfo.appVersion);
    });
  });

  describe('getSystemInfoOs', () => {
    it('должен возвращать операционную систему', async () => {
      const os = await manager.getSystemInfoOs();
      expect(os).toBe(mockConfigContent.systemInfo.os);
    });
  });

  describe('getSystemInfoArch', () => {
    it('должен возвращать архитектуру системы', async () => {
      const arch = await manager.getSystemInfoArch();
      expect(arch).toBe(mockConfigContent.systemInfo.arch);
    });
  });

  describe('getSystemInfoMemory', () => {
    it('должен возвращать объем памяти', async () => {
      const memory = await manager.getSystemInfoMemory();
      expect(memory).toBe(mockConfigContent.systemInfo.memory);
    });
  });

  describe('getSystemInfoFreeSpace', () => {
    it('должен возвращать свободное пространство', async () => {
      const freeSpace = await manager.getSystemInfoFreeSpace();
      expect(freeSpace).toBe(mockConfigContent.systemInfo.freeSpace);
    });
  });

  describe('getSystemInfoUptime', () => {
    it('должен возвращать время работы системы', async () => {
      const uptime = await manager.getSystemInfoUptime();
      expect(uptime).toBe(mockConfigContent.systemInfo.uptime);
    });
  });

  describe('getSettingsConfig', () => {
    it('должен возвращать всю конфигурацию настроек', async () => {
      const settingsConfig = await manager.getSettingsConfig();
      expect(settingsConfig).toEqual(mockConfigContent);
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, connection: { ...mockConfigContent.connection, timeout: 9000 } };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch(); // Удаляем наблюдателя

      await manager.saveConfig({ ...mockConfigContent, connection: { ...mockConfigContent.connection, timeout: 9001 } });
      expect(watcher).toHaveBeenCalledTimes(1); // Не должен вызываться снова
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, connection: { ...mockConfigContent.connection, timeout: 9002 } };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации настроек:', expect.any(Error));
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
      expect(info.name).toBe('settings');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0); // Наблюдатели еще не добавлены
      expect(info.lastModified).toBeDefined();
    });
  });
});
