import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Импортируем сам класс, чтобы можно было подменить пути к файлам конфига и схемы
import { ProjectTypesConfigManager } from '../config-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-project-types-config.json');
const TEST_SCHEMA_PATH = path.join(__dirname, 'test-project-types-schema.json');

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

describe('ProjectTypesConfigManager', () => {
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
      node: {
        name: 'Node.js Project',
        detection: {
          files: ['package.json'],
          dependencies: ['express'],
        },
        config: {
          port: 3000,
          startCommand: 'npm start',
          startScriptPatterns: ['start', 'dev'],
        },
      },
      vue: {
        name: 'Vue.js Project',
        detection: {
          files: ['package.json'],
          dependencies: ['vue'],
        },
        config: {
          port: 8080,
          startCommand: 'npm run dev',
          startScriptPatterns: ['dev', 'serve'],
        },
      },
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test Project Types Configuration',
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
    // Мокаем readFileSync только для ProjectTypesConfigManager, чтобы он читал нашу тестовую схему
    readFileSync.mockImplementation((filePath, encoding) => {
        if (filePath === TEST_SCHEMA_PATH) {
            return JSON.stringify(mockSchemaContent);
        }
        // Для других файлов используем оригинальную реализацию или заглушку
        return '{}';
    });

    // Создаем новый менеджер с подмененными путями
    manager = new ProjectTypesConfigManager();
    manager.configPath = TEST_CONFIG_PATH;
    manager.schemaPath = TEST_SCHEMA_PATH;
    manager.clearCache(); // Убеждаемся, что кэш чист для каждого теста
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError; // Восстанавливаем оригинальный console.error
  });

  it('должен корректно инициализироваться', () => {
    expect(manager).toBeInstanceOf(ProjectTypesConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(manager.schemaPath).toBe(TEST_SCHEMA_PATH);
    expect(manager.validate).toBeDefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled(); // Схема должна загрузиться без ошибок
  });

  it('должен выводить ошибку, если схема не загружена или не скомпилирована', () => {
    vi.clearAllMocks();
    readFileSync.mockImplementation(() => { throw new Error('Schema file not found'); });

    const brokenManager = new ProjectTypesConfigManager();
    expect(brokenManager.validate).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load or compile schema for project types config: Schema file not found'));
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации типов проектов:', expect.any(Error));
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
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена', async () => {
      const invalidConfig = { ...mockConfigContent, node: { ...mockConfigContent.node, name: 123 } }; // Неверный тип
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig); // Возвращаем невалидную, но загруженную конфигурацию
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Project types config validation errors: data/node/name must be string"));
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, node: { ...mockConfigContent.node, port: 4000 } };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, node: { ...mockConfigContent.node, port: 4001 } };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, node: { ...mockConfigContent.node, port: 4002 } };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации типов проектов:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.node).toBeDefined();
      expect(defaultConfig.node.config.port).toBe(3000);
    });
  });

  describe('getAllProjectTypes', () => {
    it('должен возвращать все типы проектов', async () => {
      const projectTypes = await manager.getAllProjectTypes();
      expect(projectTypes).toEqual(mockConfigContent);
    });
  });

  describe('getProjectType', () => {
    it('должен возвращать тип проекта по ID', async () => {
      const nodeType = await manager.getProjectType('node');
      expect(nodeType).toEqual(mockConfigContent.node);
    });

    it('должен возвращать undefined для несуществующего типа проекта', async () => {
      const nonExistentType = await manager.getProjectType('nonExistent');
      expect(nonExistentType).toBeUndefined();
    });
  });

  describe('getProjectDetectionFiles', () => {
    it('должен возвращать файлы обнаружения проекта по ID', async () => {
      const files = await manager.getProjectDetectionFiles('node');
      expect(files).toEqual(['package.json']);
    });

    it('должен возвращать пустой массив для несуществующего типа проекта', async () => {
      const files = await manager.getProjectDetectionFiles('nonExistent');
      expect(files).toEqual([]);
    });
  });

  describe('getProjectDetectionDependencies', () => {
    it('должен возвращать зависимости обнаружения проекта по ID', async () => {
      const dependencies = await manager.getProjectDetectionDependencies('node');
      expect(dependencies).toEqual(['express']);
    });

    it('должен возвращать пустой массив для несуществующего типа проекта', async () => {
      const dependencies = await manager.getProjectDetectionDependencies('nonExistent');
      expect(dependencies).toEqual([]);
    });
  });

  describe('getProjectConfigPort', () => {
    it('должен возвращать порт конфигурации проекта по ID', async () => {
      const port = await manager.getProjectConfigPort('node');
      expect(port).toBe(3000);
    });

    it('должен возвращать undefined для несуществующего типа проекта', async () => {
      const port = await manager.getProjectConfigPort('nonExistent');
      expect(port).toBeUndefined();
    });
  });

  describe('getProjectConfigStartCommand', () => {
    it('должен возвращать команду запуска конфигурации проекта по ID', async () => {
      const command = await manager.getProjectConfigStartCommand('node');
      expect(command).toBe('npm start');
    });

    it('должен возвращать undefined для несуществующего типа проекта', async () => {
      const command = await manager.getProjectConfigStartCommand('nonExistent');
      expect(command).toBeUndefined();
    });
  });

  describe('getProjectConfigStartScriptPatterns', () => {
    it('должен возвращать шаблоны скриптов запуска конфигурации проекта по ID', async () => {
      const patterns = await manager.getProjectConfigStartScriptPatterns('node');
      expect(patterns).toEqual(['start', 'dev']);
    });

    it('должен возвращать пустой массив для несуществующего типа проекта', async () => {
      const patterns = await manager.getProjectConfigStartScriptPatterns('nonExistent');
      expect(patterns).toEqual([]);
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newConfig = { ...mockConfigContent, node: { ...mockConfigContent.node, config: { ...mockConfigContent.node.config, port: 5000 } } };
      await manager.saveConfig(newConfig);

      expect(watcher).toHaveBeenCalledWith(newConfig);
      unwatch(); // Удаляем наблюдателя

      await manager.saveConfig({ ...mockConfigContent, node: { ...mockConfigContent.node, config: { ...mockConfigContent.node.config, port: 5001 } } });
      expect(watcher).toHaveBeenCalledTimes(1); // Не должен вызываться снова
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newConfig = { ...mockConfigContent, node: { ...mockConfigContent.node, config: { ...mockConfigContent.node.config, port: 5002 } } };
      await manager.saveConfig(newConfig);

      expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
      expect(workingWatcher).toHaveBeenCalledWith(newConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации типов проектов:', expect.any(Error));
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
      expect(info.name).toBe('project-types');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0); // Наблюдатели еще не добавлены
      expect(info.lastModified).toBeDefined();
    });
  });
});
