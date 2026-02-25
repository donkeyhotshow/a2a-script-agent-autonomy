import pluginCore, { initializePluginSystem, PluginSystem } from '../../src/core-index.js';
import PluginManager from '../../src/PluginManager.js';
import PluginLoader from '../../src/PluginLoader.js';
import TaskReporter from '../../src/TaskReporter.js';

// Моки для console.error
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Моки для зависимостей
jest.mock('../../src/PluginManager.js', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    registerPlugin: jest.fn(),
    installPlugin: jest.fn(),
    uninstallPlugin: jest.fn(),
    getPlugin: jest.fn(),
    isPluginInstalled: jest.fn(),
    executeHook: jest.fn(),
    getInstalledPlugins: jest.fn(),
    cleanup: jest.fn(),
  }));
});

jest.mock('../../src/PluginLoader.js', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    loadPlugin: jest.fn(),
    getAllLoadedPlugins: jest.fn(),
    cleanup: jest.fn(),
  }));
});

jest.mock('../../src/TaskReporter.js', () => ({
  initialize: jest.fn(),
  cleanup: jest.fn(),
}));

describe('PluginCore', () => {
  let mockPluginManager;
  let mockPluginLoader;
  let mockTaskReporter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPluginManager = {
      initialize: jest.fn(),
      registerPlugin: jest.fn(),
      installPlugin: jest.fn(),
      uninstallPlugin: jest.fn(),
      getPlugin: jest.fn(),
      isPluginInstalled: jest.fn(),
      executeHook: jest.fn(),
      getInstalledPlugins: jest.fn(),
      cleanup: jest.fn(),
    };
    
    mockPluginLoader = {
      initialize: jest.fn(),
      loadPlugin: jest.fn(),
      getAllLoadedPlugins: jest.fn(),
      cleanup: jest.fn(),
    };
    
    mockTaskReporter = {
      initialize: jest.fn(),
      cleanup: jest.fn(),
    };

    // Устанавливаем моки для конструкторов
    PluginManager.mockImplementation(() => mockPluginManager);
    PluginLoader.mockImplementation(() => mockPluginLoader);
    
    // Создаем новый экземпляр для каждого теста
    const PluginCore = require('../../src/core-index.js').default.constructor;
    pluginCore.pluginManager = mockPluginManager;
    pluginCore.pluginLoader = mockPluginLoader;
    pluginCore.taskReporter = mockTaskReporter;
    pluginCore.isInitialized = false;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('should initialize with correct dependencies', () => {
    expect(pluginCore.pluginManager).toBeDefined();
    expect(pluginCore.pluginLoader).toBeDefined();
    expect(pluginCore.taskReporter).toBeDefined();
    expect(pluginCore.isInitialized).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[critical] PluginCore конструктор выполнен'));
  });

  describe('initialize', () => {
    test('should initialize successfully', async () => {
      mockTaskReporter.initialize.mockResolvedValue();
      mockPluginLoader.initialize.mockResolvedValue();
      mockPluginManager.initialize.mockResolvedValue();
      mockPluginLoader.getAllLoadedPlugins.mockReturnValue([]);
      mockPluginManager.getInstalledPlugins.mockReturnValue([]);

      await pluginCore.initialize();

      expect(pluginCore.isInitialized).toBe(true);
      expect(mockTaskReporter.initialize).toHaveBeenCalled();
      expect(mockPluginLoader.initialize).toHaveBeenCalled();
      expect(mockPluginManager.initialize).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Система плагинов инициализирована'));
    });

    test('should not initialize if already initialized', async () => {
      pluginCore.isInitialized = true;

      await pluginCore.initialize();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('PluginCore уже инициализирован'));
      expect(mockTaskReporter.initialize).not.toHaveBeenCalled();
    });

    test('should handle TaskReporter initialization errors gracefully', async () => {
      mockTaskReporter.initialize.mockRejectedValue(new Error('TaskReporter error'));
      mockPluginLoader.initialize.mockResolvedValue();
      mockPluginManager.initialize.mockResolvedValue();
      mockPluginLoader.getAllLoadedPlugins.mockReturnValue([]);
      mockPluginManager.getInstalledPlugins.mockReturnValue([]);

      await pluginCore.initialize();

      expect(pluginCore.isInitialized).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('TaskReporter init failed'));
    });

    test('should handle initialization errors', async () => {
      mockTaskReporter.initialize.mockResolvedValue();
      mockPluginLoader.initialize.mockRejectedValue(new Error('PluginLoader error'));

      await expect(pluginCore.initialize()).rejects.toThrow('PluginLoader error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка инициализации системы плагинов'));
    });
  });

  describe('loadPlugin', () => {
    beforeEach(async () => {
      mockTaskReporter.initialize.mockResolvedValue();
      mockPluginLoader.initialize.mockResolvedValue();
      mockPluginManager.initialize.mockResolvedValue();
      mockPluginLoader.getAllLoadedPlugins.mockReturnValue([]);
      mockPluginManager.getInstalledPlugins.mockReturnValue([]);
      await pluginCore.initialize();
    });

    test('should load plugin successfully', async () => {
      const mockPlugin = { name: 'testPlugin', version: '1.0.0' };
      mockPluginLoader.loadPlugin.mockResolvedValue(mockPlugin);
      mockPluginManager.registerPlugin.mockReturnValue(true);

      const result = await pluginCore.loadPlugin('testPlugin');

      expect(result).toBe(mockPlugin);
      expect(mockPluginLoader.loadPlugin).toHaveBeenCalledWith('testPlugin');
      expect(mockPluginManager.registerPlugin).toHaveBeenCalledWith(mockPlugin);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин загружен и зарегистрирован успешно'));
    });

    test('should return null if plugin not loaded', async () => {
      mockPluginLoader.loadPlugin.mockResolvedValue(null);

      const result = await pluginCore.loadPlugin('testPlugin');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин не загружен'));
    });

    test('should return null if plugin not registered', async () => {
      const mockPlugin = { name: 'testPlugin', version: '1.0.0' };
      mockPluginLoader.loadPlugin.mockResolvedValue(mockPlugin);
      mockPluginManager.registerPlugin.mockReturnValue(false);

      const result = await pluginCore.loadPlugin('testPlugin');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин не зарегистрирован'));
    });

    test('should handle loadPlugin errors', async () => {
      mockPluginLoader.loadPlugin.mockRejectedValue(new Error('Load error'));

      await expect(pluginCore.loadPlugin('testPlugin')).rejects.toThrow('Load error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка загрузки плагина'));
    });
  });

  describe('installPlugin', () => {
    beforeEach(async () => {
      mockTaskReporter.initialize.mockResolvedValue();
      mockPluginLoader.initialize.mockResolvedValue();
      mockPluginManager.initialize.mockResolvedValue();
      mockPluginLoader.getAllLoadedPlugins.mockReturnValue([]);
      mockPluginManager.getInstalledPlugins.mockReturnValue([]);
      await pluginCore.initialize();
    });

    test('should install plugin successfully', async () => {
      const mockPlugin = { name: 'testPlugin', version: '1.0.0' };
      mockPluginManager.getPlugin.mockReturnValue(mockPlugin);
      mockPluginManager.installPlugin.mockResolvedValue(true);

      const result = await pluginCore.installPlugin('testPlugin');

      expect(result).toBe(mockPlugin);
      expect(mockPluginManager.installPlugin).toHaveBeenCalledWith('testPlugin');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин установлен успешно'));
    });

    test('should load plugin if not loaded before installing', async () => {
      const mockPlugin = { name: 'testPlugin', version: '1.0.0' };
      mockPluginManager.getPlugin.mockReturnValue(null);
      mockPluginLoader.loadPlugin.mockResolvedValue(mockPlugin);
      mockPluginManager.registerPlugin.mockReturnValue(true);
      mockPluginManager.installPlugin.mockResolvedValue(true);

      const result = await pluginCore.installPlugin('testPlugin');

      expect(result).toBe(mockPlugin);
      expect(mockPluginLoader.loadPlugin).toHaveBeenCalledWith('testPlugin');
      expect(mockPluginManager.installPlugin).toHaveBeenCalledWith('testPlugin');
    });

    test('should throw error if plugin cannot be loaded', async () => {
      mockPluginManager.getPlugin.mockReturnValue(null);
      mockPluginLoader.loadPlugin.mockResolvedValue(null);

      await expect(pluginCore.installPlugin('testPlugin')).rejects.toThrow('Плагин testPlugin не может быть загружен');
    });

    test('should throw error if plugin cannot be installed', async () => {
      const mockPlugin = { name: 'testPlugin', version: '1.0.0' };
      mockPluginManager.getPlugin.mockReturnValue(mockPlugin);
      mockPluginManager.installPlugin.mockResolvedValue(false);

      await expect(pluginCore.installPlugin('testPlugin')).rejects.toThrow('Плагин testPlugin не может быть установлен');
    });

    test('should handle installPlugin errors', async () => {
      mockPluginManager.getPlugin.mockImplementation(() => {
        throw new Error('Get plugin error');
      });

      await expect(pluginCore.installPlugin('testPlugin')).rejects.toThrow('Get plugin error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка установки плагина'));
    });
  });

  describe('uninstallPlugin', () => {
    beforeEach(async () => {
      mockTaskReporter.initialize.mockResolvedValue();
      mockPluginLoader.initialize.mockResolvedValue();
      mockPluginManager.initialize.mockResolvedValue();
      mockPluginLoader.getAllLoadedPlugins.mockReturnValue([]);
      mockPluginManager.getInstalledPlugins.mockReturnValue([]);
      await pluginCore.initialize();
    });

    test('should uninstall plugin successfully', async () => {
      mockPluginManager.uninstallPlugin.mockResolvedValue(true);

      const result = await pluginCore.uninstallPlugin('testPlugin');

      expect(result).toBe(true);
      expect(mockPluginManager.uninstallPlugin).toHaveBeenCalledWith('testPlugin');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин удален успешно'));
    });

    test('should throw error if plugin cannot be uninstalled', async () => {
      mockPluginManager.uninstallPlugin.mockResolvedValue(false);

      await expect(pluginCore.uninstallPlugin('testPlugin')).rejects.toThrow('Плагин testPlugin не может быть удален');
    });

    test('should handle uninstallPlugin errors', async () => {
      mockPluginManager.uninstallPlugin.mockRejectedValue(new Error('Uninstall error'));

      await expect(pluginCore.uninstallPlugin('testPlugin')).rejects.toThrow('Uninstall error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка удаления плагина'));
    });
  });

  describe('getAllPlugins', () => {
    test('should return all plugins successfully', () => {
      const mockLoadedPlugins = [{ name: 'plugin1' }, { name: 'plugin2' }];
      const mockInstalledPlugins = [{ name: 'plugin1' }];
      
      mockPluginLoader.getAllLoadedPlugins.mockReturnValue(mockLoadedPlugins);
      mockPluginManager.getInstalledPlugins.mockReturnValue(mockInstalledPlugins);

      const result = pluginCore.getAllPlugins();

      expect(result).toEqual({
        loaded: mockLoadedPlugins,
        installed: mockInstalledPlugins,
        total: {
          loaded: 2,
          installed: 1
        }
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Список плагинов получен'));
    });

    test('should handle getAllPlugins errors gracefully', () => {
      mockPluginLoader.getAllLoadedPlugins.mockImplementation(() => {
        throw new Error('Get loaded plugins error');
      });

      const result = pluginCore.getAllPlugins();

      expect(result).toEqual({
        loaded: [],
        installed: [],
        total: { loaded: 0, installed: 0 }
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка получения списка плагинов'));
    });
  });

  describe('getPluginInfo', () => {
    test('should return plugin info successfully', () => {
      const mockPlugin = {
        name: 'testPlugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: { onInit: jest.fn() },
        loadedAt: '2023-01-01T00:00:00.000Z'
      };
      
      mockPluginManager.getPlugin.mockReturnValue(mockPlugin);
      mockPluginManager.isPluginInstalled.mockReturnValue(true);

      const result = pluginCore.getPluginInfo('testPlugin');

      expect(result).toEqual({
        name: 'testPlugin',
        version: '1.0.0',
        description: 'Test plugin',
        isInstalled: true,
        config: undefined,
        hooks: ['onInit'],
        loadedAt: '2023-01-01T00:00:00.000Z'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Информация о плагине получена'));
    });

    test('should return null for non-existent plugin', () => {
      mockPluginManager.getPlugin.mockReturnValue(null);

      const result = pluginCore.getPluginInfo('nonExistentPlugin');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин не найден'));
    });

    test('should handle getPluginInfo errors gracefully', () => {
      mockPluginManager.getPlugin.mockImplementation(() => {
        throw new Error('Get plugin error');
      });

      const result = pluginCore.getPluginInfo('testPlugin');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка получения информации о плагине'));
    });
  });

  describe('executeHook', () => {
    test('should execute hook successfully', async () => {
      const mockResults = ['result1', 'result2'];
      mockPluginManager.executeHook.mockResolvedValue(mockResults);

      const result = await pluginCore.executeHook('testHook', 'arg1', 'arg2');

      expect(result).toBe(mockResults);
      expect(mockPluginManager.executeHook).toHaveBeenCalledWith('testHook', 'arg1', 'arg2');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Хук выполнен успешно'));
    });

    test('should handle executeHook errors', async () => {
      mockPluginManager.executeHook.mockRejectedValue(new Error('Hook error'));

      await expect(pluginCore.executeHook('testHook')).rejects.toThrow('Hook error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка выполнения хука'));
    });
  });

  describe('getStats', () => {
    test('should return stats successfully', () => {
      const mockLoadedPlugins = [
        { name: 'plugin1', version: '1.0.0', hooks: { onInit: jest.fn() } },
        { name: 'plugin2', version: '2.0.0', hooks: { onStart: jest.fn() } }
      ];
      const mockInstalledPlugins = [{ name: 'plugin1' }];
      
      mockPluginLoader.getAllLoadedPlugins.mockReturnValue(mockLoadedPlugins);
      mockPluginManager.getInstalledPlugins.mockReturnValue(mockInstalledPlugins);

      const result = pluginCore.getStats();

      expect(result.total).toEqual({ loaded: 2, installed: 1 });
      expect(result.byStatus).toEqual({ loaded: 2, installed: 1, notInstalled: 1 });
      expect(result.byVersion).toEqual({ '1.0.0': 1, '2.0.0': 1 });
      expect(result.byHook).toEqual({ onInit: 1, onStart: 1 });
      expect(result.system.isInitialized).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Статистика системы плагинов получена'));
    });

    test('should handle getStats errors gracefully', () => {
      mockPluginLoader.getAllLoadedPlugins.mockImplementation(() => {
        throw new Error('Get loaded plugins error');
      });

      const result = pluginCore.getStats();

      expect(result.total).toEqual({ loaded: 0, installed: 0 });
      expect(result.byStatus).toEqual({ loaded: 0, installed: 0, notInstalled: 0 });
      expect(result.byVersion).toEqual({});
      expect(result.byHook).toEqual({});
      expect(result.system.isInitialized).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка получения статистики системы плагинов'));
    });
  });

  describe('cleanup', () => {
    test('should cleanup successfully', async () => {
      mockPluginManager.cleanup.mockResolvedValue();
      mockPluginLoader.cleanup.mockResolvedValue();
      mockTaskReporter.cleanup.mockResolvedValue();

      await pluginCore.cleanup();

      expect(pluginCore.isInitialized).toBe(false);
      expect(mockPluginManager.cleanup).toHaveBeenCalled();
      expect(mockPluginLoader.cleanup).toHaveBeenCalled();
      expect(mockTaskReporter.cleanup).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Система плагинов очищена успешно'));
    });

    test('should handle cleanup errors', async () => {
      mockPluginManager.cleanup.mockRejectedValue(new Error('Cleanup error'));

      await expect(pluginCore.cleanup()).rejects.toThrow('Cleanup error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка очистки системы плагинов'));
    });
  });

  describe('initializePluginSystem', () => {
    test('should initialize plugin system for Vue app successfully', async () => {
      const mockApp = {
        config: {
          globalProperties: {
            $router: {
              addRoute: jest.fn()
            }
          }
        },
        component: jest.fn()
      };

      mockTaskReporter.initialize.mockResolvedValue();
      mockPluginLoader.initialize.mockResolvedValue();
      mockPluginManager.initialize.mockResolvedValue();
      mockPluginLoader.getAllLoadedPlugins.mockReturnValue([
        {
          name: 'testPlugin',
          routes: [{ path: '/test', component: 'TestComponent' }],
          components: { TestComponent: 'TestComponent' }
        }
      ]);
      mockPluginManager.getInstalledPlugins.mockReturnValue([]);

      await initializePluginSystem(mockApp);

      expect(mockApp.config.globalProperties.$pluginCore).toBe(pluginCore);
      expect(mockApp.config.globalProperties.$pluginManager).toBe(pluginCore.pluginManager);
      expect(mockApp.config.globalProperties.$pluginLoader).toBe(pluginCore.pluginLoader);
      expect(mockApp.config.globalProperties.$router.addRoute).toHaveBeenCalledWith({ path: '/test', component: 'TestComponent' });
      expect(mockApp.component).toHaveBeenCalledWith('TestComponent', 'TestComponent');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Система плагинов инициализирована для Vue приложения'));
    });

    test('should handle initializePluginSystem errors', async () => {
      const mockApp = { config: { globalProperties: {} } };
      mockTaskReporter.initialize.mockRejectedValue(new Error('Init error'));

      await expect(initializePluginSystem(mockApp)).rejects.toThrow('Init error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка инициализации системы плагинов для Vue приложения'));
    });
  });

  describe('PluginSystem', () => {
    test('getInfo should return system info', async () => {
      const mockStats = { total: { loaded: 1, installed: 1 } };
      const mockPlugins = { loaded: [], installed: [] };
      
      jest.spyOn(pluginCore, 'getStats').mockReturnValue(mockStats);
      jest.spyOn(pluginCore, 'getAllPlugins').mockReturnValue(mockPlugins);

      const result = await PluginSystem.getInfo();

      expect(result).toEqual({
        stats: mockStats,
        plugins: mockPlugins,
        system: {
          isInitialized: false,
          version: '1.0.0'
        }
      });
    });

    test('getInfo should handle errors gracefully', async () => {
      jest.spyOn(pluginCore, 'getStats').mockImplementation(() => {
        throw new Error('Stats error');
      });

      const result = await PluginSystem.getInfo();

      expect(result).toEqual({
        stats: { total: { loaded: 0, installed: 0 } },
        plugins: { loaded: [], installed: [] },
        system: { isInitialized: false, version: '1.0.0' }
      });
    });

    test('getPluginInfo should delegate to pluginCore', () => {
      const mockInfo = { name: 'testPlugin', version: '1.0.0' };
      jest.spyOn(pluginCore, 'getPluginInfo').mockReturnValue(mockInfo);

      const result = PluginSystem.getPluginInfo('testPlugin');

      expect(result).toBe(mockInfo);
    });

    test('getAllPlugins should delegate to pluginCore', () => {
      const mockPlugins = { loaded: [], installed: [] };
      jest.spyOn(pluginCore, 'getAllPlugins').mockReturnValue(mockPlugins);

      const result = PluginSystem.getAllPlugins();

      expect(result).toBe(mockPlugins);
    });

    test('getStats should delegate to pluginCore', () => {
      const mockStats = { total: { loaded: 0, installed: 0 } };
      jest.spyOn(pluginCore, 'getStats').mockReturnValue(mockStats);

      const result = PluginSystem.getStats();

      expect(result).toBe(mockStats);
    });

    test('executeHook should delegate to pluginCore', async () => {
      const mockResults = ['result1'];
      jest.spyOn(pluginCore, 'executeHook').mockResolvedValue(mockResults);

      const result = await PluginSystem.executeHook('testHook', 'arg1');

      expect(result).toBe(mockResults);
    });
  });
});