/**
 * Модуль перехватчиков команд
 * Обеспечивает перехват, оптимизацию и мониторинг команд
 */

const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {ModuleBase} = require('../core/ModuleBase.cjs');

class InterceptorModule extends ModuleBase {
    constructor(server) {
        super(server, {
            name: 'Interceptor',
            version: '1.0.0',
            description: 'Перехват и оптимизация команд'
        });

        this.interceptors = new Map();
        this.commandHistory = [];
        this.performanceMetrics = new Map();

        this.initializeInterceptors();
    }

    /**
     * Инициализация встроенных перехватчиков
     */
    initializeInterceptors() {
        // Перехватчик для команды pwd
        this.registerInterceptor('pwd', {
            name: 'PWD Interceptor',
            description: 'Автоматически устанавливает рабочую директорию',
            pattern: /^pwd$/i,
            handler: async (command, args) => {
                const currentDir = process.cwd();
                return {
                    intercepted: true,
                    command: 'pwd',
                    result: currentDir,
                    message: 'Working directory automatically set'
                };
            }
        });

        // Перехватчик для команды ls
        this.registerInterceptor('ls', {
            name: 'LS Interceptor',
            description: 'Оптимизирует команды ls для Windows',
            pattern: /^ls\s+(-[a-zA-Z]+)?\s*(.*)$/i,
            handler: async (command, args) => {
                const flags = args[1] || '';
                const path = args[2] || '.';

                // Конвертируем ls в dir для Windows
                let windowsCommand = 'dir';
                if (flags.includes('a')) windowsCommand += ' /a';
                if (flags.includes('l')) windowsCommand += ' /w';
                if (path && path !== '.') windowsCommand += ` "${path}"`;

                return {
                    intercepted: true,
                    originalCommand: command,
                    windowsCommand,
                    message: 'Converted ls to Windows dir command'
                };
            }
        });

        // Перехватчик для команды cd
        this.registerInterceptor('cd', {
            name: 'CD Interceptor',
            description: 'Валидирует и оптимизирует команды cd',
            pattern: /^cd\s+(.+)$/i,
            handler: async (command, args) => {
                const targetPath = args[1];

                // Проверяем безопасность пути
                if (this.isPathSafe(targetPath)) {
                    return {
                        intercepted: true,
                        command: 'cd',
                        targetPath,
                        safe: true,
                        message: 'Path validated as safe'
                    };
                } else {
                    return {
                        intercepted: true,
                        command: 'cd',
                        targetPath,
                        safe: false,
                        message: 'Path blocked for security reasons'
                    };
                }
            }
        });
    }

    async processRequest(id, args) {
        const {action, command, ...params} = args;

        switch (action) {
            case 'register':
                return await this.handleRegister(id, command, params);
            case 'list':
                return await this.handleList(id);
            case 'info':
                return await this.handleInfo(id, command);
            case 'remove':
                return await this.handleRemove(id, command);
            case 'stats':
                return await this.handleStats(id);
            case 'intercept':
                return await this.handleIntercept(id, command, params);
            default:
                throw errorUtils.createError(`Unknown interceptor action: ${action}`);
        }
    }

    /**
     * Регистрация нового перехватчика
     */
    async handleRegister(id, command, {name, description, pattern, handler} = {}) {
        if (!command || !name || !pattern || !handler) {
            throw errorUtils.createError('Command, name, pattern and handler are required');
        }

        errorUtils.safeExecute(async () => {

            this.registerInterceptor(command, {name, description, pattern, handler});

            return {
                success: true,
                command,
                name,
                message: 'Interceptor registered successfully'
            };

        }, 'error')`);
    }
  }

  /**
   * Список всех перехватчиков
   */
  async handleList(id) {
    const interceptors = Array.from(this.interceptors.entries()).map(([key, interceptor]) => ({
      key,
      name: interceptor.name,
      description: interceptor.description,
      pattern: interceptor.pattern.toString()
    }));

    return {
      success: true,
      interceptors,
      count: interceptors.length
    };
  }

  /**
   * Информация о конкретном перехватчике
   */
  async handleInfo(id, command) {
    if (!command) {
      throw errorUtils.createError('Command is required for info action');
    }

    const interceptor = this.interceptors.get(command);
    if (!interceptor) {
      throw errorUtils.createError(`
        Interceptor
        not
        $
        {
            command
        }
        `);
    }

    const stats = this.performanceMetrics.get(command) || {
      totalInterceptions: 0,
      lastUsed: null,
      averageResponseTime: 0
    };

    return {
      success: true,
      command,
      ...interceptor,
      stats
    };
  }

  /**
   * Удаление перехватчика
   */
  async handleRemove(id, command) {
    if (!command) {
      throw errorUtils.createError('Command is required for remove action');
    }

    const removed = this.interceptors.delete(command);
    if (!removed) {
      throw errorUtils.createError(`
        Interceptor
        not
        $
        {
            command
        }
        `);
    }

    // Очищаем статистику
    this.performanceMetrics.delete(command);

    return {
      success: true,
      command,
      message: 'Interceptor removed successfully'
    };
  }

  /**
   * Статистика перехватчиков
   */
  async handleStats(id) {
    const stats = {
      totalInterceptors: this.interceptors.size,
      totalInterceptions: this.commandHistory.length,
      performanceMetrics: Array.from(this.performanceMetrics.entries()).map(([command, metrics]) => ({
        command,
        ...metrics
      }))
    };

    return {
      success: true,
      stats
    };
  }

  /**
   * Перехват команды
   */
  async handleIntercept(id, command, { args = [] } = {}) {
    if (!command) {
      throw errorUtils.createError('Command is required for intercept action');
    }

    const startTime = Date.now();
    let result = null;
    let intercepted = false;

    // Проверяем все перехватчики
    for (const [key, interceptor] of this.interceptors) {
      if (interceptor.pattern.test(command)) {
        errorUtils.safeExecute(async () => {

          result = await interceptor.handler(command, args);
          intercepted = true;
          
          // Обновляем статистику
          this.updatePerformanceMetrics(key, Date.now() - startTime);
          
          // Добавляем в историю
          this.addToHistory(command, result, true);
          
          break;
        
}, 'error') failed`, {command, error: error.message}
    )

    }
}
}

