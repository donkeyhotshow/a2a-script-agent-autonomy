/**
 * Загрузчик плагинов для динамической загрузки и управления плагинами
 */

/**
 * Дебаг функция с меткой [critical]
 */
const debugCritical = (message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[critical] ${timestamp} - PluginLoader: ${message}`
  
  if (data) {
    console.error(logMessage, data)
  } else {
    console.error(logMessage)
  }
}

class PluginLoader {
  constructor() {
    this.loadedPlugins = new Map()
    this.pluginConfigs = new Map()
    this.isInitialized = false
    
    debugCritical('PluginLoader инициализирован')
  }

  /**
   * Загрузка конфигурации плагинов
   */
  async loadPluginConfigs() {
    try {
      debugCritical('Начало загрузки конфигурации плагинов')

      let config
      try {
        config = await import('../../../config/plugins.json')
        debugCritical('Конфигурация плагинов загружена из файла')
      } catch (error) {
        debugCritical('Не удалось импортировать plugin-config.json, используем встроенную конфигурацию', {
          error: error.message
        })
        
        // Встроенная конфигурация по умолчанию
        config = {
          plugins: {
            core: {
              enabled: true,
              autoInstall: true,
              dependencies: []
            },
            config: {
              enabled: true,
              autoInstall: true,
              dependencies: ['core']
            },
            services: {
              enabled: true,
              autoInstall: true,
              dependencies: ['core']
            },
            dashboard: {
              enabled: true,
              autoInstall: true,
              dependencies: ['core', 'services']
            },
            groups: {
              enabled: true,
              autoInstall: true,
              dependencies: ['core', 'config']
            },
            automation: {
              enabled: true,
              autoInstall: false,
              dependencies: ['core', 'services']
            },
            'daemon-monitor': {
              enabled: true,
              autoInstall: false,
              dependencies: ['core', 'services']
            },
            admin: {
              enabled: true,
              autoInstall: false,
              dependencies: ['core', 'config']
            },
            singles: {
              enabled: true,
              autoInstall: false,
              dependencies: ['core']
            },
            settings: {
              enabled: true,
              autoInstall: false,
              dependencies: ['core', 'config']
            },
            ports: {
              enabled: true,
              autoInstall: false,
              dependencies: ['core', 'config']
            },
            notifications: {
              enabled: true,
              autoInstall: true,
              dependencies: ['core']
            }
          }
        }
      }

      // Валидация конфигурации
      if (typeof window !== 'undefined') {
        try {
          const Ajv = await import('ajv')
          const ajv = new Ajv.default()
          
          const schema = {
            type: 'object',
            properties: {
              plugins: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    autoLoad: { type: 'boolean' },
                    dependencies: { 
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['enabled']
                }
              }
            }
          }
          
          const validate = ajv.compile(schema)
          if (!validate(config)) {
            debugCritical('Ошибка валидации конфигурации плагинов', {
              errors: validate.errors
            })
          } else {
            debugCritical('Конфигурация плагинов прошла валидацию')
          }
        } catch (error) {
          debugCritical('Ajv недоступен в браузерной среде, валидация конфигурации отключена', {
            error: error.message
          })
        }
      }

      // Сохранение конфигураций
      Object.entries(config.plugins || {}).forEach(([name, pluginConfig]) => {
        this.pluginConfigs.set(name, {
          name,
          enabled: pluginConfig.enabled !== false,
          autoLoad: pluginConfig.autoInstall !== false,
          dependencies: pluginConfig.dependencies || [],
          ...pluginConfig
        })
      })

      debugCritical(`Загружено конфигураций плагинов: ${this.pluginConfigs.size}`)
    } catch (error) {
      debugCritical('Ошибка загрузки конфигурации плагинов:', {
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
      debugCritical(`Загрузка плагина: ${pluginName}`)

      // Проверка конфигурации
      const config = this.pluginConfigs.get(pluginName)
      if (!config) {
        debugCritical(`Конфигурация плагина ${pluginName} не найдена`)
        throw new Error(`Конфигурация плагина ${pluginName} не найдена`)
      }

      if (!config.enabled) {
        debugCritical(`Плагин ${pluginName} отключен в конфигурации`)
        return null
      }

      // Проверка зависимостей
      for (const dep of config.dependencies) {
        const depPlugin = this.loadedPlugins.get(dep)
        if (!depPlugin) {
          debugCritical(`Зависимость ${dep} не загружена для плагина ${pluginName}`)
          throw new Error(`Зависимость ${dep} не загружена`)
        }
      }

      // Динамический импорт плагина
      const pluginPath = `../${pluginName}/index.js`
      debugCritical(`Пробуем импортировать плагин '${pluginName}' из '${pluginPath}'`)

      let pluginModule
      try {
        pluginModule = await import(/* @vite-ignore */ pluginPath)
        debugCritical(`Модуль плагина ${pluginName} импортирован успешно`)
      } catch (error) {
        debugCritical(`Ошибка импорта модуля плагина ${pluginName}:`, {
          error: error.message,
          path: pluginPath
        })
        throw error
      }

      // Получение плагина из модуля
      const plugin = pluginModule.default || pluginModule
      if (!plugin) {
        debugCritical(`Плагин ${pluginName} не экспортирован из модуля`)
        throw new Error(`Плагин ${pluginName} не экспортирован`)
      }

      // Добавление метаданных
      const pluginWithMeta = {
        ...plugin,
        name: pluginName,
        config,
        loadedAt: new Date().toISOString()
      }

      this.loadedPlugins.set(pluginName, pluginWithMeta)
      debugCritical(`Плагин ${pluginName} загружен успешно`, {
        hooks: Object.keys(plugin.hooks || {}),
        version: plugin.version
      })

      return pluginWithMeta
    } catch (error) {
      debugCritical(`Ошибка загрузки плагина ${pluginName}:`, {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Автоматическая загрузка плагинов
   */
  async autoLoadPlugins() {
    try {
      debugCritical('Начало автоматической загрузки плагинов')

      const autoLoadPlugins = Array.from(this.pluginConfigs.values())
        .filter(config => config.enabled && config.autoLoad)
        .sort((a, b) => a.dependencies.length - b.dependencies.length)

      debugCritical(`Найдено ${autoLoadPlugins.length} плагинов для автозагрузки`)

      for (const config of autoLoadPlugins) {
        try {
          await this.loadPlugin(config.name)
          debugCritical(`Плагин ${config.name} установлен`)
        } catch (error) {
          debugCritical(`Ошибка автозагрузки плагина ${config.name}:`, {
            error: error.message,
            stack: error.stack
          })
          // Продолжаем загрузку других плагинов
        }
      }

      debugCritical(`Автозагрузка завершена. Загружено плагинов: ${this.loadedPlugins.size}`)
    } catch (error) {
      debugCritical('Ошибка автозагрузки плагинов:', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Получение загруженного плагина
   */
  getLoadedPlugin(pluginName) {
    return this.loadedPlugins.get(pluginName)
  }

  /**
   * Получение всех загруженных плагинов
   */
  getAllLoadedPlugins() {
    return Array.from(this.loadedPlugins.values())
  }

  /**
   * Получение конфигурации плагина
   */
  getPluginConfig(pluginName) {
    return this.pluginConfigs.get(pluginName)
  }

  /**
   * Получение всех конфигураций
   */
  getAllPluginConfigs() {
    return Array.from(this.pluginConfigs.values())
  }

  /**
   * Проверка загрузки плагина
   */
  isPluginLoaded(pluginName) {
    return this.loadedPlugins.has(pluginName)
  }

  /**
   * Получение всех имен плагинов
   */
  getAllPluginNames() {
    return Array.from(this.pluginConfigs.keys())
  }

  /**
   * Включение/отключение плагина
   */
  async setPluginEnabled(pluginName, enabled, app) {
    try {
      debugCritical(`Установка состояния плагина ${pluginName}: ${enabled ? 'включен' : 'отключен'}`)
      
      const config = this.pluginConfigs.get(pluginName)
      if (!config) {
        throw new Error(`Конфигурация плагина ${pluginName} не найдена`)
      }
      
      config.enabled = enabled
      
      // Если плагин отключается, удаляем его из загруженных
      if (!enabled && this.loadedPlugins.has(pluginName)) {
        this.loadedPlugins.delete(pluginName)
        debugCritical(`Плагин ${pluginName} удален из загруженных`)
      }
      
      // Если плагин включается и не загружен, загружаем его
      if (enabled && !this.loadedPlugins.has(pluginName)) {
        await this.loadPlugin(pluginName)
        debugCritical(`Плагин ${pluginName} загружен после включения`)
      }
      
      debugCritical(`Состояние плагина ${pluginName} установлено успешно`)
    } catch (error) {
      debugCritical(`Ошибка установки состояния плагина ${pluginName}:`, {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Перезагрузка плагина
   */
  async reloadPlugin(pluginName, app) {
    try {
      debugCritical(`Перезагрузка плагина ${pluginName}`)
      
      // Удаляем плагин из загруженных
      if (this.loadedPlugins.has(pluginName)) {
        this.loadedPlugins.delete(pluginName)
        debugCritical(`Плагин ${pluginName} удален для перезагрузки`)
      }
      
      // Загружаем плагин заново
      await this.loadPlugin(pluginName)
      debugCritical(`Плагин ${pluginName} перезагружен успешно`)
    } catch (error) {
      debugCritical(`Ошибка перезагрузки плагина ${pluginName}:`, {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Инициализация загрузчика
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        debugCritical('PluginLoader уже инициализирован')
        return
      }

      debugCritical('Начало инициализации PluginLoader')

      // Загрузка конфигураций
      await this.loadPluginConfigs()

      // Автозагрузка плагинов
      await this.autoLoadPlugins()

      this.isInitialized = true
      debugCritical('PluginLoader инициализирован успешно', {
        totalConfigs: this.pluginConfigs.size,
        loadedPlugins: this.loadedPlugins.size
      })
    } catch (error) {
      debugCritical('Критическая ошибка инициализации PluginLoader:', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Получение загруженных плагинов (для совместимости)
   */
  async getLoadedPlugins() {
    return Array.from(this.loadedPlugins.values())
  }

  /**
   * Обновление конфигурации плагина
   */
  updatePluginConfig(pluginName, partialConfig) {
    const config = this.pluginConfigs.get(pluginName)
    if (!config) {
      throw new Error(`Конфигурация плагина ${pluginName} не найдена`)
    }
    Object.assign(config, partialConfig)
    debugCritical(`Конфигурация плагина ${pluginName} обновлена`)
  }

  /**
   * Установка плагина (заглушка для совместимости)
   */
  async installPlugin(pluginName, app) {
    debugCritical(`Установка плагина ${pluginName} (заглушка)`)
    // В текущей реализации установка происходит автоматически при загрузке
    return this.loadPlugin(pluginName)
  }

  /**
   * Удаление плагина (заглушка для совместимости)
   */
  async uninstallPlugin(pluginName, app) {
    debugCritical(`Удаление плагина ${pluginName} (заглушка)`)
    if (this.loadedPlugins.has(pluginName)) {
      this.loadedPlugins.delete(pluginName)
      debugCritical(`Плагин ${pluginName} удален`)
    }
  }

  /**
   * Очистка ресурсов
   */
  async cleanup() {
    try {
      debugCritical('Начало очистки PluginLoader')

      this.loadedPlugins.clear()
      this.pluginConfigs.clear()
      this.isInitialized = false

      debugCritical('PluginLoader очищен успешно')
    } catch (error) {
      debugCritical('Ошибка очистки PluginLoader:', {
        error: error.message,
        stack: error.stack
      })
    }
  }
}

export default PluginLoader
