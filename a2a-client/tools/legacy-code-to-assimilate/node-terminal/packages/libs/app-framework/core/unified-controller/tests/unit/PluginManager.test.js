import { PluginManager } from '../../src/PluginManager.js';
import EventEmitter from 'eventemitter3';

// Мокирование зависимостей
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockErrorHandler = {
  handleError: jest.fn(),
};

const mockConfigManager = {
  autoLoad: jest.fn().mockResolvedValue(true),
  get: jest.fn(),
};

const mockSharedUtils = {
  isValidVersion: jest.fn().mockReturnValue(true),
};

const mockPluginLifecycleManager = {
  initializePlugin: jest.fn().mockResolvedValue(true),
  enablePlugin: jest.fn().mockResolvedValue(true),
  disablePlugin: jest.fn().mockResolvedValue(true),
  executeHook: jest.fn().mockResolvedValue([]),
};

// Мокируем импорты
jest.mock('@libs/core/logging', () => ({
  LoggingUtils: jest.fn(() => mockLogger),
}));
jest.mock('@libs/error-management/error-handler', () => ({
  ErrorHandlingUtils: jest.fn(() => mockErrorHandler),
}));
jest.mock('@libs/core/configuration', () => ({
  ConfigurationUtils: jest.fn(() => mockConfigManager),
}));
jest.mock('@libs/core/shared', () => ({
  SharedUtils: mockSharedUtils,
}));
jest.mock('../../src/PluginLifecycleManager.js', () => ({
  PluginLifecycleManager: jest.fn(() => mockPluginLifecycleManager),
}));

