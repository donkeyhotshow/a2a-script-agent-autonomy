/**
 * Основной модуль системы плагинов
 * Инициализация и управление плагинами
 */

/**
 * Дебаг функция с меткой [critical]
 */
const debugCritical = (message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[critical] ${timestamp} - PluginCore: ${message}`
  
  if (data) {
    console.error(logMessage, data)
  } else {
    console.error(logMessage)
  }
}

// Импорт основных модулей
import PluginManager from './PluginManager.js'
import PluginLoader from './PluginLoader.js'
import TaskReporter from './TaskReporter.js'

class PluginCore {
  constructor() {
    this.pluginManager = new PluginManager()
    this.pluginLoader = new PluginLoader()
    this.taskReporter = TaskReporter
    this.isInitialized = false
    
    debugCritical('PluginCore конструктор выполнен')
  }

  /**
   * Инициализация системы плагинов
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        debugCritical('PluginCore уже инициализирован')
        return
      }

      debugCritical('Инициализация системы плагинов...')

      // Инициализация TaskReporter
      try {
        await this.taskReporter.initialize()
        debugCritical('TaskReporter инициализирован успешно')
      } catch (e) {
        debugCritical('[PluginCore] TaskReporter init failed:', {
          error: e.message,
          stack: e.stack
        })
        // Продолжаем инициализацию даже при ошибке TaskReporter
      }

      // Инициализация PluginLoader
      await this.pluginLoader.initialize()
      debugCritical('PluginLoader инициализирован успешно')

      // Инициализация PluginManager
      await this.pluginManager.initialize()
      debugCritical('PluginManager инициализирован успешно')

      this.isInitialized = true
      debugCritical('Система плагинов инициализирована', {
        loadedPlugins: this.pluginLoader.getAllLoadedPlugins().length,
        installedPlugins: this.pluginManager.getInstalledPlugins().length
      })
    } catch (error) {
      debugCritical('Ошибка инициализации системы плагинов:', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Загрузка плагина
   */
  async loadPlugin(pluginName) {
    try {
      debugCritical('Загрузка плагина', { pluginName })

      // Загрузка плагина через PluginLoader
      const plugin = await this.pluginLoader.loadPlugin(pluginName)
      if (!plugin) {
        debugCritical('Плагин не загружен', { pluginName })
        return null
      }

      // Регистрация плагина в PluginManager
      const registered = this.pluginManager.registerPlugin(plugin)
      if (!registered) {
        debugCritical('Плагин не зарегистрирован', { pluginName })
        return null
      }

      debugCritical('Плагин загружен и зарегистрирован успешно', {
        pluginName: pluginName,
        version: plugin.version
      })

      return plugin
    } catch (error) {
      debugCritical('Ошибка загрузки плагина:', {
        pluginName: pluginName,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Установка плагина
   */
  async installPlugin(pluginName) {
    try {
      debugCritical('Установка плагина', { pluginName })

      // Проверяем, загружен ли плагин
      let plugin = this.pluginManager.getPlugin(pluginName)
      if (!plugin) {
        // Загружаем плагин если не загружен
        plugin = await this.loadPlugin(pluginName)
        if (!plugin) {
          throw new Error(`Плагин ${pluginName} не может быть загружен`)
        }
      }

      // Устанавливаем плагин
      const installed = await this.pluginManager.installPlugin(pluginName)
      if (!installed) {
        throw new Error(`Плагин ${pluginName} не может быть установлен`)
      }

      debugCritical('Плагин установлен успешно', {
        pluginName: pluginName,
        version: plugin.version
      })

      return plugin
    } catch (error) {
      debugCritical('Ошибка установки плагина:', {
        pluginName: pluginName,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Удаление плагина
   */
  async uninstallPlugin(pluginName) {
    try {
      debugCritical('Удаление плагина', { pluginName })

      // Удаляем плагин через PluginManager
      const uninstalled = await this.pluginManager.uninstallPlugin(pluginName)
      if (!uninstalled) {
        throw new Error(`Плагин ${pluginName} не может быть удален`)
      }

      debugCritical('Плагин удален успешно', { pluginName })

      return true
    } catch (error) {
      debugCritical('Ошибка удаления плагина:', {
        pluginName: pluginName,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Получение списка всех плагинов
   */
  getAllPlugins() {
    try {
      debugCritical('Получение списка всех плагинов')

      const loadedPlugins = this.pluginLoader.getAllLoadedPlugins()
      const installedPlugins = this.pluginManager.getInstalledPlugins()

      const result = {
        loaded: loadedPlugins,
        installed: installedPlugins,
        total: {
          loaded: loadedPlugins.length,
          installed: installedPlugins.length
        }
      }

      debugCritical('Список плагинов получен', result.total)

      return result
    } catch (error) {
      debugCritical('Ошибка получения списка плагинов:', {
        error: error.message,
        stack: error.stack
      })
      return {
        loaded: [],
        installed: [],
        total: { loaded: 0, installed: 0 }
      }
    }
  }

  /**
   * Получение информации о плагине
   */
  getPluginInfo(pluginName) {
    try {
      debugCritical('Получение информации о плагине', { pluginName })

      const plugin = this.pluginManager.getPlugin(pluginName)
      if (!plugin) {
        debugCritical('Плагин не найден', { pluginName })
        return null
      }

      const info = {
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        isInstalled: this.pluginManager.isPluginInstalled(pluginName),
        config: plugin.config,
        hooks: Object.keys(plugin.hooks || {}),
        loadedAt: plugin.loadedAt
      }

      debugCritical('Информация о плагине получена', {
        pluginName: pluginName,
        isInstalled: info.isInstalled,
        hooksCount: info.hooks.length
      })

      return info
    } catch (error) {
      debugCritical('Ошибка получения информации о плагине:', {
        pluginName: pluginName,
        error: error.message,
        stack: error.stack
      })
      return null
    }
  }

  /**
   * Выполнение хука
   */
  async executeHook(hookName, ...args) {
    try {
      debugCritical('Выполнение хука', {
        hookName: hookName,
        argsCount: args.length
      })

      const results = await this.pluginManager.executeHook(hookName, ...args)

      debugCritical('Хук выполнен успешно', {
        hookName: hookName,
        resultsCount: results.length
      })

      return results
    } catch (error) {
      debugCritical('Ошибка выполнения хука:', {
        hookName: hookName,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Получение статистики системы плагинов
   */
  getStats() {
    try {
      debugCritical('Получение статистики системы плагинов')

      const allPlugins = this.getAllPlugins()
      const stats = {
        total: allPlugins.total,
        byStatus: {
          loaded: allPlugins.loaded.length,
          installed: allPlugins.installed.length,
          notInstalled: allPlugins.loaded.length - allPlugins.installed.length
        },
        byVersion: {},
        byHook: {},
        system: {
          isInitialized: this.isInitialized,
          taskReporterActive: !!this.taskReporter,
          pluginManagerActive: !!this.pluginManager,
          pluginLoaderActive: !!this.pluginLoader
        }
      }

      // Статистика по версиям
      allPlugins.loaded.forEach(plugin => {
        const version = plugin.version || 'unknown'
        stats.byVersion[version] = (stats.byVersion[version] || 0) + 1
      })

      // Статистика по хукам
      allPlugins.loaded.forEach(plugin => {
        if (plugin.hooks) {
          Object.keys(plugin.hooks).forEach(hook => {
            stats.byHook[hook] = (stats.byHook[hook] || 0) + 1
          })
        }
      })

      debugCritical('Статистика системы плагинов получена', stats)

      return stats
    } catch (error) {
      debugCritical('Ошибка получения статистики системы плагинов:', {
        error: error.message,
        stack: error.stack
      })
      return {
        total: { loaded: 0, installed: 0 },
        byStatus: { loaded: 0, installed: 0, notInstalled: 0 },
        byVersion: {},
        byHook: {},
        system: {
          isInitialized: this.isInitialized,
          taskReporterActive: false,
          pluginManagerActive: false,
          pluginLoaderActive: false
        }
      }
    }
  }

  /**
   * Очистка ресурсов
   */
  async cleanup() {
    try {
      debugCritical('Очистка ресурсов системы плагинов')

      // Очистка PluginManager
      await this.pluginManager.cleanup()
      debugCritical('PluginManager очищен')

      // Очистка PluginLoader
      await this.pluginLoader.cleanup()
      debugCritical('PluginLoader очищен')

      // Очистка TaskReporter
      await this.taskReporter.cleanup()
      debugCritical('TaskReporter очищен')

      this.isInitialized = false
      debugCritical('Система плагинов очищена успешно')
    } catch (error) {
      debugCritical('Ошибка очистки системы плагинов:', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }
}

// Создание и экспорт синглтона
const pluginCore = new PluginCore()

export default pluginCore

// Экспорт функций для интеграции с Vue приложением
export const initializePluginSystem = async (app) => {
  try {
    debugCritical('Инициализация системы плагинов для Vue приложения')
    
    // Инициализация системы плагинов
    await pluginCore.initialize()
    
    // Регистрация глобальных свойств
    app.config.globalProperties.$pluginCore = pluginCore
    app.config.globalProperties.$pluginManager = pluginCore.pluginManager
    app.config.globalProperties.$pluginLoader = pluginCore.pluginLoader
    
    // Регистрация маршрутов плагинов в роутере
    if (app.config.globalProperties.$router) {
      const router = app.config.globalProperties.$router
      const allPlugins = pluginCore.getAllPlugins()
      
      allPlugins.loaded.forEach(plugin => {
        if (plugin.routes && Array.isArray(plugin.routes)) {
          plugin.routes.forEach(route => {
            try {
              router.addRoute(route)
              debugCritical(`Маршрут плагина добавлен: ${route.path}`, { plugin: plugin.name })
            } catch (error) {
              debugCritical(`Ошибка добавления маршрута плагина ${plugin.name}:`, {
                route: route.path,
                error: error.message
              })
            }
          })
        }
      })
    }
    
    // Регистрация компонентов плагинов
    allPlugins.loaded.forEach(plugin => {
      if (plugin.components) {
        Object.entries(plugin.components).forEach(([name, component]) => {
          try {
            app.component(name, component)
            debugCritical(`Компонент плагина зарегистрирован: ${name}`, { plugin: plugin.name })
          } catch (error) {
            debugCritical(`Ошибка регистрации компонента плагина ${plugin.name}:`, {
              component: name,
              error: error.message
            })
          }
        })
      }
    })
    
    debugCritical('Система плагинов инициализирована для Vue приложения')
  } catch (error) {
    debugCritical('Ошибка инициализации системы плагинов для Vue приложения:', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

// Экспорт объекта PluginSystem для доступа к методам
export const PluginSystem = {
  getInfo: async () => {
    try {
      const stats = pluginCore.getStats()
      const allPlugins = pluginCore.getAllPlugins()
      
      return {
        stats,
        plugins: allPlugins,
        system: {
          isInitialized: pluginCore.isInitialized,
          version: '1.0.0'
        }
      }
    } catch (error) {
      debugCritical('Ошибка получения информации о системе плагинов:', {
        error: error.message,
        stack: error.stack
      })
      return {
        stats: { total: { loaded: 0, installed: 0 } },
        plugins: { loaded: [], installed: [] },
        system: { isInitialized: false, version: '1.0.0' }
      }
    }
  },
  
  getPluginInfo: (pluginName) => pluginCore.getPluginInfo(pluginName),
  
  getAllPlugins: () => pluginCore.getAllPlugins(),
  
  getStats: () => pluginCore.getStats(),
  
  executeHook: (hookName, ...args) => pluginCore.executeHook(hookName, ...args)
}
