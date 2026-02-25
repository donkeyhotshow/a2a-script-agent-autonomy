import PluginLoader from '../../src/PluginLoader.js';

// Моки для console.error
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('PluginLoader', () => {
  let pluginLoader;

  beforeEach(() => {
    jest.clearAllMocks();
    pluginLoader = new PluginLoader();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('should initialize with empty maps and false initialization state', () => {
    expect(pluginLoader.loadedPlugins).toEqual(new Map());
    expect(pluginLoader.pluginConfigs).toEqual(new Map());
    expect(pluginLoader.isInitialized).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[critical] PluginLoader инициализирован'));
  });

  describe('loadPluginConfigs', () => {
    test('should load default configuration when file import fails', async () => {
      // Мокируем динамический импорт для возврата ошибки
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('File not found'));

      await pluginLoader.loadPluginConfigs();

      expect(pluginLoader.pluginConfigs.size).toBeGreaterThan(0);
      expect(pluginLoader.pluginConfigs.has('core')).toBe(true);
      expect(pluginLoader.pluginConfigs.has('config')).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Не удалось импортировать plugin-config.json'));

      global.import = originalImport;
    });

    test('should load configuration from file when available', async () => {
      const mockConfig = {
        plugins: {
          testPlugin: {
            enabled: true,
            autoInstall: true,
            dependencies: ['core']
          }
        }
      };

      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue(mockConfig);

      await pluginLoader.loadPluginConfigs();

      expect(pluginLoader.pluginConfigs.has('testPlugin')).toBe(true);
      expect(pluginLoader.pluginConfigs.get('testPlugin')).toEqual({
        name: 'testPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: ['core'],
        ...mockConfig.plugins.testPlugin
      });

      global.import = originalImport;
    });

    test('should handle errors during configuration loading', async () => {
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('Critical error'));

      await expect(pluginLoader.loadPluginConfigs()).rejects.toThrow('Critical error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка загрузки конфигурации плагинов'));

      global.import = originalImport;
    });
  });

  describe('loadPlugin', () => {
    beforeEach(async () => {
      // Загружаем конфигурацию для тестов
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('File not found'));
      await pluginLoader.loadPluginConfigs();
      global.import = originalImport;
    });

    test('should throw error for non-existent plugin configuration', async () => {
      await expect(pluginLoader.loadPlugin('nonExistentPlugin')).rejects.toThrow('Конфигурация плагина nonExistentPlugin не найдена');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Конфигурация плагина nonExistentPlugin не найдена'));
    });

    test('should return null for disabled plugin', async () => {
      // Отключаем плагин в конфигурации
      pluginLoader.pluginConfigs.set('disabledPlugin', {
        name: 'disabledPlugin',
        enabled: false,
        autoLoad: true,
        dependencies: []
      });

      const result = await pluginLoader.loadPlugin('disabledPlugin');
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин disabledPlugin отключен в конфигурации'));
    });

    test('should throw error for missing dependencies', async () => {
      pluginLoader.pluginConfigs.set('dependentPlugin', {
        name: 'dependentPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: ['missingDep']
      });

      await expect(pluginLoader.loadPlugin('dependentPlugin')).rejects.toThrow('Зависимость missingDep не загружена');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Зависимость missingDep не загружена для плагина dependentPlugin'));
    });

    test('should load plugin successfully when dependencies are met', async () => {
      // Создаем зависимость
      pluginLoader.loadedPlugins.set('core', { name: 'core', version: '1.0.0' });

      pluginLoader.pluginConfigs.set('testPlugin', {
        name: 'testPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: ['core']
      });

      const mockPlugin = {
        name: 'testPlugin',
        version: '1.0.0',
        hooks: { onInit: jest.fn() }
      };

      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockPlugin });

      const result = await pluginLoader.loadPlugin('testPlugin');

      expect(result).toEqual({
        ...mockPlugin,
        name: 'testPlugin',
        config: pluginLoader.pluginConfigs.get('testPlugin'),
        loadedAt: expect.any(String)
      });
      expect(pluginLoader.loadedPlugins.has('testPlugin')).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин testPlugin загружен успешно'));

      global.import = originalImport;
    });

    test('should handle plugin import errors', async () => {
      pluginLoader.pluginConfigs.set('errorPlugin', {
        name: 'errorPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });

      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('Import failed'));

      await expect(pluginLoader.loadPlugin('errorPlugin')).rejects.toThrow('Import failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка импорта модуля плагина errorPlugin'));

      global.import = originalImport;
    });

    test('should handle plugin without default export', async () => {
      pluginLoader.pluginConfigs.set('noDefaultPlugin', {
        name: 'noDefaultPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });

      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({}); // Нет default экспорта

      await expect(pluginLoader.loadPlugin('noDefaultPlugin')).rejects.toThrow('Плагин noDefaultPlugin не экспортирован');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин noDefaultPlugin не экспортирован из модуля'));

      global.import = originalImport;
    });
  });

  describe('autoLoadPlugins', () => {
    beforeEach(async () => {
      // Загружаем конфигурацию для тестов
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('File not found'));
      await pluginLoader.loadPluginConfigs();
      global.import = originalImport;
    });

    test('should load plugins with autoLoad enabled', async () => {
      // Настраиваем плагины для автозагрузки
      pluginLoader.pluginConfigs.set('autoPlugin1', {
        name: 'autoPlugin1',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });

      pluginLoader.pluginConfigs.set('autoPlugin2', {
        name: 'autoPlugin2',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });

      pluginLoader.pluginConfigs.set('manualPlugin', {
        name: 'manualPlugin',
        enabled: true,
        autoLoad: false,
        dependencies: []
      });

      const mockPlugin = { name: 'test', version: '1.0.0' };
      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockPlugin });

      await pluginLoader.autoLoadPlugins();

      expect(pluginLoader.loadedPlugins.has('autoPlugin1')).toBe(true);
      expect(pluginLoader.loadedPlugins.has('autoPlugin2')).toBe(true);
      expect(pluginLoader.loadedPlugins.has('manualPlugin')).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Автозагрузка завершена'));

      global.import = originalImport;
    });

    test('should handle errors during auto-loading gracefully', async () => {
      pluginLoader.pluginConfigs.set('errorPlugin', {
        name: 'errorPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });

      pluginLoader.pluginConfigs.set('successPlugin', {
        name: 'successPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });

      const mockPlugin = { name: 'test', version: '1.0.0' };
      const originalImport = global.import;
      global.import = jest.fn()
        .mockRejectedValueOnce(new Error('Error plugin failed'))
        .mockResolvedValueOnce({ default: mockPlugin });

      await pluginLoader.autoLoadPlugins();

      expect(pluginLoader.loadedPlugins.has('errorPlugin')).toBe(false);
      expect(pluginLoader.loadedPlugins.has('successPlugin')).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка автозагрузки плагина errorPlugin'));

      global.import = originalImport;
    });
  });

  describe('getLoadedPlugin', () => {
    test('should return loaded plugin', () => {
      const mockPlugin = { name: 'test', version: '1.0.0' };
      pluginLoader.loadedPlugins.set('testPlugin', mockPlugin);

      const result = pluginLoader.getLoadedPlugin('testPlugin');
      expect(result).toBe(mockPlugin);
    });

    test('should return undefined for non-loaded plugin', () => {
      const result = pluginLoader.getLoadedPlugin('nonExistentPlugin');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllLoadedPlugins', () => {
    test('should return all loaded plugins', () => {
      const plugin1 = { name: 'plugin1', version: '1.0.0' };
      const plugin2 = { name: 'plugin2', version: '2.0.0' };
      pluginLoader.loadedPlugins.set('plugin1', plugin1);
      pluginLoader.loadedPlugins.set('plugin2', plugin2);

      const result = pluginLoader.getAllLoadedPlugins();
      expect(result).toEqual([plugin1, plugin2]);
    });

    test('should return empty array when no plugins loaded', () => {
      const result = pluginLoader.getAllLoadedPlugins();
      expect(result).toEqual([]);
    });
  });

  describe('getPluginConfig', () => {
    test('should return plugin configuration', () => {
      const config = { name: 'test', enabled: true };
      pluginLoader.pluginConfigs.set('testPlugin', config);

      const result = pluginLoader.getPluginConfig('testPlugin');
      expect(result).toBe(config);
    });

    test('should return undefined for non-existent plugin config', () => {
      const result = pluginLoader.getPluginConfig('nonExistentPlugin');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllPluginConfigs', () => {
    test('should return all plugin configurations', () => {
      const config1 = { name: 'plugin1', enabled: true };
      const config2 = { name: 'plugin2', enabled: false };
      pluginLoader.pluginConfigs.set('plugin1', config1);
      pluginLoader.pluginConfigs.set('plugin2', config2);

      const result = pluginLoader.getAllPluginConfigs();
      expect(result).toEqual([config1, config2]);
    });
  });

  describe('isPluginLoaded', () => {
    test('should return true for loaded plugin', () => {
      pluginLoader.loadedPlugins.set('testPlugin', { name: 'test' });
      expect(pluginLoader.isPluginLoaded('testPlugin')).toBe(true);
    });

    test('should return false for non-loaded plugin', () => {
      expect(pluginLoader.isPluginLoaded('nonExistentPlugin')).toBe(false);
    });
  });

  describe('getAllPluginNames', () => {
    test('should return all plugin names', () => {
      pluginLoader.pluginConfigs.set('plugin1', { name: 'plugin1' });
      pluginLoader.pluginConfigs.set('plugin2', { name: 'plugin2' });

      const result = pluginLoader.getAllPluginNames();
      expect(result).toEqual(['plugin1', 'plugin2']);
    });
  });

  describe('setPluginEnabled', () => {
    beforeEach(async () => {
      // Загружаем конфигурацию для тестов
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('File not found'));
      await pluginLoader.loadPluginConfigs();
      global.import = originalImport;
    });

    test('should enable plugin and load it if not loaded', async () => {
      pluginLoader.pluginConfigs.set('testPlugin', {
        name: 'testPlugin',
        enabled: false,
        autoLoad: true,
        dependencies: []
      });

      const mockPlugin = { name: 'test', version: '1.0.0' };
      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockPlugin });

      await pluginLoader.setPluginEnabled('testPlugin', true);

      expect(pluginLoader.pluginConfigs.get('testPlugin').enabled).toBe(true);
      expect(pluginLoader.loadedPlugins.has('testPlugin')).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин testPlugin загружен после включения'));

      global.import = originalImport;
    });

    test('should disable plugin and remove it from loaded plugins', async () => {
      pluginLoader.pluginConfigs.set('testPlugin', {
        name: 'testPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });
      pluginLoader.loadedPlugins.set('testPlugin', { name: 'test' });

      await pluginLoader.setPluginEnabled('testPlugin', false);

      expect(pluginLoader.pluginConfigs.get('testPlugin').enabled).toBe(false);
      expect(pluginLoader.loadedPlugins.has('testPlugin')).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин testPlugin удален из загруженных'));
    });

    test('should throw error for non-existent plugin configuration', async () => {
      await expect(pluginLoader.setPluginEnabled('nonExistentPlugin', true)).rejects.toThrow('Конфигурация плагина nonExistentPlugin не найдена');
    });
  });

  describe('reloadPlugin', () => {
    beforeEach(async () => {
      // Загружаем конфигурацию для тестов
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('File not found'));
      await pluginLoader.loadPluginConfigs();
      global.import = originalImport;
    });

    test('should reload plugin successfully', async () => {
      pluginLoader.pluginConfigs.set('testPlugin', {
        name: 'testPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });
      pluginLoader.loadedPlugins.set('testPlugin', { name: 'old' });

      const mockPlugin = { name: 'new', version: '2.0.0' };
      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockPlugin });

      await pluginLoader.reloadPlugin('testPlugin');

      const reloadedPlugin = pluginLoader.loadedPlugins.get('testPlugin');
      expect(reloadedPlugin.name).toBe('new');
      expect(reloadedPlugin.version).toBe('2.0.0');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Плагин testPlugin перезагружен успешно'));

      global.import = originalImport;
    });

    test('should handle reload errors', async () => {
      pluginLoader.pluginConfigs.set('errorPlugin', {
        name: 'errorPlugin',
        enabled: true,
        autoLoad: true,
        dependencies: []
      });

      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('Reload failed'));

      await expect(pluginLoader.reloadPlugin('errorPlugin')).rejects.toThrow('Reload failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Ошибка перезагрузки плагина errorPlugin'));

      global.import = originalImport;
    });
  });

  describe('initialize', () => {
    test('should initialize successfully', async () => {
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('File not found'));

      await pluginLoader.initialize();

      expect(pluginLoader.isInitialized).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('PluginLoader инициализирован успешно'));

      global.import = originalImport;
    });

    test('should not initialize if already initialized', async () => {
      pluginLoader.isInitialized = true;

      await pluginLoader.initialize();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('PluginLoader уже инициализирован'));
    });

    test('should handle initialization errors', async () => {
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('Critical initialization error'));

      await expect(pluginLoader.initialize()).rejects.toThrow('Critical initialization error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Критическая ошибка инициализации PluginLoader'));

      global.import = originalImport;
    });
  });

  describe('updatePluginConfig', () => {
    test('should update plugin configuration', () => {
      const config = { name: 'test', enabled: true };
      pluginLoader.pluginConfigs.set('testPlugin', config);

      pluginLoader.updatePluginConfig('testPlugin', { enabled: false, newProp: 'value' });

      const updatedConfig = pluginLoader.pluginConfigs.get('testPlugin');
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.newProp).toBe('value');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Конфигурация плагина testPlugin обновлена'));
    });

    test('should throw error for non-existent plugin configuration', () => {
      expect(() => pluginLoader.updatePluginConfig('nonExistentPlugin', { enabled: false })).toThrow('Конфигурация плагина nonExistentPlugin не найдена');
    });
  });

  describe('cleanup', () => {
    test('should cleanup successfully', async () => {
      pluginLoader.loadedPlugins.set('plugin1', { name: 'plugin1' });
      pluginLoader.pluginConfigs.set('plugin1', { name: 'plugin1' });
      pluginLoader.isInitialized = true;

      await pluginLoader.cleanup();

      expect(pluginLoader.loadedPlugins.size).toBe(0);
      expect(pluginLoader.pluginConfigs.size).toBe(0);
      expect(pluginLoader.isInitialized).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('PluginLoader очищен успешно'));
    });
  });
});