if (!intercepted) {
    result = {
        intercepted: false,
        command,
        message: 'No interceptor matched'
    };

    this.addToHistory(command, result, false);
}

return {
    success: true,
    command,
    intercepted,
    result,
    timestamp: new Date().toISOString()
};
}

/**
 * Регистрация перехватчика
 */
registerInterceptor(command, interceptor)
{
    if (this.interceptors.has(command)) {
        throw errorUtils.createError(`Interceptor already exists for command: ${command}`);
    }

    // Валидируем перехватчик
    if (typeof interceptor.handler !== 'function') {
        throw errorUtils.createError('Handler must be a function');
    }

    if (!(interceptor.pattern instanceof RegExp)) {
        throw errorUtils.createError('Pattern must be a RegExp');
    }

    this.interceptors.set(command, interceptor);
    this.logger.info(`Interceptor registered`, {command, name: interceptor.name});
}

/**
 * Проверка безопасности пути
 */
isPathSafe(targetPath)
{
    // Базовые проверки безопасности
    const dangerousPatterns = [
        /\.\./,           // Выход за пределы директории
        /\/etc\//,        // Системные директории
        /\/usr\//,        // Системные директории
        /\/var\//,        // Системные директории
        /\/proc\//,       // Системные директории
        /\/sys\//,        // Системные директории
        /\/dev\//,        // Системные директории
        /\/root\//,       // Корневая директория
        /\/home\/[^\/]+\/\.ssh\//, // SSH ключи
        /\/\.git\//,      // Git директория
        /\/node_modules\// // Node.js модули
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(targetPath)) {
            return false;
        }
    }

    return true;
}

/**
 * Обновление метрик производительности
 */
updatePerformanceMetrics(command, responseTime)
{
    const current = this.performanceMetrics.get(command) || {
        totalInterceptions: 0,
        totalResponseTime: 0,
        lastUsed: null
    };

    current.totalInterceptions++;
    current.totalResponseTime += responseTime;
    current.averageResponseTime = current.totalResponseTime / current.totalInterceptions;
    current.lastUsed = new Date().toISOString();

    this.performanceMetrics.set(command, current);
}

/**
 * Добавление в историю команд
 */
addToHistory(command, result, intercepted)
{
    const entry = {
        command,
        result,
        intercepted,
        timestamp: new Date().toISOString()
    };

    this.commandHistory.push(entry);

    // Ограничиваем размер истории
    if (this.commandHistory.length > 1000) {
        this.commandHistory = this.commandHistory.slice(-500);
    }
}

getTools()
{
    return [{
        name: 'interceptor',
        description: 'Перехватчики команд: register | list | info | remove | stats | intercept',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['register', 'list', 'info', 'remove', 'stats', 'intercept']
                },
                command: {type: 'string', description: 'Команда для перехвата'},
                name: {type: 'string', description: 'Название перехватчика'},
                description: {type: 'string', description: 'Описание перехватчика'},
                pattern: {type: 'string', description: 'Регулярное выражение для паттерна'},
                handler: {type: 'string', description: 'JavaScript код обработчика'},
                args: {type: 'array', description: 'Аргументы команды'}
            },
            required: ['action']
        }
    }];
}
}

module.exports = {InterceptorModule};


