/**
 * MCP Terminal Core - Базовые MCP серверные компоненты
 * Основная логика MCP сервера для терминальных операций
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');

/**
 * Логгер для MCP сервера
 */
class LoggerCore {
  constructor(config = {}) {
    this.level = config?.level || 'info';
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    this.currentLevel = this.levels[this.level] || 1;

    // Настройка файлового логирования
    if (config?.file?.enabled && config.file.path) {
      this.filePath = config.file.path;
      this.maxSize = config.file.maxSize || '20m';
      this.maxFiles = config.file.maxFiles || '14d';
    }
  }

  debug(message, ...args) {
    if (this.currentLevel <= 0) this.log('DEBUG', message, ...args);
  }

  info(message, ...args) {
    if (this.currentLevel <= 1) this.log('INFO', message, ...args);
  }

  warn(message, ...args) {
    if (this.currentLevel <= 2) this.log('WARN', message, ...args);
  }

  error(message, ...args) {
    if (this.currentLevel <= 3) this.log('ERROR', message, ...args);
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    // Файловый вывод если настроен
    if (this.filePath) {
      const logEntry = `${formattedMessage} ${args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')}\n`;

      // Создаем директорию если не существует
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Убеждаемся что путь имеет расширение .log
      let targetPath = this.filePath;
      if (!targetPath.endsWith('.log')) targetPath = targetPath + '.log';
      fs.appendFileSync(targetPath, logEntry);
    }
  }
}

/**
 * Базовый класс для модулей MCP
 */
class ModuleBase {
  constructor(server, name) {
    this.server = server;
    this.name = name;
    this.enabled = true;
    this.logger = server.logger;
  }

  getCapabilities() {
    return {
      name: this.name,
      enabled: this.enabled,
      tools: this.getTools()
    };
  }

  getTools() {
    return [];
  }

  getStatus() {
    return {
      name: this.name,
      enabled: this.enabled,
      uptime: process.uptime()
    };
  }

  getStats() {
    return {
      name: this.name,
      enabled: this.enabled,
      requests: 0
    };
  }

  async handleRequest(id, args) {
    throw new Error(`Module ${this.name} must implement handleRequest`);
  }

  async cleanup() {
    // Базовая реализация очистки
  }
}

/**
 * Основной MCP сервер
 */
class CoreServer {
  constructor(config = {}) {
    this.rl = readline.createInterface({ 
      input: process.stdin, 
      output: process.stdout, 
      terminal: false 
    });
    
    this.modules = new Map();
    this.logger = this.createLogger(config);
    this.errorHandler = this.createErrorHandler();
    
    this.initializeModules();
    this.setupMessageHandler();
  }

  /**
   * Создание логгера
   */
  createLogger(config) {
    const loggerConfig = {
      level: (process.env.LOG_LEVEL || 'info').toLowerCase(),
      file: { 
        enabled: true,
        path: path.join(process.cwd(), 'logs', 'core-server.log'),
        maxSize: '20m',
        maxFiles: '14d'
      },
      ...config.logger
    };

    return new LoggerCore(loggerConfig);
  }

  /**
   * Создание обработчика ошибок
   */
  createErrorHandler() {
    return {
      handle: (error, context) => {
        this.logger.error(`Error in ${context}: ${error.message}`);
        return { success: false, error: error.message };
      }
    };
  }

  /**
   * Инициализация модулей
   */
  initializeModules() {
    this.logger.info('Initializing MCP Core Server modules');
    
    // Модули будут регистрироваться через registerModule
    this.logger.info('MCP Core Server modules initialized', {
      modules: Array.from(this.modules.keys())
    });
  }

  /**
   * Регистрация модуля
   */
  registerModule(name, module) {
    if (!(module instanceof ModuleBase)) {
      throw new Error(`Module ${name} must extend ModuleBase`);
    }
    
    this.modules.set(name, module);
    this.logger.info(`Module ${name} registered`, module.getCapabilities());
  }

