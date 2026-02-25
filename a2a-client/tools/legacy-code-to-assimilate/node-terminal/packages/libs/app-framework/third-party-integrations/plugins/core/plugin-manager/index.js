/**
 * Plugin Manager
 * Менеджер плагинов для интеграции сторонних сервисов
 */

const fs = require('fs').promises;
const path = require('path');

class Plugin {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.enabled = false;
    this.loaded = false;
    this.dependencies = config.dependencies || [];
  }

  async load() {
    // Имитация загрузки плагина
    this.loaded = true;
    return { success: true };
  }

  async enable() {
    if (!this.loaded) {
      throw new Error(`Plugin ${this.name} is not loaded`);
    }
    this.enabled = true;
    return { success: true };
  }

  async disable() {
    this.enabled = false;
    return { success: true };
  }

  getStatus() {
    return {
      name: this.name,
      enabled: this.enabled,
      loaded: this.loaded,
      config: this.config
    };
  }
}

class PluginManager {
  constructor(options = {}) {
    this.options = options;
    this.pluginsDir = options.pluginsDir || path.join(process.cwd(), 'plugins');
    this.plugins = new Map();
    this.loadedPlugins = new Set();
    this.enabledPlugins = new Set();
  }

  /**
   * Регистрация плагина
   */
  registerPlugin(name, config = {}) {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin ${name} is already registered`);
    }

    const plugin = new Plugin(name, config);
    this.plugins.set(name, plugin);

    return plugin;
  }

  /**
   * Загрузка плагина
   */
  async loadPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    if (plugin.loaded) {
      return { success: true, message: 'Plugin already loaded' };
    }

    try {
      const result = await plugin.load();
      this.loadedPlugins.add(name);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Включение плагина
   */
  async enablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    if (!plugin.loaded) {
      throw new Error(`Plugin ${name} is not loaded`);
    }

    if (plugin.enabled) {
      return { success: true, message: 'Plugin already enabled' };
    }

    try {
      const result = await plugin.enable();
      this.enabledPlugins.add(name);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Отключение плагина
   */
  async disablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    try {
      const result = await plugin.disable();
      this.enabledPlugins.delete(name);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Получение списка плагинов
   */
  getPluginsList() {
    const plugins = [];
    for (const [name, plugin] of this.plugins) {
      plugins.push(plugin.getStatus());
    }
    return plugins;
  }

  /**
   * Получение плагина по имени
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }

  /**
   * Проверка зависимостей плагина
   */
  checkDependencies(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return { valid: false, error: 'Plugin not found' };
    }

    const missingDeps = [];
    for (const dep of plugin.dependencies) {
      if (!this.plugins.has(dep) || !this.plugins.get(dep).enabled) {
        missingDeps.push(dep);
      }
    }

    return {
      valid: missingDeps.length === 0,
      missing: missingDeps
    };
  }

  /**
   * Загрузка плагинов из директории
   */
  async loadPluginsFromDirectory() {
    try {
      const files = await fs.readdir(this.pluginsDir);
      const pluginFiles = files.filter(file =>
        file.endsWith('.js') && file !== 'index.js'
      );

      const results = [];
      for (const file of pluginFiles) {
        try {
          const pluginPath = path.join(this.pluginsDir, file);
          const pluginModule = require(pluginPath);

          if (pluginModule && pluginModule.Plugin) {
            const pluginName = path.basename(file, '.js');
            this.registerPlugin(pluginName, pluginModule.config || {});
            results.push({ success: true, plugin: pluginName });
          }
        } catch (error) {
          results.push({ success: false, plugin: file, error: error.message });
        }
      }

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export { PluginManager, Plugin };
