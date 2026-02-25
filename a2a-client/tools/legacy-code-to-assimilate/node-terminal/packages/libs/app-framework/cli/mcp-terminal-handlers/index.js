/**
 * MCP Terminal Handlers - Полная система обработки MCP инструментов
 * Обработчики MCP команд с валидацией, безопасностью и аналитикой
 */

const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const { HandlerState, ToolType } = require('./HandlerEnums');
const { HandlerError, ValidationError, SecurityError } = require('./HandlerErrors');
const { BaseToolHandler, TerminalHandler } = require('./TerminalHandler');

/**
 * Обработчик файловых операций
 */
class FileHandler extends BaseToolHandler {
  constructor(server) {
    super(server, 'file');
    this.fileUtils = server.fileUtils;
    this.pathUtils = server.pathUtils;
  }

  getTools() {
    return [
      {
        name: 'file_read',
        description: 'Чтение файла',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['read'] },
            path: { type: 'string' },
            encoding: { type: 'string', default: 'utf8' }
          },
          required: ['action', 'path']
        }
      },
      {
        name: 'file_write',
        description: 'Запись в файл',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['write'] },
            path: { type: 'string' },
            content: { type: 'string' },
            encoding: { type: 'string', default: 'utf8' }
          },
          required: ['action', 'path', 'content']
        }
      },
      {
        name: 'file_list',
        description: 'Список файлов',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list'] },
            path: { type: 'string' },
            recursive: { type: 'boolean', default: false }
          },
          required: ['action', 'path']
        }
      }
    ];
  }

  validateParams(args) {
    const errors = [];

    if (!args.action) {
      errors.push('Action is required');
    }

    if (!args.path) {
      errors.push('Path is required');
    } else {
      // Валидация пути
      const pathValidation = this.pathUtils.validatePath(args.path);
      if (!pathValidation.valid) {
        errors.push(`Invalid path: ${pathValidation.reason}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async handleRequest(id, args) {
    this.state = HandlerState.PROCESSING;

    try {
      const validation = this.validateParams(args);
      if (!validation.valid) {
        throw new ValidationError(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const { action, path, content, encoding, recursive } = args;

      switch (action) {
        case 'read':
          return await this.handleRead(path, encoding);
        case 'write':
          return await this.handleWrite(path, content, encoding);
        case 'list':
          return await this.handleList(path, recursive);
        default:
          throw new ValidationError(`Unknown action: ${action}`);
      }

    } catch (error) {
      this.state = HandlerState.FAILED;
      this.emit('error', error);
      throw error;
    } finally {
      this.state = HandlerState.COMPLETED;
    }
  }

  async handleRead(filePath, encoding = 'utf8') {
    const content = await this.fileUtils.readFile(filePath, encoding);
    return {
      success: true,
      content,
      metadata: {
        path: filePath,
        encoding,
        size: content.length
      }
    };
  }

  async handleWrite(filePath, content, encoding = 'utf8') {
    await this.fileUtils.writeFile(filePath, content, encoding);
    return {
      success: true,
      metadata: {
        path: filePath,
        encoding,
        size: content.length
      }
    };
  }

  async handleList(dirPath, recursive = false) {
    const files = await this.fileUtils.listFiles(dirPath, recursive);
    return {
      success: true,
      files,
      metadata: {
        path: dirPath,
        recursive,
        count: files.length
      }
    };
  }
}

/**
 * Обработчик поиска
 */
class SearchHandler extends BaseToolHandler {
  constructor(server) {
    super(server, 'search');
    this.searchEngine = server.searchEngine;
  }

  getTools() {
    return [
      {
        name: 'search_text',
        description: 'Поиск текста в файлах',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['search'] },
            query: { type: 'string' },
            path: { type: 'string' },
            pattern: { type: 'string' },
            case_sensitive: { type: 'boolean', default: false }
          },
          required: ['action', 'query']
        }
      }
    ];
  }

  validateParams(args) {
    const errors = [];

    if (!args.action) {
      errors.push('Action is required');
    }

    if (!args.query) {
      errors.push('Query is required');
    }

    if (args.query && args.query.length > 1000) {
      errors.push('Query length exceeds maximum of 1000 characters');
    }

    return { valid: errors.length === 0, errors };
  }

  async handleRequest(id, args) {
    this.state = HandlerState.PROCESSING;

    try {
      const validation = this.validateParams(args);
      if (!validation.valid) {
        throw new ValidationError(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const { action, query, path, pattern, case_sensitive } = args;

      switch (action) {
        case 'search':
          return await this.handleSearch(query, path, pattern, case_sensitive);
        default:
          throw new ValidationError(`Unknown action: ${action}`);
      }

    } catch (error) {
      this.state = HandlerState.FAILED;
      this.emit('error', error);
      throw error;
    } finally {
      this.state = HandlerState.COMPLETED;
    }
  }

  async handleSearch(query, searchPath, pattern, caseSensitive = false) {
    const results = await this.searchEngine.searchText(query, {
      path: searchPath,
      pattern,
      caseSensitive
    });

    return {
      success: true,
      results,
      metadata: {
        query,
        path: searchPath,
        pattern,
        caseSensitive,
        count: results.length
      }
    };
  }
}

/**
 * Менеджер обработчиков MCP
 */
class MCPHandlersManager extends EventEmitter {
  constructor(server) {
    super();
    this.server = server;
    this.logger = server.logger;
    this.handlers = new Map();
    this.initializeHandlers();
  }

  /**
   * Инициализация обработчиков
   */
  initializeHandlers() {
    // Регистрация обработчиков
    this.registerHandler('terminal', new TerminalHandler(this.server));
    this.registerHandler('file', new FileHandler(this.server));
    this.registerHandler('search', new SearchHandler(this.server));

    this.logger.info('MCP Handlers initialized', {
      handlers: Array.from(this.handlers.keys())
    });
  }

  /**
   * Регистрация обработчика
   */
  registerHandler(name, handler) {
    if (!(handler instanceof BaseToolHandler)) {
      throw new Error(`Handler ${name} must extend BaseToolHandler`);
    }

    this.handlers.set(name, handler);
    this.logger.info(`Handler ${name} registered`);

    // Подписка на события обработчика
    handler.on('error', (error) => {
      this.emit('handlerError', { handler: name, error });
    });
  }

  /**
   * Получение обработчика по имени
   */
  getHandler(name) {
    return this.handlers.get(name);
  }

  /**
   * Получение всех инструментов
   */
  getAllTools() {
    const tools = [];
    
    for (const [name, handler] of this.handlers) {
      const handlerTools = handler.getTools();
      tools.push(...handlerTools.map(tool => ({
        ...tool,
        handler: name
      })));
    }

    return tools;
  }

  /**
   * Обработка вызова инструмента
   */
  async handleToolCall(id, params) {
    const { name, arguments: args } = params;

    this.logger.info(`Tool call received`, {
      id,
      tool: name,
      args: JSON.stringify(args)
    });

    // Поиск обработчика по имени инструмента
    let targetHandler = null;
    for (const [handlerName, handler] of this.handlers) {
      const handlerTools = handler.getTools();
      if (handlerTools.some(tool => tool.name === name)) {
        targetHandler = handler;
        break;
      }
    }

    if (!targetHandler) {
      const error = `Tool ${name} not found`;
      this.logger.error(error, {
        availableTools: this.getAllTools().map(t => t.name)
      });
      throw new HandlerError(error, 'TOOL_NOT_FOUND', 404);
    }

    try {
      const result = await targetHandler.handleRequest(id, args);

      this.logger.info(`Tool call completed successfully`, {
        id,
        tool: name,
        resultType: typeof result
      });

      return {
        success: true,
        data: result,
        metadata: {
          handler: targetHandler.name,
          duration: Date.now(),
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error(`Tool call failed`, {
        id,
        tool: name,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Получение статуса всех обработчиков
   */
  getHandlersStatus() {
    const status = {};

    for (const [name, handler] of this.handlers) {
      status[name] = handler.getStatus();
    }

    return status;
  }

  /**
   * Получение статистики
   */
  getStats() {
    const stats = {
      totalHandlers: this.handlers.size,
      handlers: {},
      tools: this.getAllTools().length
    };

    for (const [name, handler] of this.handlers) {
      stats.handlers[name] = {
        name: handler.name,
        state: handler.state,
        tools: handler.getTools().length
      };
    }

    return stats;
  }

  /**
   * Очистка всех обработчиков
   */
  async cleanup() {
    this.logger.info('Cleaning up MCP handlers');

    for (const [name, handler] of this.handlers) {
      try {
        await handler.cleanup();
        this.logger.info(`Handler ${name} cleaned up`);
      } catch (error) {
        this.logger.error(`Failed to cleanup handler ${name}`, error);
      }
    }
  }
}

export { MCPHandlersManager,
  BaseToolHandler,
  TerminalHandler,
  FileHandler,
  SearchHandler,
  HandlerState,
  ToolType,
  HandlerError,
  ValidationError,
  SecurityError };
