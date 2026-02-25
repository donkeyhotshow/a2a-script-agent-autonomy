import PluginController, { pluginController } from '../../src/PluginController.js';
import PluginLoader from '../../src/PluginLoader.js';

jest.mock('../../src/PluginManager.js', () => ({
  PluginSector: jest.fn(),
  pluginManager: {
    getAllPlugins: jest.fn(),
    getPluginStatus: jest.fn(),
    getPluginSector: jest.fn(),
  },
}));

// Моки для PluginLoader
jest.mock('../../src/PluginLoader.js', () => {
  return jest.fn().mockImplementation(() => ({
    getLoadedPlugins: jest.fn(),
    getPluginConfig: jest.fn(),
    updatePluginConfig: jest.fn(),
    setPluginEnabled: jest.fn(),
    installPlugin: jest.fn(),
    uninstallPlugin: jest.fn(),
    reloadPlugin: jest.fn(),
  }));
});

describe('PluginController', () => {
  let controller;
  let mockPluginLoader;
  let mockPluginManager;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PluginController();
    mockPluginLoader = controller.pluginLoader;
    
    // Получаем мок из импортированного модуля
    const { pluginManager } = require('../../src/PluginManager.js');
    mockPluginManager = pluginManager;
  });

  test('should initialize with null app and PluginLoader instance', () => {
    expect(controller.app).toBeNull();
    expect(controller.pluginLoader).toBeDefined();
    expect(typeof controller.pluginLoader).toBe('object');
  });

  describe('init', () => {
    test('should initialize with app instance', () => {
      const mockApp = { name: 'test-app' };
      controller.init(mockApp);
      expect(controller.app).toBe(mockApp);
    });
  });

  describe('listPlugins', () => {
    beforeEach(() => {
      controller.init({ name: 'test-app' });
    });

    test('should return list of plugins with states', async () => {
      const mockLoadedPlugins = [
        { name: 'plugin1', version: '1.0.0', installedAt: '2023-01-01' },
        { name: 'plugin2', version: '2.0.0', installedAt: '2023-01-02' }
      ];
      const mockAllPlugins = [
        { name: 'plugin1', version: '1.0.0' },
        { name: 'plugin2', version: '2.0.0' },
        { name: 'plugin3', version: '3.0.0' }
      ];

      mockPluginLoader.getLoadedPlugins.mockResolvedValue(mockLoadedPlugins);
      mockPluginManager.getAllPlugins.mockReturnValue(mockAllPlugins);
      mockPluginManager.getPluginStatus.mockImplementation((name) => {
        const statusMap = { plugin1: 'installed', plugin2: 'installed', plugin3: 'not_installed' };
        return statusMap[name] || 'unknown';
      });
      mockPluginManager.getPluginSector.mockImplementation((name) => {
        const sectorMap = { plugin1: 'core', plugin2: 'ui', plugin3: 'utils' };
        return sectorMap[name] || 'unknown';
      });
      mockPluginLoader.getPluginConfig.mockImplementation((name) => {
        const configMap = {
          plugin1: { enabled: true },
          plugin2: { enabled: false },
          plugin3: { enabled: true }
        };
        return configMap[name] || null;
      });

      const result = await controller.listPlugins();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'plugin1',
        version: '1.0.0',
        status: 'installed',
        installedAt: '2023-01-01',
        enabled: true,
        sector: 'core'
      });
      expect(result[1]).toEqual({
        name: 'plugin2',
        version: '2.0.0',
        status: 'installed',
        installedAt: '2023-01-02',
        enabled: false,
        sector: 'ui'
      });
      expect(result[2]).toEqual({
        name: 'plugin3',
        version: '3.0.0',
        status: 'not_installed',
        installedAt: undefined,
        enabled: true,
        sector: 'utils'
      });
    });

    test('should handle empty plugin lists', async () => {
      mockPluginLoader.getLoadedPlugins.mockResolvedValue([]);
      mockPluginManager.getAllPlugins.mockReturnValue([]);

      const result = await controller.listPlugins();

      expect(result).toEqual([]);
    });
  });

  describe('getConfig', () => {
    test('should return plugin configuration', () => {
      const mockConfig = { enabled: true, autoLoad: false };
      mockPluginLoader.getPluginConfig.mockReturnValue(mockConfig);

      const result = controller.getConfig('testPlugin');

      expect(result).toBe(mockConfig);
      expect(mockPluginLoader.getPluginConfig).toHaveBeenCalledWith('testPlugin');
    });

    test('should return null for non-existent plugin', () => {
      mockPluginLoader.getPluginConfig.mockReturnValue(null);

      const result = controller.getConfig('nonExistentPlugin');

      expect(result).toBeNull();
    });
  });

  describe('updateConfig', () => {
    test('should update plugin configuration', () => {
      const partialConfig = { enabled: false, newProp: 'value' };

      controller.updateConfig('testPlugin', partialConfig);

      expect(mockPluginLoader.updatePluginConfig).toHaveBeenCalledWith('testPlugin', partialConfig);
    });
  });

  describe('enable', () => {
    test('should enable plugin successfully', async () => {
      controller.init({ name: 'test-app' });

      await controller.enable('testPlugin');

      expect(mockPluginLoader.setPluginEnabled).toHaveBeenCalledWith('testPlugin', true, { name: 'test-app' });
    });

    test('should throw error if not initialized', async () => {
      await expect(controller.enable('testPlugin')).rejects.toThrow('PluginController не инициализирован');
    });
  });

  describe('disable', () => {
    test('should disable plugin successfully', async () => {
      controller.init({ name: 'test-app' });

      await controller.disable('testPlugin');

      expect(mockPluginLoader.setPluginEnabled).toHaveBeenCalledWith('testPlugin', false, { name: 'test-app' });
    });

    test('should throw error if not initialized', async () => {
      await expect(controller.disable('testPlugin')).rejects.toThrow('PluginController не инициализирован');
    });
  });

  describe('install', () => {
    test('should install plugin successfully', async () => {
      controller.init({ name: 'test-app' });

      await controller.install('testPlugin');

      expect(mockPluginLoader.installPlugin).toHaveBeenCalledWith('testPlugin', { name: 'test-app' });
    });

    test('should throw error if not initialized', async () => {
      await expect(controller.install('testPlugin')).rejects.toThrow('PluginController не инициализирован');
    });
  });

  describe('uninstall', () => {
    test('should uninstall plugin successfully', async () => {
      controller.init({ name: 'test-app' });

      await controller.uninstall('testPlugin');

      expect(mockPluginLoader.uninstallPlugin).toHaveBeenCalledWith('testPlugin', { name: 'test-app' });
    });

    test('should throw error if not initialized', async () => {
      await expect(controller.uninstall('testPlugin')).rejects.toThrow('PluginController не инициализирован');
    });
  });

  describe('reload', () => {
    test('should reload plugin successfully', async () => {
      controller.init({ name: 'test-app' });

      await controller.reload('testPlugin');

      expect(mockPluginLoader.reloadPlugin).toHaveBeenCalledWith('testPlugin', { name: 'test-app' });
    });

    test('should throw error if not initialized', async () => {
      await expect(controller.reload('testPlugin')).rejects.toThrow('PluginController не инициализирован');
    });
  });

  describe('getStatus', () => {
    test('should return plugin status', async () => {
      mockPluginManager.getPluginStatus.mockReturnValue('installed');

      const result = await controller.getStatus('testPlugin');

      expect(result).toBe('installed');
      expect(mockPluginManager.getPluginStatus).toHaveBeenCalledWith('testPlugin');
    });

    test('should return unknown status for non-existent plugin', async () => {
      mockPluginManager.getPluginStatus.mockReturnValue('unknown');

      const result = await controller.getStatus('nonExistentPlugin');

      expect(result).toBe('unknown');
    });
  });

  describe('Singleton instance', () => {
    test('should export singleton instance', () => {
      expect(pluginController).toBeInstanceOf(PluginController);
    });

    test('should be the same instance', () => {
      const controller1 = new PluginController();
      const controller2 = new PluginController();
      
      // Разные экземпляры при создании через new
      expect(controller1).not.toBe(controller2);
      
      // Но экспортируемый экземпляр должен быть синглтоном
      expect(pluginController).toBeInstanceOf(PluginController);
    });
  });

  describe('Error handling', () => {
    test('should handle plugin loader errors in listPlugins', async () => {
      controller.init({ name: 'test-app' });
      mockPluginLoader.getLoadedPlugins.mockRejectedValue(new Error('Loader error'));

      await expect(controller.listPlugins()).rejects.toThrow('Loader error');
    });

    test('should handle plugin manager errors in listPlugins', async () => {
      controller.init({ name: 'test-app' });
      mockPluginLoader.getLoadedPlugins.mockResolvedValue([]);
      mockPluginManager.getAllPlugins.mockImplementation(() => {
        throw new Error('Manager error');
      });

      await expect(controller.listPlugins()).rejects.toThrow('Manager error');
    });

    test('should handle plugin loader errors in enable', async () => {
      controller.init({ name: 'test-app' });
      mockPluginLoader.setPluginEnabled.mockRejectedValue(new Error('Enable error'));

      await expect(controller.enable('testPlugin')).rejects.toThrow('Enable error');
    });

    test('should handle plugin loader errors in disable', async () => {
      controller.init({ name: 'test-app' });
      mockPluginLoader.setPluginEnabled.mockRejectedValue(new Error('Disable error'));

      await expect(controller.disable('testPlugin')).rejects.toThrow('Disable error');
    });

    test('should handle plugin loader errors in install', async () => {
      controller.init({ name: 'test-app' });
      mockPluginLoader.installPlugin.mockRejectedValue(new Error('Install error'));

      await expect(controller.install('testPlugin')).rejects.toThrow('Install error');
    });

    test('should handle plugin loader errors in uninstall', async () => {
      controller.init({ name: 'test-app' });
      mockPluginLoader.uninstallPlugin.mockRejectedValue(new Error('Uninstall error'));

      await expect(controller.uninstall('testPlugin')).rejects.toThrow('Uninstall error');
    });

    test('should handle plugin loader errors in reload', async () => {
      controller.init({ name: 'test-app' });
      mockPluginLoader.reloadPlugin.mockRejectedValue(new Error('Reload error'));

      await expect(controller.reload('testPlugin')).rejects.toThrow('Reload error');
    });

    test('should handle plugin manager errors in getStatus', async () => {
      mockPluginManager.getPluginStatus.mockImplementation(() => {
        throw new Error('Status error');
      });

      await expect(controller.getStatus('testPlugin')).rejects.toThrow('Status error');
    });
  });

  describe('Edge cases', () => {
    test('should handle null app in init', () => {
      controller.init(null);
      expect(controller.app).toBeNull();
    });

    test('should handle undefined app in init', () => {
      controller.init(undefined);
      expect(controller.app).toBeUndefined();
    });

    test('should handle empty string plugin names', async () => {
      controller.init({ name: 'test-app' });
      mockPluginManager.getPluginStatus.mockReturnValue('unknown');

      const result = await controller.getStatus('');
      expect(result).toBe('unknown');
    });

    test('should handle special characters in plugin names', async () => {
      controller.init({ name: 'test-app' });
      mockPluginManager.getPluginStatus.mockReturnValue('unknown');

      const result = await controller.getStatus('plugin@#$%');
      expect(result).toBe('unknown');
    });
  });
});