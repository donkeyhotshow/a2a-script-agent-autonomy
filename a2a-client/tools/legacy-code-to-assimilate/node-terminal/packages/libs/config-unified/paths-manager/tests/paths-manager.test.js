import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Импортируем сам класс, чтобы можно было подменить пути к файлам конфига и схемы
import { PathsConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-paths-config.json');
const TEST_SCHEMA_PATH = path.join(__dirname, 'test-paths-schema.json');

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

describe('PathsConfigManager', () => {
  let manager;
  let mockConfigContent;
  let mockSchemaContent;
  let mockStatResult;
  let originalConsoleError; // Для захвата console.error
  let consoleErrorSpy;

  beforeEach(async () => {
    // Мокаем console.error перед каждым тестом
    originalConsoleError = console.error;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockConfigContent = {
      basePath: '/test/app',
      logBaseDir: '/test/app/logs',
      reportsBaseDir: '/test/app/reports',
      systemRun: {
        cli: '/test/app/system-run/cli',
        projectsManager: '/test/app/root/projects-manager',
      },
      testCoverageAnalysis: {
        logFile: '/test/app/logs/test-coverage-analysis.log',
      },
      testCategories: [
        { name: 'core', patterns: ['libs/core/'] },
        { name: 'api', patterns: ['libs/api/'] },
      ],
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test Paths Configuration',
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
    // Мокаем readFileSync только для PathsConfigManager, чтобы он читал нашу тестовую схему
    readFileSync.mockImplementation((filePath, encoding) => {
        if (filePath === TEST_SCHEMA_PATH) {
            return JSON.stringify(mockSchemaContent);
        }
        // Для других файлов используем оригинальную реализацию или заглушку
        return '{}';
    });

    // Создаем новый менеджер с подмененными путями
    manager = new PathsConfigManager();
    manager.configPath = TEST_CONFIG_PATH;
    manager.schemaPath = TEST_SCHEMA_PATH;
    manager.clearCache(); // Убеждаемся, что кэш чист для каждого теста
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError; // Восстанавливаем оригинальный console.error
  });

  it('должен корректно инициализироваться', () => {
    expect(manager).toBeInstanceOf(PathsConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(manager.schemaPath).toBe(TEST_SCHEMA_PATH);
    expect(manager.validate).toBeDefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled(); // Схема должна загрузиться без ошибок
  });

  it('должен выводить ошибку, если схема не загружена или не скомпилирована', () => {
    vi.clearAllMocks();
    readFileSync.mockImplementation(() => { throw new Error('Schema file not found'); });

    const brokenManager = new PathsConfigManager();
    expect(brokenManager.validate).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load or compile schema for paths config: Schema file not found'));
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации путей:', expect.any(Error));
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
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Ошибка должна быть предупреждением
      // console.warn('Не удалось загрузить конфигурацию путей, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Ошибка должна быть предупреждением
      // console.warn('Не удалось загрузить конфигурацию путей, используется по умолчанию');
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена', async () => {
      const invalidConfig = { ...mockConfigContent, basePath: 123 }; // Неверный тип
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig); // Возвращаем невалидную, но загруженную конфигурацию
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Paths Configuration failed validation: data/basePath must be string'));
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена для вложенных объектов', async () => {
      const invalidConfig = { ...mockConfigContent, systemRun: { invalidKey: 'value' } }; // additionalProperties: false
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig); // Возвращаем невалидную, но загруженную конфигурацию
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Paths Configuration failed validation: data/systemRun must NOT have additional properties'));
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена для массива', async () => {
      const invalidConfig = { ...mockConfigContent, testCategories: [{ name: 'test' }] }; // missing patterns
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig); // Возвращаем невалидную, но загруженную конфигурацию
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Paths Configuration failed validation: data/testCategories/0 must have required property \'patterns\''));
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, basePath: '/new/path' };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, basePath: '/watcher/path' };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, basePath: '/error/path' };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации путей:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.basePath).toBe('/app');
      expect(defaultConfig.testCategories).toEqual([]);
    });
  });

  describe('getBasePath', () => {
    it('должен возвращать базовый путь', async () => {
      const basePath = await manager.getBasePath();
      expect(basePath).toBe(mockConfigContent.basePath);
    });
  });

  describe('getLogBaseDir', () => {
    it('должен возвращать базовую директорию для логов', async () => {
      const logBaseDir = await manager.getLogBaseDir();
      expect(logBaseDir).toBe(mockConfigContent.logBaseDir);
    });
  });

  describe('getReportsBaseDir', () => {
    it('должен возвращать базовую директорию для отчетов', async () => {
      const reportsBaseDir = await manager.getReportsBaseDir();
      expect(reportsBaseDir).toBe(mockConfigContent.reportsBaseDir);
    });
  });

  describe('getSystemRunPaths', () => {
    it('должен возвращать пути systemRun', async () => {
      const systemRunPaths = await manager.getSystemRunPaths();
      expect(systemRunPaths).toEqual(mockConfigContent.systemRun);
    });
  });

  describe('getSystemRunPath', () => {
    it('должен возвращать конкретный путь systemRun', async () => {
      const cliPath = await manager.getSystemRunPath('cli');
      expect(cliPath).toBe(mockConfigContent.systemRun.cli);
    });

    it('должен возвращать undefined для несуществующего ключа systemRun', async () => {
      const nonExistentPath = await manager.getSystemRunPath('nonExistent');
      expect(nonExistentPath).toBeUndefined();
    });
  });

  describe('getTestCoverageAnalysisConfig', () => {
    it('должен возвращать конфигурацию анализа покрытия тестов', async () => {
      const testCoverageAnalysisConfig = await manager.getTestCoverageAnalysisConfig();
      expect(testCoverageAnalysisConfig).toEqual(mockConfigContent.testCoverageAnalysis);
    });
  });

  describe('getTestCategories', () => {
    it('должен возвращать категории тестов', async () => {
      const testCategories = await manager.getTestCategories();
      expect(testCategories).toEqual(mockConfigContent.testCategories);
    });
  });

  describe('getTestCategory', () => {
    it('должен возвращать конкретную категорию теста по имени', async () => {
      const coreCategory = await manager.getTestCategory('core');
      expect(coreCategory).toEqual({ name: 'core', patterns: ['libs/core/'] });
    });

    it('должен возвращать undefined для несуществующей категории', async () => {
      const nonExistentCategory = await manager.getTestCategory('nonExistent');
      expect(nonExistentCategory).toBeUndefined();
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, basePath: '/new/watched/path' };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch(); // Удаляем наблюдателя

      await manager.saveConfig({ ...mockConfigContent, basePath: '/another/path' });
      expect(watcher).toHaveBeenCalledTimes(1); // Не должен вызываться снова
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, basePath: '/error/watcher/path' };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации путей:', expect.any(Error));
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
      expect(info.name).toBe('paths-manager');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0); // Наблюдатели еще не добавлены
      expect(info.lastModified).toBeDefined();
    });
  });
});
