import { LoggingUtils } from '@libs/core/logging';
import { ErrorHandlingUtils } from '@libs/error-management/error-handler';
import { ConfigurationUtils } from '@libs/core/configuration'; // Используем новую утилиту конфигурации
import { SharedUtils } from '@libs/core/shared'; // Используем новую общую утилиту
import EventEmitter from 'eventemitter3';
import { PluginLifecycleManager } from './PluginLifecycleManager';

/**
 * Менеджер плагинов с улучшенной архитектурой
 * - Интеграция с core библиотеками
 * - Улучшенное управление жизненным циклом
 * - Обработка зависимостей
 * - Мониторинг состояния плагинов
 * - Graceful shutdown
 */
export class PluginManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Инициализация core библиотек
    this.logger = options.logger || new LoggingUtils();
    this.errorHandler = options.errorHandler || new ErrorHandlingUtils({ logger: this.logger });
    this.configManager = options.configManager || new ConfigurationUtils();
    
    // Основные компоненты
    this.plugins = new Map(); // name -> plugin
    this.hooks = new Map(); // hookName -> handlers[]
    this.dependencies = new Map(); // pluginName -> dependencies[]
    this.loadOrder = []; // Порядок загрузки плагинов
    
    // Конфигурация
    this.config = {
      enableAutoLoad: options.enableAutoLoad !== false,
      enableDependencyCheck: options.enableDependencyCheck !== false,
      enableLifecycleHooks: options.enableLifecycleHooks !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    
    // Lifecycle Manager
    this.lifecycleManager = new PluginLifecycleManager(this.plugins, this.dependencies, this.hooks, this.config, this.logger, this.errorHandler);

    // Состояние
    this.isInitialized = false;
    this.isShutdown = false;
    this.stats = {
      totalPlugins: 0,
      installedPlugins: 0,
      failedPlugins: 0,
      totalHooks: 0,
      totalDependencies: 0
    };
    
    this.logger.info('PluginManager инициализирован', { config: this.config });
  }

  /**
   * Инициализация менеджера плагинов
   */
  async initialize() {
    if (this.isInitialized) {
      this.logger.warn('PluginManager уже инициализирован');
      return;
    }

    try {
      // Загрузка конфигурации
      await this.configManager.autoLoad('plugin-manager');
      
      // Автоматическая загрузка плагинов
      if (this.config.enableAutoLoad) {
        await this.autoLoadPlugins();
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      this.logger.info('PluginManager успешно инициализирован', { stats: this.stats });
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'PluginManager.initialize' });
      throw error;
    }
  }

  /**
   * Регистрация плагина
   */
  registerPlugin(plugin) {
    try {
      if (!plugin || !plugin.name) {
        throw new Error('Плагин должен иметь имя');
      }

      if (this.plugins.has(plugin.name)) {
        this.logger.warn(`Попытка повторной регистрации плагина: ${plugin.name}`);
        return false;
      }

      // Валидация плагина
      this.validatePlugin(plugin);

      // Регистрация плагина
      this.plugins.set(plugin.name, {
        ...plugin,
        isInstalled: false,
        isEnabled: false,
        installTime: null,
        lastError: null,
        retryCount: 0
      });

      // Регистрация зависимостей
      if (plugin.dependencies && this.config.enableDependencyCheck) {
        this.dependencies.set(plugin.name, plugin.dependencies);
      }

      // Регистрация хуков
      if (plugin.hooks && this.config.enableLifecycleHooks) {
        this.registerPluginHooks(plugin.name, plugin.hooks);
      }

      this.stats.totalPlugins++;
      this.logger.info(`Плагин ${plugin.name} зарегистрирован`, {
        version: plugin.version,
        dependencies: plugin.dependencies || [],
        hooks: Object.keys(plugin.hooks || {})
      });

      return true;
    } catch (error) {
      this.errorHandler.handleError(error, { 
        context: 'PluginManager.registerPlugin',
        plugin: plugin?.name 
      });
      return false;
    }
  }

  /**
   * Валидация плагина
   */
  validatePlugin(plugin) {
    const requiredFields = ['name', 'version'];
    for (const field of requiredFields) {
      if (!plugin[field]) {
        throw new Error(`Плагин должен содержать поле: ${field}`);
      }
    }

    // Проверка версии
    if (!SharedUtils.isValidVersion(plugin.version)) {
      throw new Error(`Неверный формат версии: ${plugin.version}`);
    }

    // Проверка зависимостей
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (typeof dep !== 'string') {
          throw new Error(`Зависимость должна быть строкой: ${dep}`);
        }
      }
    }
  }

  /**
   * Регистрация хуков плагина
   */
  registerPluginHooks(pluginName, hooks) {
    for (const [hookName, handler] of Object.entries(hooks)) {
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, []);
      }
      
      this.hooks.get(hookName).push({
        pluginName,
        handler,
        priority: handler.priority || 0
      });
      
      this.stats.totalHooks++;
    }
  }

  /**
   * Получение информации о плагине
   */
  getPluginInfo(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return null;
    }

    return {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      isInstalled: plugin.isInstalled,
      isEnabled: plugin.isEnabled,
      installTime: plugin.installTime,
      lastError: plugin.lastError,
      retryCount: plugin.retryCount,
      dependencies: this.dependencies.get(pluginName) || [],
      hooks: Object.keys(plugin.hooks || {})
    };
  }

  /**
   * Получение всех плагинов
   */
  getAllPlugins() {
    return Array.from(this.plugins.keys()).map(name => this.getPluginInfo(name));
  }

  /**
   * Получение установленных плагинов
   */
  getInstalledPlugins() {
    return this.getAllPlugins().filter(plugin => plugin.isInstalled);
  }

  /**
   * Получение включенных плагинов
   */
  getEnabledPlugins() {
    return this.getAllPlugins().filter(plugin => plugin.isEnabled);
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      ...this.stats,
      isInitialized: this.isInitialized,
      isShutdown: this.isShutdown,
      loadOrder: [...this.loadOrder]
    };
  }

  /**
   * Автоматическая загрузка плагинов
   */
  async autoLoadPlugins() {
    try {
      const pluginsConfig = await this.configManager.get('plugins');
      if (!pluginsConfig || !pluginsConfig.autoLoad) {
        return;
      }

      for (const pluginConfig of pluginsConfig.autoLoad) {
        try {
          await this.loadPluginFromConfig(pluginConfig);
        } catch (error) {
          this.errorHandler.handleError(error, { 
            context: 'PluginManager.autoLoadPlugins',
            pluginConfig 
          });
        }
      }
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'PluginManager.autoLoadPlugins' });
    }
  }

  /**
   * Загрузка плагина из конфигурации
   */
  async loadPluginFromConfig(pluginConfig) {
    // Здесь должна быть логика загрузки плагина из файла или модуля
    // Пока что это заглушка
    this.logger.debug('Загрузка плагина из конфигурации', { pluginConfig });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShutdown) {
      return;
    }
    
    this.logger.info('Начало graceful shutdown PluginManager');
    this.isShutdown = true;
    
    try {
      // Отключение всех плагинов в обратном порядке
      for (let i = this.loadOrder.length - 1; i >= 0; i--) {
        const pluginName = this.loadOrder[i];
        const plugin = this.plugins.get(pluginName);
        
        if (plugin && plugin.isEnabled) {
          try {
            await this.lifecycleManager.disablePlugin(pluginName);
          } catch (error) {
            this.errorHandler.handleError(error, { 
              context: 'PluginManager.shutdown',
              pluginName 
            });
          }
        }
      }
      
      this.emit('shutdown');
      this.logger.info('PluginManager успешно завершен');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'PluginManager.shutdown' });
    }
  }
}

export default PluginManager;
