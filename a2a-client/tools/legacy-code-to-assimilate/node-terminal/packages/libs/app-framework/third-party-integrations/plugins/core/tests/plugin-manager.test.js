const { PluginManager, Plugin } = require('../plugin-manager/index.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Plugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new Plugin('test-plugin', { version: '1.0.0' });
  });

  describe('constructor', () => {
    test('should initialize with name and config', () => {
      expect(plugin.name).toBe('test-plugin');
      expect(plugin.config).toEqual({ version: '1.0.0' });
      expect(plugin.enabled).toBe(false);
      expect(plugin.loaded).toBe(false);
      expect(plugin.dependencies).toEqual([]);
    });

    test('should handle dependencies in config', () => {
      const pluginWithDeps = new Plugin('dependent-plugin', {
        dependencies: ['core', 'utils']
      });
      expect(pluginWithDeps.dependencies).toEqual(['core', 'utils']);
    });
  });

  describe('load', () => {
    test('should load plugin successfully', async () => {
      const result = await plugin.load();
      expect(result.success).toBe(true);
      expect(plugin.loaded).toBe(true);
    });
  });

  describe('enable', () => {
    test('should enable loaded plugin', async () => {
      await plugin.load();
      const result = await plugin.enable();
      expect(result.success).toBe(true);
      expect(plugin.enabled).toBe(true);
    });

    test('should throw error when enabling not loaded plugin', async () => {
      await expect(plugin.enable()).rejects.toThrow('Plugin test-plugin is not loaded');
    });
  });

  describe('disable', () => {
    test('should disable plugin', async () => {
      await plugin.load();
      await plugin.enable();
      const result = await plugin.disable();
      expect(result.success).toBe(true);
      expect(plugin.enabled).toBe(false);
    });
  });

  describe('getStatus', () => {
    test('should return correct status', () => {
      const status = plugin.getStatus();
      expect(status).toEqual({
        name: 'test-plugin',
        enabled: false,
        loaded: false,
        config: { version: '1.0.0' }
      });
    });
  });
});

