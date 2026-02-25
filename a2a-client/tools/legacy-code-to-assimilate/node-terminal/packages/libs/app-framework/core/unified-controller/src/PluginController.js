/**
 * Контроллер плагинов
 * Управляет жизненным циклом плагинов и их состоянием
 */

import { PluginSector } from './PluginManager.js';
import PluginLoader from './PluginLoader.js';

// Ленивая загрузка pluginManager для избежания циклических зависимостей
let pluginManagerInstance = null;
async function getPluginManager() {
  if (!pluginManagerInstance) {
    const { pluginManager } = await import('./PluginManager.js');
    pluginManagerInstance = pluginManager;
  }
  return pluginManagerInstance;
}

class PluginController {
  constructor() {
    this.app = null;
    this.pluginLoader = new PluginLoader();
  }

  /**
   * Инициализация контроллера с экземпляром приложения
   * @param {Object} app
   */
  init(app) {
    this.app = app;
  }

  /**
   * Список всех плагинов с состояниями
   */
  async listPlugins() {
    const loaded = await this.pluginLoader.getLoadedPlugins();
    const pluginManager = await getPluginManager();
    const all = pluginManager.getAllPlugins();

    const byName = new Map();
    loaded.forEach(p => byName.set(p.name, p));

    return all.map(p => ({
      name: p.name,
      version: p.version,
      status: pluginManager.getPluginStatus(p.name),
      installedAt: p.installedAt,
      enabled: Boolean(this.pluginLoader.getPluginConfig(p.name)?.enabled),
      sector: pluginManager.getPluginSector(p.name)
    }));
  }

  /**
   * Получить конфигурацию плагина
   */
  getConfig(pluginName) {
    return this.pluginLoader.getPluginConfig(pluginName);
  }

  /**
   * Обновить конфигурацию плагина (в памяти)
   */
  updateConfig(pluginName, partialConfig) {
    this.pluginLoader.updatePluginConfig(pluginName, partialConfig);
  }

  /**
   * Включить плагин (с загрузкой и установкой)
   */
  async enable(pluginName) {
    if (!this.app) throw new Error('PluginController не инициализирован');
    await this.pluginLoader.setPluginEnabled(pluginName, true, this.app);
  }

  /**
   * Отключить плагин (с удалением)
   */
  async disable(pluginName) {
    if (!this.app) throw new Error('PluginController не инициализирован');
    await this.pluginLoader.setPluginEnabled(pluginName, false, this.app);
  }

  /**
   * Установить плагин (если загружен)
   */
  async install(pluginName) {
    if (!this.app) throw new Error('PluginController не инициализирован');
    await this.pluginLoader.installPlugin(pluginName, this.app);
  }

  /**
   * Удалить плагин (если установлен)
   */
  async uninstall(pluginName) {
    if (!this.app) throw new Error('PluginController не инициализирован');
    await this.pluginLoader.uninstallPlugin(pluginName, this.app);
  }

  /**
   * Перезагрузить плагин
   */
  async reload(pluginName) {
    if (!this.app) throw new Error('PluginController не инициализирован');
    await this.pluginLoader.reloadPlugin(pluginName, this.app);
  }

  /**
   * Текущий статус плагина
   */
  async getStatus(pluginName) {
    const pluginManager = await getPluginManager();
    return pluginManager.getPluginStatus(pluginName);
  }
}

export const pluginController = new PluginController();
export default PluginController;