  /**
   * Получение модуля по имени
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Обработка сообщений MCP
   */
  async handleMessage(message) {
    const { id, method, params } = message;

    this.logger.info(`MCP message received`, { 
      id, 
      method, 
      hasParams: !!params,
      paramsType: typeof params
    });

    try {
      let response;
      switch (method) {
        case 'initialize':
          response = this.handleInitialize(id, params);
          break;
        case 'tools/list':
          response = this.handleToolsList(id);
          break;
        case 'tools/call':
          response = await this.handleToolCall(id, params);
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      this.logger.info(`MCP message processed successfully`, { 
        id, 
        method, 
        hasResponse: !!response,
        responseType: typeof response
      });

      return response;
      
    } catch (error) {
      this.logger.error(`Message handling failed`, { 
        id,
        method, 
        error: error.message,
        stack: error.stack,
        params: JSON.stringify(params)
      });
      
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message,
          data: {
            method,
            timestamp: new Date().toISOString(),
            serverVersion: '2.0.0'
          }
        }
      };
    }
  }

  /**
   * Обработка инициализации
   */
  handleInitialize(id, params) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true }
        },
        serverInfo: {
          name: 'mcp-terminal-core',
          version: '2.0.0'
        }
      }
    };
  }

  /**
   * Список доступных инструментов
   */
  handleToolsList(id) {
    const tools = [];
    
    for (const [name, module] of this.modules) {
      if (module.enabled) {
        tools.push(...module.getTools());
      }
    }

    return {
      jsonrpc: '2.0',
      id,
      result: { tools }
    };
  }

  /**
   * Обработка вызова инструмента
   */
  async handleToolCall(id, params) {
    const { name, arguments: args } = params;
    
    this.logger.info(`Tool call received`, { 
      id, 
      tool: name, 
      args: JSON.stringify(args),
      params: JSON.stringify(params)
    });
    
    // Находим модуль по имени инструмента
    let targetModule = null;
    for (const [moduleName, module] of this.modules) {
      const moduleTools = module.getTools();
      if (moduleTools.some(tool => tool.name === name)) {
        targetModule = module;
        break;
      }
    }

    if (!targetModule) {
      const error = `Tool ${name} not found`;
      this.logger.error(error, { availableTools: Array.from(this.modules.keys()) });
      throw new Error(error);
    }

    if (!targetModule.enabled) {
      const error = `Tool ${name} is disabled`;
      this.logger.error(error, { module: targetModule.name });
      throw new Error(error);
    }

    try {
      const result = await targetModule.handleRequest(id, args);
      
      this.logger.info(`Tool call completed successfully`, { 
        id, 
        tool: name, 
        resultType: typeof result,
        hasData: !!result
      });
      
      return {
        jsonrpc: '2.0',
        id,
        result: {
          success: true,
          data: result,
          metadata: {
            duration: Date.now(),
            timestamp: new Date().toISOString(),
            version: '2.0.0'
          }
        }
      };
    } catch (error) {
      this.logger.error(`Tool call failed`, { 
        id, 
        tool: name, 
        error: error.message,
        stack: error.stack,
        args: JSON.stringify(args)
      });
      
      throw error;
    }
  }

  /**
   * Настройка обработчика сообщений
   */
  setupMessageHandler() {
    this.rl.on('line', async (line) => {
      if (!line || line.trim() === '') return;

      try {
        const parsed = JSON.parse(line.trim());
        const response = await this.handleMessage(parsed);
        
        if (response) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (error) {
        this.logger.error('Failed to process line', { line, error: error.message });
      }
    });
  }

  /**
   * Запуск сервера
   */
  async start() {
    this.logger.info('MCP Terminal Core Server starting...');
    
    try {
      // Проверяем статус всех модулей
      for (const [name, module] of this.modules) {
        const status = module.getStatus();
        this.logger.info(`Module ${name} status`, status);
      }

      this.logger.info('MCP Terminal Core Server started successfully');
    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      throw error;
    }
  }

  /**
   * Остановка сервера
   */
  async stop() {
    this.logger.info('MCP Terminal Core Server stopping...');
    
    try {
      // Очищаем ресурсы модулей
      for (const [name, module] of this.modules) {
        await module.cleanup();
      }
      
      this.rl.close();
      this.logger.info('MCP Terminal Core Server stopped');
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
    }
  }

  /**
   * Получение статистики сервера
   */
  getStats() {
    const stats = {
      uptime: process.uptime(),
      modules: {},
      totalModules: this.modules.size,
      enabledModules: 0
    };

    for (const [name, module] of this.modules) {
      stats.modules[name] = module.getStats();
      if (module.enabled) stats.enabledModules++;
    }

    return stats;
  }
}

export { CoreServer,
  ModuleBase,
  LoggerCore };
