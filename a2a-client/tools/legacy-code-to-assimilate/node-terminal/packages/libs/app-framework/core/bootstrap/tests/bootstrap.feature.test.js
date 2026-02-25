const Bootstrap = require('../index.js');
const path = require('path');
const fs = require('fs');

describe('Bootstrap расширенная функциональность', () => {
  let bootstrap;
  let mockLogger;
  let mockErrorHandler;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockErrorHandler = {
      handleError: jest.fn()
    };

    bootstrap = new Bootstrap({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      config: {
        aliasesPath: './aliases.json',
        modulesPath: './modules',
        autoLoad: true
      }
    });
  });

  describe('Динамическая конфигурация алиасов', () => {
    test('должен загружать алиасы из файла конфигурации, если он доступен', async () => {
      // Создаем временный файл алиасов
      const aliasesConfig = {
        '@core': './libs/core',
        '@ui': './libs/ui',
        '@api': './libs/api',
        '@utils': './libs/utils'
      };

      // Симулируем чтение файла
      const mockReadFile = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(aliasesConfig));
      const mockExists = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      await bootstrap.loadAliases();

      expect(mockExists).toHaveBeenCalledWith('./aliases.json');
      expect(mockReadFile).toHaveBeenCalledWith('./aliases.json', 'utf8');
      expect(mockLogger.info).toHaveBeenCalledWith('Aliases loaded from configuration file', {
        aliases: expect.any(Object),
        count: 4
      });

      mockReadFile.mockRestore();
      mockExists.mockRestore();
    });

    test('должен создавать алиасы по умолчанию, если файл конфигурации отсутствует', async () => {
      const mockExists = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      await bootstrap.loadAliases();

      expect(mockExists).toHaveBeenCalledWith('./aliases.json');
      expect(mockLogger.info).toHaveBeenCalledWith('Using default aliases configuration');
      
      const aliases = bootstrap.getAliases();
      expect(aliases).toBeDefined();
      expect(Object.keys(aliases).length).toBeGreaterThan(0);

      mockExists.mockRestore();
    });

    test('должен поддерживать динамическое добавление новых алиасов', async () => {
      const newAlias = {
        '@newModule': './libs/new-module'
      };

      bootstrap.addAlias('@newModule', './libs/new-module');

      const aliases = bootstrap.getAliases();
      expect(aliases['@newModule']).toBe('./libs/new-module');
      expect(mockLogger.info).toHaveBeenCalledWith('New alias added', {
        alias: '@newModule',
        path: './libs/new-module'
      });
    });
  });

  describe('Автоматическая загрузка модулей', () => {
    test('должен автоматически загружать модули из указанной директории', async () => {
      const mockReaddir = jest.spyOn(fs, 'readdirSync').mockReturnValue([
        'module1.js',
        'module2.js',
        'subdirectory'
      ]);

      const mockStat = jest.spyOn(fs, 'statSync').mockImplementation((path) => ({
        isFile: () => path.endsWith('.js'),
        isDirectory: () => !path.endsWith('.js')
      }));

      await bootstrap.autoLoadModules();

      expect(mockReaddir).toHaveBeenCalledWith('./modules');
      expect(mockLogger.info).toHaveBeenCalledWith('Auto-loading modules from directory', {
        directory: './modules',
        modulesFound: 2
      });

      mockReaddir.mockRestore();
      mockStat.mockRestore();
    });

    test('должен корректно обрабатывать ошибки при загрузке модулей', async () => {
      const mockReaddir = jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await bootstrap.autoLoadModules();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        'ModuleLoadError',
        { directory: './modules' }
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to auto-load modules', {
        directory: './modules',
        error: expect.any(String)
      });

      mockReaddir.mockRestore();
    });

    test('должен поддерживать фильтрацию модулей по расширениям', async () => {
      const mockReaddir = jest.spyOn(fs, 'readdirSync').mockReturnValue([
        'module1.js',
        'module2.ts',
        'module3.mjs',
        'config.json'
      ]);

      const mockStat = jest.spyOn(fs, 'statSync').mockImplementation((path) => ({
        isFile: () => true,
        isDirectory: () => false
      }));

      await bootstrap.autoLoadModules(['.js', '.ts', '.mjs']);

      expect(mockLogger.info).toHaveBeenCalledWith('Auto-loading modules with specific extensions', {
        extensions: ['.js', '.ts', '.mjs'],
        modulesFound: 3
      });

      mockReaddir.mockRestore();
      mockStat.mockRestore();
    });
  });

  describe('Управление зависимостями', () => {
    test('должен проверять совместимость версий модулей', async () => {
      const moduleVersions = {
        '@core': '2.0.0',
        '@ui': '1.5.0',
        '@api': '2.1.0'
      };

      const compatibilityCheck = await bootstrap.checkCompatibility(moduleVersions);

      expect(compatibilityCheck.compatible).toBeDefined();
      expect(compatibilityCheck.incompatibilities).toBeDefined();
      expect(compatibilityCheck.recommendations).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Module compatibility check completed', {
        totalModules: 3,
        compatible: expect.any(Number),
        incompatible: expect.any(Number)
      });
    });

    test('должен разрешать конфликты зависимостей', async () => {
      const conflicts = [
        {
          module: '@ui',
          conflict: 'Version mismatch with @core',
          resolution: 'Upgrade @ui to version 2.0.0'
        }
      ];

      const resolution = await bootstrap.resolveConflicts(conflicts);

      expect(resolution.resolved).toBeDefined();
      expect(resolution.actions).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Dependency conflicts resolved', {
        conflicts: 1,
        resolved: expect.any(Number)
      });
    });
  });

  describe('Мониторинг и диагностика', () => {
    test('должен предоставлять информацию о состоянии загрузки', async () => {
      const status = bootstrap.getStatus();

      expect(status.aliasesLoaded).toBeDefined();
      expect(status.modulesLoaded).toBeDefined();
      expect(status.dependencies).toBeDefined();
      expect(status.lastUpdate).toBeDefined();

      expect(mockLogger.debug).toHaveBeenCalledWith('Bootstrap status retrieved', {
        aliasesLoaded: expect.any(Number),
        modulesLoaded: expect.any(Number)
      });
    });

    test('должен выполнять диагностику системы', async () => {
      const diagnostics = await bootstrap.runDiagnostics();

      expect(diagnostics.system).toBeDefined();
      expect(diagnostics.modules).toBeDefined();
      expect(diagnostics.performance).toBeDefined();
      expect(diagnostics.recommendations).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('System diagnostics completed', {
        system: expect.any(Object),
        modules: expect.any(Object)
      });
    });

    test('должен отслеживать производительность загрузки', async () => {
      const startTime = Date.now();

      await bootstrap.autoLoadModules();

      const performance = bootstrap.getPerformanceMetrics();
      expect(performance.loadTime).toBeGreaterThan(0);
      expect(performance.memoryUsage).toBeDefined();
      expect(performance.cpuUsage).toBeDefined();

      expect(mockLogger.debug).toHaveBeenCalledWith('Performance metrics collected', {
        loadTime: expect.any(Number),
        memoryUsage: expect.any(Object)
      });
    });
  });

  describe('Расширенные возможности', () => {
    test('должен поддерживать горячую перезагрузку модулей', async () => {
      const modulePath = './libs/test-module';
      
      const reloadResult = await bootstrap.hotReloadModule(modulePath);

      expect(reloadResult.success).toBeDefined();
      expect(reloadResult.module).toBeDefined();
      expect(reloadResult.reloadTime).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Module hot-reloaded', {
        module: modulePath,
        reloadTime: expect.any(Number)
      });
    });

    test('должен поддерживать условную загрузку модулей', async () => {
      const conditionalConfig = {
        '@feature': {
          path: './libs/feature',
          condition: 'process.env.FEATURE_ENABLED === "true"'
        }
      };

      const loadResult = await bootstrap.loadConditionalModules(conditionalConfig);

      expect(loadResult.loaded).toBeDefined();
      expect(loadResult.skipped).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Conditional modules loaded', {
        loaded: expect.any(Array),
        skipped: expect.any(Array)
      });
    });

    test('должен поддерживать плагинную архитектуру', async () => {
      const pluginConfig = {
        name: 'test-plugin',
        version: '1.0.0',
        entry: './plugins/test-plugin.js'
      };

      const plugin = await bootstrap.loadPlugin(pluginConfig);

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.loaded).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith('Plugin loaded successfully', {
        name: 'test-plugin',
        version: '1.0.0'
      });
    });
  });
});
