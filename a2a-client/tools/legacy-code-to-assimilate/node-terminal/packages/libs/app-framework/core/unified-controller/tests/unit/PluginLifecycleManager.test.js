import { PluginLifecycleManager } from '../../src/PluginLifecycleManager.js';

// Моки для зависимостей
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockErrorHandler = {
  handleError: jest.fn(),
};

const mockSharedUtils = {
  wait: jest.fn().mockResolvedValue(),
};

// Мокируем импорты
jest.mock('@libs/core/shared', () => ({
  SharedUtils: mockSharedUtils,
}));

describe('PluginLifecycleManager', () => {
  let lifecycleManager;
  let mockPlugins;
  let mockDependencies;
  let mockHooks;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPlugins = new Map();
    mockDependencies = new Map();
    mockHooks = new Map();
    mockConfig = {
      enableDependencyCheck: true,
      maxRetries: 3,
      retryDelay: 1000,
    };

    lifecycleManager = new PluginLifecycleManager(
      mockPlugins,
      mockDependencies,
      mockHooks,
      mockConfig,
      mockLogger,
      mockErrorHandler
    );
  });

  describe('installPlugin', () => {
    test('должен успешно устанавливать плагин', async () => {
      const plugin = {
        name: 'TestPlugin',
        install: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const result = await lifecycleManager.installPlugin('TestPlugin');

      expect(result).toBe(true);
      expect(plugin.install).toHaveBeenCalledWith({});
      expect(plugin.isInstalled).toBe(true);
      expect(plugin.installTime).toBeDefined();
      expect(plugin.lastError).toBeNull();
      expect(plugin.retryCount).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Плагин TestPlugin успешно установлен');
    });

    test('должен выбрасывать ошибку для несуществующего плагина', async () => {
      await expect(lifecycleManager.installPlugin('NonExistentPlugin')).rejects.toThrow('Плагин NonExistentPlugin не найден');
    });

    test('должен возвращать false для уже установленного плагина', async () => {
      const plugin = {
        name: 'TestPlugin',
        isInstalled: true,
      };
      mockPlugins.set('TestPlugin', plugin);

      const result = await lifecycleManager.installPlugin('TestPlugin');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Плагин TestPlugin уже установлен');
    });

    test('должен проверять зависимости перед установкой', async () => {
      const plugin = {
        name: 'TestPlugin',
        install: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);
      mockDependencies.set('TestPlugin', ['DepPlugin']);

      const depPlugin = {
        name: 'DepPlugin',
        isInstalled: true,
      };
      mockPlugins.set('DepPlugin', depPlugin);

      const result = await lifecycleManager.installPlugin('TestPlugin');

      expect(result).toBe(true);
      expect(plugin.install).toHaveBeenCalled();
    });

    test('должен выбрасывать ошибку при отсутствии зависимости', async () => {
      const plugin = {
        name: 'TestPlugin',
      };
      mockPlugins.set('TestPlugin', plugin);
      mockDependencies.set('TestPlugin', ['NonExistentDep']);

      await expect(lifecycleManager.installPlugin('TestPlugin')).rejects.toThrow('Зависимость NonExistentDep не найдена для плагина TestPlugin');
    });

    test('должен выбрасывать ошибку при неустановленной зависимости', async () => {
      const plugin = {
        name: 'TestPlugin',
      };
      const depPlugin = {
        name: 'DepPlugin',
        isInstalled: false,
      };
      mockPlugins.set('TestPlugin', plugin);
      mockPlugins.set('DepPlugin', depPlugin);
      mockDependencies.set('TestPlugin', ['DepPlugin']);

      await expect(lifecycleManager.installPlugin('TestPlugin')).rejects.toThrow('Зависимость DepPlugin не установлена для плагина TestPlugin');
    });

    test('должен выполнять хуки beforeInstall и afterInstall', async () => {
      const plugin = {
        name: 'TestPlugin',
        install: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const beforeInstallHook = jest.fn().mockResolvedValue();
      const afterInstallHook = jest.fn().mockResolvedValue();
      mockHooks.set('beforeInstall', [{ pluginName: 'TestPlugin', handler: beforeInstallHook }]);
      mockHooks.set('afterInstall', [{ pluginName: 'TestPlugin', handler: afterInstallHook }]);

      const result = await lifecycleManager.installPlugin('TestPlugin');

      expect(result).toBe(true);
      expect(beforeInstallHook).toHaveBeenCalledWith({});
      expect(afterInstallHook).toHaveBeenCalledWith({});
    });

    test('должен обрабатывать ошибки при установке плагина', async () => {
      const plugin = {
        name: 'TestPlugin',
        install: jest.fn().mockRejectedValue(new Error('Install failed')),
      };
      mockPlugins.set('TestPlugin', plugin);

      await expect(lifecycleManager.installPlugin('TestPlugin')).rejects.toThrow('Install failed');

      expect(plugin.lastError).toBe('Install failed');
      expect(plugin.retryCount).toBe(1);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
        context: 'PluginLifecycleManager.installPlugin',
        pluginName: 'TestPlugin',
      });
    });

    test('должен обрабатывать ошибки в хуках', async () => {
      const plugin = {
        name: 'TestPlugin',
        install: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const failingHook = jest.fn().mockRejectedValue(new Error('Hook failed'));
      mockHooks.set('beforeInstall', [{ pluginName: 'TestPlugin', handler: failingHook }]);

      await expect(lifecycleManager.installPlugin('TestPlugin')).rejects.toThrow('Hook failed');

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
        context: 'PluginLifecycleManager.executeHook',
        hookName: 'beforeInstall',
        pluginName: 'TestPlugin',
      });
    });
  });

  describe('checkDependencies', () => {
    test('должен успешно проверять зависимости', async () => {
      const dep1 = { name: 'Dep1', isInstalled: true };
      const dep2 = { name: 'Dep2', isInstalled: true };
      mockPlugins.set('Dep1', dep1);
      mockPlugins.set('Dep2', dep2);
      mockDependencies.set('TestPlugin', ['Dep1', 'Dep2']);

      await expect(lifecycleManager.checkDependencies('TestPlugin')).resolves.not.toThrow();
    });

    test('должен выбрасывать ошибку при отсутствии зависимости', async () => {
      mockDependencies.set('TestPlugin', ['NonExistentDep']);

      await expect(lifecycleManager.checkDependencies('TestPlugin')).rejects.toThrow('Зависимость NonExistentDep не найдена для плагина TestPlugin');
    });

    test('должен выбрасывать ошибку при неустановленной зависимости', async () => {
      const dep = { name: 'Dep1', isInstalled: false };
      mockPlugins.set('Dep1', dep);
      mockDependencies.set('TestPlugin', ['Dep1']);

      await expect(lifecycleManager.checkDependencies('TestPlugin')).rejects.toThrow('Зависимость Dep1 не установлена для плагина TestPlugin');
    });

    test('должен корректно обрабатывать плагины без зависимостей', async () => {
      await expect(lifecycleManager.checkDependencies('TestPlugin')).resolves.not.toThrow();
    });
  });

  describe('executeHook', () => {
    test('должен выполнять хуки в порядке приоритета', async () => {
      const hook1 = jest.fn().mockResolvedValue();
      const hook2 = jest.fn().mockResolvedValue();
      const hook3 = jest.fn().mockResolvedValue();

      mockHooks.set('testHook', [
        { pluginName: 'TestPlugin', handler: hook1, priority: 1 },
        { pluginName: 'TestPlugin', handler: hook2, priority: 3 },
        { pluginName: 'TestPlugin', handler: hook3, priority: 2 },
      ]);

      await lifecycleManager.executeHook('testHook', 'TestPlugin');

      expect(hook2).toHaveBeenCalledWith({});
      expect(hook3).toHaveBeenCalledWith({});
      expect(hook1).toHaveBeenCalledWith({});
    });

    test('должен выполнять только хуки указанного плагина', async () => {
      const hook1 = jest.fn().mockResolvedValue();
      const hook2 = jest.fn().mockResolvedValue();

      mockHooks.set('testHook', [
        { pluginName: 'TestPlugin', handler: hook1, priority: 1 },
        { pluginName: 'OtherPlugin', handler: hook2, priority: 1 },
      ]);

      await lifecycleManager.executeHook('testHook', 'TestPlugin');

      expect(hook1).toHaveBeenCalledWith({});
      expect(hook2).not.toHaveBeenCalled();
    });

    test('должен обрабатывать ошибки в хуках', async () => {
      const failingHook = jest.fn().mockRejectedValue(new Error('Hook failed'));
      const successfulHook = jest.fn().mockResolvedValue();

      mockHooks.set('testHook', [
        { pluginName: 'TestPlugin', handler: failingHook, priority: 1 },
        { pluginName: 'TestPlugin', handler: successfulHook, priority: 2 },
      ]);

      await lifecycleManager.executeHook('testHook', 'TestPlugin');

      expect(failingHook).toHaveBeenCalledWith({});
      expect(successfulHook).toHaveBeenCalledWith({});
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
        context: 'PluginLifecycleManager.executeHook',
        hookName: 'testHook',
        pluginName: 'TestPlugin',
      });
    });

    test('должен корректно обрабатывать отсутствие хуков', async () => {
      await expect(lifecycleManager.executeHook('nonExistentHook', 'TestPlugin')).resolves.not.toThrow();
    });
  });

  describe('retryOperation', () => {
    test('должен успешно выполнять операцию с первой попытки', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await lifecycleManager.retryOperation(operation, 'Test operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('должен повторять операцию при ошибке', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValue('success');

      const result = await lifecycleManager.retryOperation(operation, 'Test operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      expect(mockSharedUtils.wait).toHaveBeenCalledTimes(2);
    });

    test('должен выбрасывать ошибку после исчерпания попыток', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(lifecycleManager.retryOperation(operation, 'Test operation')).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(3);
    });

    test('должен использовать экспоненциальную задержку', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValue('success');

      await lifecycleManager.retryOperation(operation, 'Test operation');

      expect(mockSharedUtils.wait).toHaveBeenNthCalledWith(1, 1000);
      expect(mockSharedUtils.wait).toHaveBeenNthCalledWith(2, 2000);
    });
  });

  describe('enablePlugin', () => {
    test('должен успешно включать плагин', async () => {
      const plugin = {
        name: 'TestPlugin',
        isInstalled: true,
        isEnabled: false,
        enable: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const result = await lifecycleManager.enablePlugin('TestPlugin');

      expect(result).toBe(true);
      expect(plugin.enable).toHaveBeenCalled();
      expect(plugin.isEnabled).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Плагин TestPlugin включен');
    });

    test('должен выбрасывать ошибку для несуществующего плагина', async () => {
      await expect(lifecycleManager.enablePlugin('NonExistentPlugin')).rejects.toThrow('Плагин NonExistentPlugin не найден');
    });

    test('должен выбрасывать ошибку для неустановленного плагина', async () => {
      const plugin = {
        name: 'TestPlugin',
        isInstalled: false,
      };
      mockPlugins.set('TestPlugin', plugin);

      await expect(lifecycleManager.enablePlugin('TestPlugin')).rejects.toThrow('Плагин TestPlugin не установлен');
    });

    test('должен возвращать false для уже включенного плагина', async () => {
      const plugin = {
        name: 'TestPlugin',
        isInstalled: true,
        isEnabled: true,
      };
      mockPlugins.set('TestPlugin', plugin);

      const result = await lifecycleManager.enablePlugin('TestPlugin');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Плагин TestPlugin уже включен');
    });

    test('должен выполнять хуки beforeEnable и afterEnable', async () => {
      const plugin = {
        name: 'TestPlugin',
        isInstalled: true,
        isEnabled: false,
        enable: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const beforeEnableHook = jest.fn().mockResolvedValue();
      const afterEnableHook = jest.fn().mockResolvedValue();
      mockHooks.set('beforeEnable', [{ pluginName: 'TestPlugin', handler: beforeEnableHook }]);
      mockHooks.set('afterEnable', [{ pluginName: 'TestPlugin', handler: afterEnableHook }]);

      const result = await lifecycleManager.enablePlugin('TestPlugin');

      expect(result).toBe(true);
      expect(beforeEnableHook).toHaveBeenCalled();
      expect(afterEnableHook).toHaveBeenCalled();
    });

    test('должен обрабатывать ошибки при включении плагина', async () => {
      const plugin = {
        name: 'TestPlugin',
        isInstalled: true,
        isEnabled: false,
        enable: jest.fn().mockRejectedValue(new Error('Enable failed')),
      };
      mockPlugins.set('TestPlugin', plugin);

      await expect(lifecycleManager.enablePlugin('TestPlugin')).rejects.toThrow('Enable failed');

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
        context: 'PluginLifecycleManager.enablePlugin',
        pluginName: 'TestPlugin',
      });
    });
  });

  describe('disablePlugin', () => {
    test('должен успешно отключать плагин', async () => {
      const plugin = {
        name: 'TestPlugin',
        isEnabled: true,
        disable: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const result = await lifecycleManager.disablePlugin('TestPlugin');

      expect(result).toBe(true);
      expect(plugin.disable).toHaveBeenCalled();
      expect(plugin.isEnabled).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Плагин TestPlugin отключен');
    });

    test('должен выбрасывать ошибку для несуществующего плагина', async () => {
      await expect(lifecycleManager.disablePlugin('NonExistentPlugin')).rejects.toThrow('Плагин NonExistentPlugin не найден');
    });

    test('должен возвращать false для уже отключенного плагина', async () => {
      const plugin = {
        name: 'TestPlugin',
        isEnabled: false,
      };
      mockPlugins.set('TestPlugin', plugin);

      const result = await lifecycleManager.disablePlugin('TestPlugin');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Плагин TestPlugin уже отключен');
    });

    test('должен выполнять хуки beforeDisable и afterDisable', async () => {
      const plugin = {
        name: 'TestPlugin',
        isEnabled: true,
        disable: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const beforeDisableHook = jest.fn().mockResolvedValue();
      const afterDisableHook = jest.fn().mockResolvedValue();
      mockHooks.set('beforeDisable', [{ pluginName: 'TestPlugin', handler: beforeDisableHook }]);
      mockHooks.set('afterDisable', [{ pluginName: 'TestPlugin', handler: afterDisableHook }]);

      const result = await lifecycleManager.disablePlugin('TestPlugin');

      expect(result).toBe(true);
      expect(beforeDisableHook).toHaveBeenCalled();
      expect(afterDisableHook).toHaveBeenCalled();
    });

    test('должен обрабатывать ошибки при отключении плагина', async () => {
      const plugin = {
        name: 'TestPlugin',
        isEnabled: true,
        disable: jest.fn().mockRejectedValue(new Error('Disable failed')),
      };
      mockPlugins.set('TestPlugin', plugin);

      await expect(lifecycleManager.disablePlugin('TestPlugin')).rejects.toThrow('Disable failed');

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
        context: 'PluginLifecycleManager.disablePlugin',
        pluginName: 'TestPlugin',
      });
    });
  });

  describe('uninstallPlugin', () => {
    test('должен успешно удалять плагин', async () => {
      const plugin = {
        name: 'TestPlugin',
        isEnabled: false,
        uninstall: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const result = await lifecycleManager.uninstallPlugin('TestPlugin');

      expect(result).toBe(true);
      expect(plugin.uninstall).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Плагин TestPlugin удален');
    });

    test('должен выбрасывать ошибку для несуществующего плагина', async () => {
      await expect(lifecycleManager.uninstallPlugin('NonExistentPlugin')).rejects.toThrow('Плагин NonExistentPlugin не найден');
    });

    test('должен отключать плагин перед удалением', async () => {
      const plugin = {
        name: 'TestPlugin',
        isEnabled: true,
        disable: jest.fn().mockResolvedValue(true),
        uninstall: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const result = await lifecycleManager.uninstallPlugin('TestPlugin');

      expect(result).toBe(true);
      expect(plugin.disable).toHaveBeenCalled();
      expect(plugin.uninstall).toHaveBeenCalled();
    });

    test('должен выполнять хуки beforeUninstall и afterUninstall', async () => {
      const plugin = {
        name: 'TestPlugin',
        isEnabled: false,
        uninstall: jest.fn().mockResolvedValue(true),
      };
      mockPlugins.set('TestPlugin', plugin);

      const beforeUninstallHook = jest.fn().mockResolvedValue();
      const afterUninstallHook = jest.fn().mockResolvedValue();
      mockHooks.set('beforeUninstall', [{ pluginName: 'TestPlugin', handler: beforeUninstallHook }]);
      mockHooks.set('afterUninstall', [{ pluginName: 'TestPlugin', handler: afterUninstallHook }]);

      const result = await lifecycleManager.uninstallPlugin('TestPlugin');

      expect(result).toBe(true);
      expect(beforeUninstallHook).toHaveBeenCalled();
      expect(afterUninstallHook).toHaveBeenCalled();
    });

    test('должен обрабатывать ошибки при удалении плагина', async () => {
      const plugin = {
        name: 'TestPlugin',
        isEnabled: false,
        uninstall: jest.fn().mockRejectedValue(new Error('Uninstall failed')),
      };
      mockPlugins.set('TestPlugin', plugin);

      await expect(lifecycleManager.uninstallPlugin('TestPlugin')).rejects.toThrow('Uninstall failed');

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), {
        context: 'PluginLifecycleManager.uninstallPlugin',
        pluginName: 'TestPlugin',
      });
    });
  });
});