describe('PluginManager', () => {
  let pluginManager;

  beforeEach(() => {
    jest.clearAllMocks();
    pluginManager = new PluginManager({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      configManager: mockConfigManager,
    });
  });

  test('должен корректно инициализироваться с зависимостями', () => {
    expect(pluginManager.logger).toBe(mockLogger);
    expect(pluginManager.errorHandler).toBe(mockErrorHandler);
    expect(pluginManager.configManager).toBe(mockConfigManager);
    expect(pluginManager.lifecycleManager).toBeDefined();
    expect(mockLogger.info).toHaveBeenCalledWith('PluginManager инициализирован', expect.any(Object));
    expect(pluginManager.isInitialized).toBe(false);
    expect(pluginManager.isShutdown).toBe(false);
    expect(pluginManager.plugins.size).toBe(0);
    expect(pluginManager.hooks.size).toBe(0);
    expect(pluginManager.dependencies.size).toBe(0);
  });

  test('должен инициализировать PluginManager и вызывать автозагрузку', async () => {
    const emitSpy = jest.spyOn(pluginManager, 'emit');
    await pluginManager.initialize();

    expect(pluginManager.isInitialized).toBe(true);
    expect(mockConfigManager.autoLoad).toHaveBeenCalledWith('plugin-manager');
    expect(emitSpy).toHaveBeenCalledWith('initialized');
    expect(mockLogger.info).toHaveBeenCalledWith('PluginManager успешно инициализирован', expect.any(Object));
  });

  test('не должен инициализировать PluginManager повторно, если он уже инициализирован', async () => {
    pluginManager.isInitialized = true;
    await pluginManager.initialize();

    expect(mockConfigManager.autoLoad).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith('PluginManager уже инициализирован');
  });

  test('должен обрабатывать ошибки инициализации', async () => {
    mockConfigManager.autoLoad.mockRejectedValueOnce(new Error('Config load failed'));

    await expect(pluginManager.initialize()).rejects.toThrow('Config load failed');
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), { context: 'PluginManager.initialize' });
  });

  test('registerPlugin должен регистрировать новый плагин', () => {
    const plugin = {
      name: 'TestPlugin',
      version: '1.0.0',
      dependencies: ['dep1'],
      hooks: { onStart: jest.fn() },
    };
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(true);
    expect(pluginManager.plugins.has('TestPlugin')).toBe(true);
    expect(pluginManager.plugins.get('TestPlugin')).toEqual(expect.objectContaining({
      name: 'TestPlugin',
      isInstalled: false,
      isEnabled: false,
    }));
    expect(pluginManager.dependencies.get('TestPlugin')).toEqual(['dep1']);
    expect(pluginManager.hooks.get('onStart')).toEqual([expect.objectContaining({ pluginName: 'TestPlugin' })]);
    expect(pluginManager.stats.totalPlugins).toBe(1);
    expect(pluginManager.stats.totalHooks).toBe(1);
    expect(mockLogger.info).toHaveBeenCalledWith('Плагин TestPlugin зарегистрирован', expect.any(Object));
  });

  test('registerPlugin должен выбрасывать ошибку, если плагин не имеет имени', () => {
    const plugin = { version: '1.0.0' };
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(false);
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), { context: 'PluginManager.registerPlugin', plugin: undefined });
    expect(pluginManager.plugins.size).toBe(0);
  });

  test('registerPlugin должен предотвращать повторную регистрацию плагина', () => {
    const plugin = { name: 'TestPlugin', version: '1.0.0' };
    pluginManager.registerPlugin(plugin);
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(false);
    expect(pluginManager.plugins.size).toBe(1);
    expect(mockLogger.warn).toHaveBeenCalledWith('Попытка повторной регистрации плагина: TestPlugin');
  });

  test('validatePlugin должен выбрасывать ошибку, если отсутствуют обязательные поля', () => {
    const incompletePlugin = { name: 'InvalidPlugin' };
    expect(() => pluginManager.validatePlugin(incompletePlugin)).toThrow('Плагин должен содержать поле: version');
  });

  test('validatePlugin должен выбрасывать ошибку при неверном формате версии', () => {
    mockSharedUtils.isValidVersion.mockReturnValueOnce(false);
    const invalidVersionPlugin = { name: 'P1', version: 'abc' };
    expect(() => pluginManager.validatePlugin(invalidVersionPlugin)).toThrow('Неверный формат версии: abc');
  });

  test('validatePlugin должен выбрасывать ошибку, если зависимость не является строкой', () => {
    const invalidDepPlugin = { name: 'P1', version: '1.0.0', dependencies: [123] };
    expect(() => pluginManager.validatePlugin(invalidDepPlugin)).toThrow('Зависимость должна быть строкой: 123');
  });

  test('registerPluginHooks должен регистрировать хуки плагина', () => {
    const hooks = { onInit: jest.fn(), onStop: jest.fn() };
    pluginManager.registerPluginHooks('TestPlugin', hooks);

    expect(pluginManager.hooks.get('onInit')).toEqual([expect.objectContaining({ pluginName: 'TestPlugin' })]);
    expect(pluginManager.hooks.get('onStop')).toEqual([expect.objectContaining({ pluginName: 'TestPlugin' })]);
    expect(pluginManager.stats.totalHooks).toBe(2);
  });

  test('getPluginInfo должен возвращать информацию о плагине', () => {
    const plugin = {
      name: 'TestPlugin',
      version: '1.0.0',
      description: 'Desc',
      isInstalled: true,
      isEnabled: true,
      installTime: 'now',
      lastError: null,
      retryCount: 0,
      dependencies: ['dep1'],
      hooks: { onStart: jest.fn() },
    };
    pluginManager.registerPlugin(plugin);

    const info = pluginManager.getPluginInfo('TestPlugin');

    expect(info).toEqual({
      name: 'TestPlugin',
      version: '1.0.0',
      description: 'Desc',
      isInstalled: false, // Изначально false при регистрации
      isEnabled: false,   // Изначально false при регистрации
      installTime: null,  // Изначально null при регистрации
      lastError: null,
      retryCount: 0,
      dependencies: ['dep1'],
      hooks: ['onStart'],
    });
  });

  test('getPluginInfo должен возвращать null, если плагин не найден', () => {
    const info = pluginManager.getPluginInfo('NonExistentPlugin');
    expect(info).toBeNull();
  });

  test('getAllPlugins должен возвращать список всех зарегистрированных плагинов', () => {
    pluginManager.registerPlugin({ name: 'P1', version: '1.0.0' });
    pluginManager.registerPlugin({ name: 'P2', version: '2.0.0' });

    const allPlugins = pluginManager.getAllPlugins();
    expect(allPlugins.length).toBe(2);
    expect(allPlugins[0].name).toBe('P1');
    expect(allPlugins[1].name).toBe('P2');
  });

  test('getInstalledPlugins должен возвращать только установленные плагины', () => {
    const p1 = { name: 'P1', version: '1.0.0' };
    const p2 = { name: 'P2', version: '2.0.0' };
    pluginManager.registerPlugin(p1);
    pluginManager.registerPlugin(p2);
    pluginManager.plugins.get('P1').isInstalled = true; // Имитация установки

    const installed = pluginManager.getInstalledPlugins();
    expect(installed.length).toBe(1);
    expect(installed[0].name).toBe('P1');
  });

  test('getEnabledPlugins должен возвращать только включенные плагины', () => {
    const p1 = { name: 'P1', version: '1.0.0' };
    const p2 = { name: 'P2', version: '2.0.0' };
    pluginManager.registerPlugin(p1);
    pluginManager.registerPlugin(p2);
    pluginManager.plugins.get('P1').isEnabled = true; // Имитация включения

    const enabled = pluginManager.getEnabledPlugins();
    expect(enabled.length).toBe(1);
    expect(enabled[0].name).toBe('P1');
  });

  test('getStats должен возвращать статистику PluginManager', () => {
    pluginManager.registerPlugin({ name: 'P1', version: '1.0.0', hooks: { h1: jest.fn() } });
    pluginManager.registerPlugin({ name: 'P2', version: '2.0.0' });
    pluginManager.plugins.get('P1').isInstalled = true;

    const stats = pluginManager.getStats();

    expect(stats.totalPlugins).toBe(2);
    expect(stats.installedPlugins).toBe(1);
    expect(stats.totalHooks).toBe(1);
    expect(stats.isInitialized).toBe(false);
    expect(stats.isShutdown).toBe(false);
    expect(stats.loadOrder).toEqual([]);
  });

  test('autoLoadPlugins должен загружать плагины согласно конфигурации', async () => {
    mockConfigManager.get.mockResolvedValueOnce({
      autoLoad: [
        { name: 'core' },
        { name: 'dashboard' },
      ],
    });
    // Мокируем loadPluginFromConfig для автозагрузки
    const loadPluginFromConfigSpy = jest.spyOn(pluginManager, 'loadPluginFromConfig');
    loadPluginFromConfigSpy.mockResolvedValue(true);

    await pluginManager.autoLoadPlugins();

    expect(mockConfigManager.get).toHaveBeenCalledWith('plugins');
    expect(loadPluginFromConfigSpy).toHaveBeenCalledWith({ name: 'core' });
    expect(loadPluginFromConfigSpy).toHaveBeenCalledWith({ name: 'dashboard' });
    expect(loadPluginFromConfigSpy).toHaveBeenCalledTimes(2);
  });

  test('autoLoadPlugins должен обрабатывать ошибки при загрузке плагинов из конфигурации', async () => {
    mockConfigManager.get.mockResolvedValueOnce({
      autoLoad: [
        { name: 'core' },
        { name: 'failingPlugin' },
      ],
    });
    const loadPluginFromConfigSpy = jest.spyOn(pluginManager, 'loadPluginFromConfig');
    loadPluginFromConfigSpy.mockImplementation(async (config) => {
      if (config.name === 'failingPlugin') {
        throw new Error('Failed to load');
      }
      return true;
    });

    await pluginManager.autoLoadPlugins();

    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
      context: 'PluginManager.autoLoadPlugins',
      pluginConfig: { name: 'failingPlugin' },
    });
  });

  test('shutdown должен отключать плагины в обратном порядке загрузки', async () => {
    const plugin1 = { name: 'P1', version: '1.0.0', isEnabled: true };
    const plugin2 = { name: 'P2', version: '2.0.0', isEnabled: true };
    pluginManager.registerPlugin(plugin1);
    pluginManager.registerPlugin(plugin2);
    pluginManager.plugins.get('P1').isEnabled = true;
    pluginManager.plugins.get('P2').isEnabled = true;
    pluginManager.loadOrder = ['P1', 'P2']; // Имитация порядка загрузки

    const emitSpy = jest.spyOn(pluginManager, 'emit');

    await pluginManager.shutdown();

    expect(pluginManager.isShutdown).toBe(true);
    expect(mockPluginLifecycleManager.disablePlugin).toHaveBeenCalledTimes(2);
    expect(mockPluginLifecycleManager.disablePlugin).toHaveBeenNthCalledWith(1, 'P2'); // Обратный порядок
    expect(mockPluginLifecycleManager.disablePlugin).toHaveBeenNthCalledWith(2, 'P1');
    expect(emitSpy).toHaveBeenCalledWith('shutdown');
    expect(mockLogger.info).toHaveBeenCalledWith('Начало graceful shutdown PluginManager');
    expect(mockLogger.info).toHaveBeenCalledWith('PluginManager успешно завершен');
  });

  test('shutdown должен обрабатывать ошибки при отключении плагинов', async () => {
    const plugin1 = { name: 'P1', version: '1.0.0', isEnabled: true };
    pluginManager.registerPlugin(plugin1);
    pluginManager.plugins.get('P1').isEnabled = true;
    pluginManager.loadOrder = ['P1'];

    mockPluginLifecycleManager.disablePlugin.mockRejectedValueOnce(new Error('Disable failed'));

    await pluginManager.shutdown();

    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
      context: 'PluginManager.shutdown',
      pluginName: 'P1',
    });
  });

  test('shutdown не должен выполняться повторно, если уже завершен', async () => {
    pluginManager.isShutdown = true;
    const emitSpy = jest.spyOn(pluginManager, 'emit');
    await pluginManager.shutdown();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalledWith('Начало graceful shutdown PluginManager');
  });

  test('должен корректно обрабатывать ошибки при регистрации плагина', () => {
    const invalidPlugin = null;
    const result = pluginManager.registerPlugin(invalidPlugin);

    expect(result).toBe(false);
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
      context: 'PluginManager.registerPlugin',
      plugin: undefined
    });
  });

  test('должен корректно обрабатывать плагины без зависимостей', () => {
    const plugin = {
      name: 'SimplePlugin',
      version: '1.0.0'
    };
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(true);
    expect(pluginManager.plugins.has('SimplePlugin')).toBe(true);
    expect(pluginManager.dependencies.has('SimplePlugin')).toBe(false);
  });

  test('должен корректно обрабатывать плагины без хуков', () => {
    const plugin = {
      name: 'NoHooksPlugin',
      version: '1.0.0'
    };
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(true);
    expect(pluginManager.hooks.size).toBe(0);
  });

  test('должен корректно обрабатывать плагины с пустыми зависимостями', () => {
    const plugin = {
      name: 'EmptyDepsPlugin',
      version: '1.0.0',
      dependencies: []
    };
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(true);
    expect(pluginManager.dependencies.get('EmptyDepsPlugin')).toEqual([]);
  });

  test('должен корректно обрабатывать плагины с пустыми хуками', () => {
    const plugin = {
      name: 'EmptyHooksPlugin',
      version: '1.0.0',
      hooks: {}
    };
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(true);
    expect(pluginManager.hooks.size).toBe(0);
  });

  test('должен корректно обрабатывать плагины с хуками без приоритета', () => {
    const plugin = {
      name: 'NoPriorityPlugin',
      version: '1.0.0',
      hooks: {
        onStart: jest.fn()
      }
    };
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(true);
    const hook = pluginManager.hooks.get('onStart')[0];
    expect(hook.priority).toBe(0);
  });

  test('должен корректно обрабатывать плагины с хуками с приоритетом', () => {
    const plugin = {
      name: 'PriorityPlugin',
      version: '1.0.0',
      hooks: {
        onStart: {
          handler: jest.fn(),
          priority: 10
        }
      }
    };
    const result = pluginManager.registerPlugin(plugin);

    expect(result).toBe(true);
    const hook = pluginManager.hooks.get('onStart')[0];
    expect(hook.priority).toBe(10);
  });

  test('должен корректно обрабатывать автозагрузку плагинов без конфигурации', async () => {
    mockConfigManager.get.mockResolvedValueOnce(null);
    
    await pluginManager.autoLoadPlugins();
    
    expect(mockConfigManager.get).toHaveBeenCalledWith('plugins');
    // Никаких дополнительных вызовов не должно быть
  });

  test('должен корректно обрабатывать автозагрузку плагинов с пустой конфигурацией', async () => {
    mockConfigManager.get.mockResolvedValueOnce({});
    
    await pluginManager.autoLoadPlugins();
    
    expect(mockConfigManager.get).toHaveBeenCalledWith('plugins');
    // Никаких дополнительных вызовов не должно быть
  });

  test('должен корректно обрабатывать автозагрузку плагинов с пустым массивом', async () => {
    mockConfigManager.get.mockResolvedValueOnce({ autoLoad: [] });
    
    await pluginManager.autoLoadPlugins();
    
    expect(mockConfigManager.get).toHaveBeenCalledWith('plugins');
    // Никаких дополнительных вызовов не должно быть
  });

  test('должен корректно обрабатывать ошибки конфигурации при автозагрузке', async () => {
    mockConfigManager.get.mockRejectedValueOnce(new Error('Config error'));
    
    await pluginManager.autoLoadPlugins();
    
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
      context: 'PluginManager.autoLoadPlugins'
    });
  });

  test('должен корректно обрабатывать shutdown без плагинов', async () => {
    const emitSpy = jest.spyOn(pluginManager, 'emit');
    
    await pluginManager.shutdown();
    
    expect(pluginManager.isShutdown).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith('shutdown');
    expect(mockLogger.info).toHaveBeenCalledWith('Начало graceful shutdown PluginManager');
    expect(mockLogger.info).toHaveBeenCalledWith('PluginManager успешно завершен');
  });

  test('должен корректно обрабатывать shutdown с плагинами, но без enabled плагинов', async () => {
    const plugin1 = { name: 'P1', version: '1.0.0', isEnabled: false };
    const plugin2 = { name: 'P2', version: '2.0.0', isEnabled: false };
    pluginManager.registerPlugin(plugin1);
    pluginManager.registerPlugin(plugin2);
    pluginManager.loadOrder = ['P1', 'P2'];

    const emitSpy = jest.spyOn(pluginManager, 'emit');
    
    await pluginManager.shutdown();
    
    expect(pluginManager.isShutdown).toBe(true);
    expect(mockPluginLifecycleManager.disablePlugin).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('shutdown');
  });

  test('должен корректно обрабатывать shutdown с ошибками при отключении плагинов', async () => {
    const plugin1 = { name: 'P1', version: '1.0.0', isEnabled: true };
    const plugin2 = { name: 'P2', version: '2.0.0', isEnabled: true };
    pluginManager.registerPlugin(plugin1);
    pluginManager.registerPlugin(plugin2);
    pluginManager.plugins.get('P1').isEnabled = true;
    pluginManager.plugins.get('P2').isEnabled = true;
    pluginManager.loadOrder = ['P1', 'P2'];

    mockPluginLifecycleManager.disablePlugin
      .mockResolvedValueOnce(true) // P2 успешно отключается
      .mockRejectedValueOnce(new Error('Disable P1 failed')); // P1 не отключается

    const emitSpy = jest.spyOn(pluginManager, 'emit');
    
    await pluginManager.shutdown();
    
    expect(pluginManager.isShutdown).toBe(true);
    expect(mockPluginLifecycleManager.disablePlugin).toHaveBeenCalledTimes(2);
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
      context: 'PluginManager.shutdown',
      pluginName: 'P1'
    });
    expect(emitSpy).toHaveBeenCalledWith('shutdown');
  });
});