describe('PluginManager', () => {
  let manager;
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'plugins-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    manager = new PluginManager({
      pluginsDir: tempDir
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultManager = new PluginManager();
      expect(defaultManager.pluginsDir).toBeDefined();
      expect(defaultManager.plugins.size).toBe(0);
    });

    test('should initialize with custom options', () => {
      const customManager = new PluginManager({
        pluginsDir: '/custom/plugins'
      });
      expect(customManager.pluginsDir).toBe('/custom/plugins');
    });
  });

  describe('registerPlugin', () => {
    test('should register plugin successfully', () => {
      const plugin = manager.registerPlugin('test-plugin', { version: '1.0.0' });
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('test-plugin');
      expect(manager.plugins.has('test-plugin')).toBe(true);
    });

    test('should throw error when registering duplicate plugin', () => {
      manager.registerPlugin('test-plugin', { version: '1.0.0' });
      expect(() => {
        manager.registerPlugin('test-plugin', { version: '2.0.0' });
      }).toThrow('Plugin test-plugin is already registered');
    });
  });

  describe('loadPlugin', () => {
    test('should load registered plugin', async () => {
      manager.registerPlugin('test-plugin');
      const result = await manager.loadPlugin('test-plugin');
      expect(result.success).toBe(true);
      expect(manager.loadedPlugins.has('test-plugin')).toBe(true);
    });

    test('should throw error for non-existent plugin', async () => {
      await expect(manager.loadPlugin('non-existent')).rejects.toThrow('Plugin non-existent is not registered');
    });

    test('should handle already loaded plugin', async () => {
      manager.registerPlugin('test-plugin');
      await manager.loadPlugin('test-plugin');
      const result = await manager.loadPlugin('test-plugin');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Plugin already loaded');
    });
  });

  describe('enablePlugin', () => {
    test('should enable loaded plugin', async () => {
      manager.registerPlugin('test-plugin');
      await manager.loadPlugin('test-plugin');
      const result = await manager.enablePlugin('test-plugin');
      expect(result.success).toBe(true);
      expect(manager.enabledPlugins.has('test-plugin')).toBe(true);
    });

    test('should throw error for non-loaded plugin', async () => {
      manager.registerPlugin('test-plugin');
      await expect(manager.enablePlugin('test-plugin')).rejects.toThrow('Plugin test-plugin is not loaded');
    });

    test('should handle already enabled plugin', async () => {
      manager.registerPlugin('test-plugin');
      await manager.loadPlugin('test-plugin');
      await manager.enablePlugin('test-plugin');
      const result = await manager.enablePlugin('test-plugin');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Plugin already enabled');
    });
  });

  describe('disablePlugin', () => {
    test('should disable plugin', async () => {
      manager.registerPlugin('test-plugin');
      await manager.loadPlugin('test-plugin');
      await manager.enablePlugin('test-plugin');
      const result = await manager.disablePlugin('test-plugin');
      expect(result.success).toBe(true);
      expect(manager.enabledPlugins.has('test-plugin')).toBe(false);
    });

    test('should handle non-existent plugin', async () => {
      await expect(manager.disablePlugin('non-existent')).rejects.toThrow('Plugin non-existent is not registered');
    });
  });

  describe('getPluginsList', () => {
    test('should return empty list when no plugins', () => {
      const plugins = manager.getPluginsList();
      expect(plugins).toEqual([]);
    });

    test('should return list of registered plugins', () => {
      manager.registerPlugin('plugin1', { version: '1.0' });
      manager.registerPlugin('plugin2', { version: '2.0' });

      const plugins = manager.getPluginsList();
      expect(plugins.length).toBe(2);
      expect(plugins.map(p => p.name)).toEqual(['plugin1', 'plugin2']);
    });
  });

  describe('getPlugin', () => {
    test('should return registered plugin', () => {
      const plugin = manager.registerPlugin('test-plugin');
      const retrieved = manager.getPlugin('test-plugin');
      expect(retrieved).toBe(plugin);
    });

    test('should return undefined for non-existent plugin', () => {
      const plugin = manager.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('checkDependencies', () => {
    test('should return valid for plugin without dependencies', () => {
      manager.registerPlugin('test-plugin');
      const result = manager.checkDependencies('test-plugin');
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test('should detect missing dependencies', () => {
      manager.registerPlugin('dependent-plugin', {
        dependencies: ['missing-dep', 'another-missing']
      });
      const result = manager.checkDependencies('dependent-plugin');
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['missing-dep', 'another-missing']);
    });

    test('should validate satisfied dependencies', () => {
      manager.registerPlugin('core-plugin');
      manager.registerPlugin('dependent-plugin', {
        dependencies: ['core-plugin']
      });

      // Включаем зависимость
      const corePlugin = manager.getPlugin('core-plugin');
      corePlugin.enabled = true;

      const result = manager.checkDependencies('dependent-plugin');
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test('should return error for non-existent plugin', () => {
      const result = manager.checkDependencies('non-existent');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Plugin not found');
    });
  });

  describe('loadPluginsFromDirectory', () => {
    test('should handle empty directory', async () => {
      const result = await manager.loadPluginsFromDirectory();
      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    test('should handle non-existent directory', async () => {
      const badManager = new PluginManager({
        pluginsDir: '/nonexistent/directory'
      });
      const result = await badManager.loadPluginsFromDirectory();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('integration tests', () => {
    test('should handle complete plugin lifecycle', async () => {
      // Регистрация
      const plugin = manager.registerPlugin('integration-test', {
        version: '1.0.0',
        description: 'Integration test plugin'
      });
      expect(manager.plugins.size).toBe(1);

      // Загрузка
      const loadResult = await manager.loadPlugin('integration-test');
      expect(loadResult.success).toBe(true);
      expect(manager.loadedPlugins.size).toBe(1);

      // Включение
      const enableResult = await manager.enablePlugin('integration-test');
      expect(enableResult.success).toBe(true);
      expect(manager.enabledPlugins.size).toBe(1);

      // Проверка статуса
      const pluginsList = manager.getPluginsList();
      expect(pluginsList.length).toBe(1);
      expect(pluginsList[0].enabled).toBe(true);
      expect(pluginsList[0].loaded).toBe(true);

      // Отключение
      const disableResult = await manager.disablePlugin('integration-test');
      expect(disableResult.success).toBe(true);
      expect(manager.enabledPlugins.size).toBe(0);
    });
  });
});
