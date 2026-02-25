'use strict';

// Настройка module-alias для корректной работы с путями
try {
  require('./setup-module-alias.cjs');
} catch (setupError) {
  // Если setup-module-alias не найден, это не критично - продолжим без него
  // Логируем только если можем (после инициализации console перехвата)
  if (process.stderr && typeof process.stderr.write === 'function') {
    process.stderr.write(`[MCP-SERVER-WARN] setup-module-alias.cjs not found: ${setupError.message}\n`);
  }
}

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises; // Импортируем асинхронные функции fs.promises

// Таймауты читаются из конфигурации terminal.timeouts или переменных окружения


// Перехватываем console.log и console.error для MCP протокола
// Все логи должны идти в stderr, только JSON RPC ответы в stdout
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

console.log = function (...args) {
  // Проверяем, является ли первый аргумент JSON объектом
  if (args.length === 1 && typeof args[0] === 'string') {
    const message = args[0];
    // Проверяем, начинается ли с { или [ - это может быть JSON
    if ((message.trim().startsWith('{') || message.trim().startsWith('['))) {
      try {
        JSON.parse(message);
        // Это JSON, выводим в stdout без префиксов
        originalStdoutWrite.call(process.stdout, message + '\n');
        return;
      } catch (e) {
        // Не JSON, продолжаем - но логируем если это не ошибка парсинга
        if (e.name !== 'SyntaxError') {
          originalStderrWrite.call(process.stderr, `[MCP-SERVER-DEBUG] JSON parse attempt failed (non-JSON): ${e.message}\n`);
        }
      }
    }
  }

  // Проверяем, содержит ли сообщение уже префикс [MCP-SERVER]
  const fullMessage = args.join(' ');
  if (fullMessage.includes('[MCP-SERVER]')) {
    // Уже содержит префикс, выводим как есть
    originalStderrWrite.call(process.stderr, fullMessage + '\n');
    return;
  }

  // Не JSON и без префикса, добавляем префикс
  originalStderrWrite.call(process.stderr, `[MCP-SERVER] ${fullMessage}\n`);
};

console.error = function (...args) {
  originalStderrWrite.call(process.stderr, `[MCP-SERVER-ERROR] ${args.join(' ')}\n`);
};

// Инициализация module-alias для корректной работы с путями
const moduleAlias = require('module-alias');
const resolvedPath = 'C:\\apps\\libs';
moduleAlias.addAlias('@libs', resolvedPath);

// Centralized System Libraries
const { default: PathUtils } = require('@libs/system/path-utils/index.js');
const fileUtilsFactory = require('@libs/system/file-operations/index.cjs');

// Core Functional Libraries
const { ErrorHandlingUtils } = require('@libs/error-management/error-handler/index.cjs');

// Simple stubs for testing
const LoggingUtils = { log: console.log, error: console.error, info: console.log, warn: console.warn, debug: console.debug };
const AppError = Error;
const ValidationError = Error;
class ValidationUtils {
  constructor(options) {
    this.errorHandler = options?.errorHandler;
    this.logger = options?.logger;
  }
  validate(data, schema) { return { isValid: true, errors: [] }; }
}

// MCP Specific Utilities
require('./set-encoding.cjs');
const { getCurrentDir, setCurrentDir, resetInitialization } = require('./mcp/Workdir.cjs');
const getCurrentDirSync = getCurrentDir; // Alias for compatibility

// Encoding Utilities Integration
const { EncodingUtils } = require('./mcp/server/utils/encoding-utils.cjs');
// History functionality
const { listSessions, loadSessionRecords, getCurrentSessionId, setCurrentSessionId, createAndSwitchSession, persistHistoryRecord } = require('@libs/system/history/index.cjs');
const { sessionVars } = require('@libs/system/session-vars/index.cjs');
const { CommandConverter, commandConverter } = require('./mcp/CommandConverter.cjs');
// Используем локальную обёртку CommandExecutor вместо библиотеки из C:\apps\libs
// Это позволяет использовать реальный execa из node_modules проекта
const { CommandExecutor } = require('./lib/command-executor-wrapper.cjs');
const execa = require('execa');

// Validation and Security Modules
// Импортируем validateAndResolveCwd из правильного места
const { validateAndResolveCwd } = require('./mcp/server/Validation.cjs');
const { validateExecRunParams } = require('@libs/system/command-validation/index.cjs');
const { validatePathWithCategories, validateFsParams } = require('@libs/system/path-validation/index.cjs');
const { analyzeCommand } = require('@libs/system/security-mask/index.cjs');

// Additional Utilities
// validation-utils подключается безопасно внутри конструктора (с fallback)

// Import Handlers (опционально - если файлы отсутствуют, хендлеры будут null)
let TerminalHandler = null;
let ToolsListHandler = null;
let RunTerminalCmdHandler = null;

try {
  const terminalHandlerModule = require('./handlers/terminal-handler.cjs');
  TerminalHandler = terminalHandlerModule.TerminalHandler;
} catch (err) {
  if (process.stderr && typeof process.stderr.write === 'function') {
    process.stderr.write(`[MCP-SERVER-WARN] terminal-handler.cjs not found: ${err.message}\n`);
  }
}

try {
  const toolsListHandlerModule = require('./handlers/tools-list-handler.cjs');
  ToolsListHandler = toolsListHandlerModule.ToolsListHandler;
} catch (err) {
  if (process.stderr && typeof process.stderr.write === 'function') {
    process.stderr.write(`[MCP-SERVER-WARN] tools-list-handler.cjs not found: ${err.message}\n`);
  }
}

try {
  const runTerminalCmdHandlerModule = require('./handlers/run-terminal-cmd-handler.cjs');
  RunTerminalCmdHandler = runTerminalCmdHandlerModule.RunTerminalCmdHandler;
} catch (err) {
  if (process.stderr && typeof process.stderr.write === 'function') {
    process.stderr.write(`[MCP-SERVER-WARN] run-terminal-cmd-handler.cjs not found: ${err.message}\n`);
  }
}

// Импорт DebugSystem
const { debugSystem, DEBUG_CATEGORIES } = require('./mcp/DebugSystem.cjs'); // Импортируем как cjs

class ExecuteCommandMCPServer {
  constructor() {
    // Тихая инициализация без вывода в консоль
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

    // Инициализируем логгер с улучшенной конфигурацией
    const loggerConfig = {
      level: (String(process.env.MCP_TEST_MODE || '').toLowerCase() === 'true' ? 'debug' :
              (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info')).toLowerCase()),
      console: {
        enabled: false, // Отключаем вывод в консоль для MCP протокола
        showTimestamp: true,
        showLevel: true,
        colors: false
      },
      filePath: 'C:\\apps\\root\\mcp\\node-terminal\\logs\\mcp-server.log',
      rotation: {
        maxSize: '5m',
        maxFiles: 3,
        compress: false
      },
      isRpcServer: true,
      errorHandling: {
        logStackTrace: true,
        logUncaughtExceptions: true,
        logUnhandledRejections: true
      }
    };

    this.logger = LoggingUtils;
    this.logger.info('[MCP-SERVER] Logger initialized successfully');

    // Инициализируем PathUtils и FileUtils с правильным логгером
    this.pathUtils = new PathUtils(this.logger);
    this.fileUtils = fileUtilsFactory(this.logger, this.pathUtils);
    
    // Инициализируем EncodingUtils для работы с кодировками
    this.encodingUtils = new EncodingUtils();
    
    // Инициализируем глобальную историю команд (опционально, может быть null)
    this.globalHistory = null;
    
    this.logger.info('[MCP-SERVER] Core components initialized successfully');

    // Обновляем errorHandler с логгером
    this.errorHandler = new ErrorHandlingUtils({ logger: this.logger, pathUtils: this.pathUtils });

    // Инициализируем errorUtils и consoleUtils с правильным errorHandler и logger
    this.logger.info('[MCP-SERVER] Creating ErrorUtils instance...');
    // Используем errorUtils из error-utils.cjs как объект, а не класс
    const { errorUtils } = require('@libs/error-management/error-handler/error-utils.cjs');
    this.errorUtils = errorUtils;
    this.logger.info('[MCP-SERVER] ErrorUtils instance created successfully');

    const { ConsoleUtils } = require('@libs/logging-monitoring/logging/console-utils.js');
    this.consoleUtils = new ConsoleUtils({ logger: this.logger });

    // Инициализируем локальный адаптер error-core и подвешиваем его на errorHandler
    const { createErrorCoreAdapter } = require('./mcp/server/core/error-core-adapter.cjs');
    this.errorCore = createErrorCoreAdapter({
      errorUtils: this.errorUtils,
      errorHandler: this.errorHandler,
      logger: this.logger,
      externalErrorCoreManager: this.errorHandler && this.errorHandler.errorCoreManager,
    });
    if (this.errorHandler) {
      this.errorHandler.errorCoreManager = this.errorCore;
    }

    // Инициализируем validationUtils с безопасным импортом и fallback
    try {
      const validationModule = require('@libs/validation/validation/validation-utils.cjs');
      const ValidationUtilsClass = validationModule.ValidationUtils;
      const validationUtilsFromModule = validationModule.validationUtils || validationModule;

      if (ValidationUtilsClass && typeof ValidationUtilsClass === 'function') {
        this.validationUtils = new ValidationUtilsClass({ errorHandler: this.errorHandler, logger: this.logger });
      } else if (validationUtilsFromModule && typeof validationUtilsFromModule === 'object') {
        this.validationUtils = validationUtilsFromModule;
      } else {
        throw new Error('Invalid validation-utils.cjs export structure');
      }
    } catch (validationError) {
      this.logger.warn(`[MCP-SERVER] validation-utils.cjs not found or invalid: ${validationError.message}`);
      // Fallback validation utils
      this.validationUtils = {
        validate: (data, schema) => {
          // Basic validation fallback - поддерживает разные форматы schema
          const errors = [];
          if (schema) {
            // Поддержка формата { field: { type: 'string', required: true } }
            if (schema.properties) {
              for (const [key, rule] of Object.entries(schema.properties)) {
                if (rule.required && (data[key] === undefined || data[key] === null)) {
                  errors.push(`${key} is required`);
                }
                if (data[key] !== undefined && rule.type && typeof data[key] !== rule.type) {
                  errors.push(`${key} must be of type ${rule.type}`);
                }
              }
            } else {
              // Поддержка простого формата { field: rule }
              for (const [key, rule] of Object.entries(schema)) {
                if (rule.required && (data[key] === undefined || data[key] === null)) {
                  errors.push(`${key} is required`);
                }
                if (data[key] !== undefined && rule.type && typeof data[key] !== rule.type) {
                  errors.push(`${key} must be of type ${rule.type}`);
                }
              }
            }
          }
          return { isValid: errors.length === 0, errors };
        },
        isString: (val) => typeof val === 'string',
        isNumber: (val) => typeof val === 'number',
        isArray: (val) => Array.isArray(val),
        isFunction: (val) => typeof val === 'function',
      };
    }

    // Инициализируем DebugSystem
    this.debugSystem = debugSystem; // Используем импортированный debugSystem
    this.DEBUG_CATEGORIES = DEBUG_CATEGORIES;

    // RuntimeModeUtils disabled - redundant overhead
    // this.runtimeModeUtils = new RuntimeModeUtils(this.logger, this.errorUtils, this.validationUtils, this.debugSystem);

    // Создаем директорию для логов (путь берем из настроек логгера)
    this.logPath = this.logger.filePath;
    this.logger.debug(`MCP Server Log Path: ${this.logPath}`);

    // Инициализируем остальные компоненты
    this.commandExecutor = new CommandExecutor(this.logger, this.errorHandler);

    // Инициализируем обработчики ПОСЛЕ инициализации fsCommands
    if (TerminalHandler) {
      this.terminalHandler = new TerminalHandler(this);
    } else {
      this.terminalHandler = null;
      this.logger.warn('[MCP-SERVER] TerminalHandler not available - handlers/terminal-handler.cjs not found');
    }

    if (ToolsListHandler) {
      this.toolsListHandler = new ToolsListHandler(this);
    } else {
      this.toolsListHandler = null;
      this.logger.warn('[MCP-SERVER] ToolsListHandler not available - handlers/tools-list-handler.cjs not found');
    }

    // Инициализируем runTerminalCmdHandler только если он включен в конфигурации
    if (RunTerminalCmdHandler) {
      try {
        const terminalConfig = this.mcpConfig && this.mcpConfig.terminal;
        const toolsConfig = terminalConfig && terminalConfig.tools;
        const runTerminalCmdEnabled = toolsConfig ? toolsConfig.runTerminalCmdEnabled !== false : true;

        if (runTerminalCmdEnabled) {
          this.runTerminalCmdHandler = new RunTerminalCmdHandler(this);
          this.logger.debug('[MCP-SERVER] run_terminal_cmd handler initialized');
        } else {
          this.runTerminalCmdHandler = null;
          this.logger.debug('[MCP-SERVER] run_terminal_cmd handler disabled by configuration');
        }
      } catch (configError) {
        this.logger.debug(`[MCP-SERVER] Config error for run_terminal_cmd handler: ${configError.message}`);
        this.runTerminalCmdHandler = new RunTerminalCmdHandler(this); // fallback to enabled
      }
    } else {
      this.runTerminalCmdHandler = null;
      this.logger.warn('[MCP-SERVER] RunTerminalCmdHandler not available - handlers/run-terminal-cmd-handler.cjs not found');
    }


    // Делаем категории путей доступными через сервер
    // Path categories disabled - redundant overhead
    // this.ALLOWED_PATH_CATEGORIES = ALLOWED_PATH_CATEGORIES;
    // this.FORBIDDEN_PATH_PATTERNS = FORBIDDEN_PATH_PATTERNS;
    this.validateFsParams = validateFsParams; // Добавляем validateFsParams в экземпляр сервера
    this.validateAndResolveCwd = validateAndResolveCwd; // Добавляем validateAndResolveCwd в экземпляр сервера
    
    // Конфигурация - принудительно устанавливаем большие таймауты
    const hangTimeout = Number(process.env.HANG_TIMEOUT_MS || 120000);
    const jestProxyTimeout = Number(process.env.JEST_PROXY_TIMEOUT_MS || 120000);
    
    // Using ValidationUtils for configuration validation (with defensive checks)
    const configValidationResultRaw = this.validationUtils
      ? this.validationUtils.validate(
          { hangTimeout, jestProxyTimeout },
          {
            hangTimeout: { type: 'number', min: 1, required: true },
            jestProxyTimeout: { type: 'number', min: 1, required: true },
          },
        )
      : { errors: [] };

    const hasErrorsArray =
      configValidationResultRaw &&
      Object.prototype.hasOwnProperty.call(configValidationResultRaw, 'errors') &&
      Array.isArray(configValidationResultRaw.errors);

    const configValidationResult = hasErrorsArray
      ? configValidationResultRaw
      : {
          errors: [],
        };

    if (!hasErrorsArray) {
      this.logger.warn(
        `[MCP-SERVER] Config validation returned unexpected structure, falling back to empty errors array: ${JSON.stringify(
          configValidationResultRaw,
        )}`,
      );
    }

    if (configValidationResult.errors.length > 0) {
      throw new ValidationError(
        'Invalid configuration parameters: ' + configValidationResult.errors.join(', '),
        400,
        'INVALID_CONFIG',
      );
    }
    
    this.config = { hangTimeoutMs: hangTimeout, jestProxyTimeoutMs: jestProxyTimeout, logDir: process.env.LOG_DIR || 'logs' };
    this.logger.debug(`MCP Server Config: ${JSON.stringify(this.config)}`);
    
    // Создаем активную сессию истории при запуске
    if (!getCurrentSessionId()) {
      createAndSwitchSession('mcp-server-startup');
      // this.autoSetDefaultCwd(); // ЭТО ТАКЖЕ БУДЕТ В initializeServer
    }
  }

  async initializeServer() {
    this.logger.info('[MCP-SERVER] Initializing server...');
    await this.loadMCPConfig();
    await this.autoSetDefaultCwd();
    await this.updateToolsList();
    this.logger.info('[MCP-SERVER] Server initialized successfully.');
  }

  /**
   * Обновляет список инструментов при старте сервера
   */
  async updateToolsList() {
    try {
      this.logger.info('[MCP-SERVER] Updating tools list...');

      // Проверяем доступность всех обработчиков
      const handlers = [
        { name: 'terminal', handler: this.terminalHandler },
        { name: 'run_terminal_cmd', handler: this.runTerminalCmdHandler }
      ];

      const availableTools = [];
      for (const { name, handler } of handlers) {
        // Специальная проверка для run_terminal_cmd
        if (name === 'run_terminal_cmd') {
          // Проверяем настройку в конфигурации
          const terminalConfig = this.mcpConfig && this.mcpConfig.terminal;
          const toolsConfig = terminalConfig && terminalConfig.tools;
          const runTerminalCmdEnabled = toolsConfig ? toolsConfig.runTerminalCmdEnabled !== false : false; // По умолчанию false если конфиг не загружен

          this.logger.debug(`[MCP-SERVER] run_terminal_cmd config check: enabled=${runTerminalCmdEnabled}, handler exists=${!!handler}`);

          if (runTerminalCmdEnabled && handler) {
            availableTools.push(name);
            this.logger.debug(`[MCP-SERVER] Tool '${name}' is available`);
          } else {
            this.logger.debug(`[MCP-SERVER] Tool '${name}' is disabled by configuration`);
          }
        } else if (name === 'terminal') {
          // terminal всегда доступен (есть fallback механизм через CommandExecutor)
          availableTools.push(name);
          if (handler) {
            this.logger.debug(`[MCP-SERVER] Tool '${name}' is available (with handler)`);
          } else {
            this.logger.debug(`[MCP-SERVER] Tool '${name}' is available (using fallback)`);
          }
        } else if (handler) {
          availableTools.push(name);
          this.logger.debug(`[MCP-SERVER] Tool '${name}' is available`);
        } else {
          this.logger.warn(`[MCP-SERVER] Tool '${name}' handler is not available`);
        }
      }

      this.logger.info(`[MCP-SERVER] Tools list updated: ${availableTools.join(', ')}`);
      
      // Сохраняем список доступных инструментов для использования в handleToolsList
      this.availableTools = availableTools;
      
    } catch (error) {
      this.logger.error(`[MCP-SERVER] Error updating tools list: ${error.message}`, error);
      // Устанавливаем базовый список инструментов в случае ошибки
      this.availableTools = ['terminal'];
    }
  }

  // Helper schemas for validation
  _getExecRunSchema() {
      return {
          command: { type: 'string', required: true, minLength: 1 },
          timeout: { type: 'number', min: 1, max: 3600, default: 120 },
          is_background: { type: 'boolean', default: false },
          cwd: { type: 'string', optional: true }
      };
  }

  _getFsParamsSchemas() {
      return {
          list: {
              path: { type: 'string', required: true },
              recursive: { type: 'boolean', default: false } // Добавляем опцию recursive
          },
          read: {
              path: { type: 'string', required: true },
              start: { type: 'number', optional: true, min: 0 },
              end: { type: 'number', optional: true, min: 0 }
          },
          write: {
              path: { type: 'string', required: true },
              content: { type: 'string', required: true },
              mode: { type: 'string', optional: true, enum: ['overwrite', 'append'], default: 'overwrite' }
          },
          copy: {
              source: { type: 'string', required: true },
              destination: { type: 'string', required: true }
          },
          move: {
              source: { type: 'string', required: true },
              destination: { type: 'string', required: true }
          },
          delete: {
              path: { type: 'string', required: true },
              recursive: { type: 'boolean', default: false }
          }
      };
  }

  /**
   * Получить текущий CWD для отображения в подсказках
   */
  _getDisplayCwd() {
    try {
      // Сначала проверяем сессионную директорию
      const sessionCwd = this.terminalHandler ? this.terminalHandler._getSessionCwd() : null;
      if (sessionCwd) {
        return sessionCwd;
      }

      // Затем проверяем рабочую директорию проекта
      if (sessionVars.hasProjectWorkspace()) {
        return sessionVars.getProjectWorkspace();
      }

      // Используем системную директорию как fallback
      return getCurrentDirSync();
    } catch (error) {
      this.logger.warn(`Error getting display CWD: ${error.message}`);
      return process.cwd();
    }
  }

  /**
   * Создать улучшенную подсказку с текущим CWD
   */
  _createCwdAwareMessage(baseMessage) {
    try {
      const currentCwd = this._getDisplayCwd();
      const terminalConfig = this.mcpConfig && this.mcpConfig.terminal ? this.mcpConfig.terminal : {};
      const showCwdInPrompts = terminalConfig.showCwdInPrompts !== false;

      if (showCwdInPrompts && currentCwd) {
        return `${baseMessage}\n\n📁 Текущая директория: ${currentCwd}`;
      }

      return baseMessage;
    } catch (error) {
      this.logger.warn(`Error creating CWD-aware message: ${error.message}`);
      return baseMessage;
    }
  }

  /**
   * Автоматически устанавливает рабочую директорию по умолчанию
   */
  async autoSetDefaultCwd() {
    try {
      // Сначала пытаемся получить рабочую директорию из конфигурации terminal.defaultCwd
      let defaultCwd = null;

      if (this.mcpConfig && this.mcpConfig.terminal && this.mcpConfig.terminal.defaultCwd) {
        defaultCwd = this.mcpConfig.terminal.defaultCwd;
        this.logger.info(`[MCP-SERVER] Found default CWD in terminal config: ${defaultCwd}`);
      }

      // Если не найдено в terminal config, используем текущую директорию процесса
      if (!defaultCwd) {
        defaultCwd = process.cwd();
        this.logger.info(`[MCP-SERVER] Using process CWD as default: ${defaultCwd}`);
      }

      if (defaultCwd) {
        // Проверяем, что путь существует и является директорией
        try {
          const stats = await fsp.stat(defaultCwd);
          if (stats.isDirectory()) {
            if (!sessionVars.hasProjectWorkspace()) {
              sessionVars.setProjectWorkspace(defaultCwd);
              resetInitialization();
              this.logger.info(`[MCP-SERVER] Default CWD set from config/environment: ${defaultCwd}`);

              // Показываем подсказки пользователю
        if (this.mcpConfig && this.mcpConfig.terminal && this.mcpConfig.terminal.autoSetDefaultCwd !== false) {
          this.logger.info(`[MCP-SERVER] 💡 Автоматически установлена рабочая директория: ${defaultCwd}`);
          this.logger.info(`[MCP-SERVER] 💡 Используйте 'pwd' или {"action": "pwd"} для проверки текущей директории`);
          this.logger.info(`[MCP-SERVER] 💡 Используйте {"action": "workspace", "subAction": "set"} для изменения директории`);
        }
            }
            return;
          }
        } catch (statError) {
          this.logger.warn(`Configured CWD path not accessible: ${defaultCwd}, error: ${statError.message}`);
        }
      }

      // Если конфигурация не установлена или недоступна, используем текущую директорию
      const fallbackCwd = process.cwd();
      if (!sessionVars.hasProjectWorkspace()) {
        sessionVars.setProjectWorkspace(fallbackCwd);
        resetInitialization();
        this.logger.info(`[MCP-SERVER] Default CWD set to fallback: ${fallbackCwd}`);

        // Показываем подсказку о настройке CWD в конфиге
        if (this.mcpConfig && this.mcpConfig.terminal && this.mcpConfig.terminal.autoSetDefaultCwd !== false) {
          this.logger.info(`[MCP-SERVER] 💡 Для настройки рабочей директории по умолчанию добавьте в секцию terminal:`);
          this.logger.info(`[MCP-SERVER] 💡 "defaultCwd": "${fallbackCwd}"`);
        }
      }

      // Дополнительно устанавливаем рабочую директорию для текущей сессии
      try {
        // Импортируем функции для работы с сессией
        const { setCurrentDir, getCurrentDirSync } = require('@libs/app-framework/system-utils/workdir-utils/index.cjs');
        if (setCurrentDir && typeof setCurrentDir === 'function') {
          const sessionCwd = defaultCwd || fallbackCwd;
          setCurrentDir(sessionCwd);
          this.logger.info(`[MCP-SERVER] Session CWD set to: ${sessionCwd}`);
        }
      } catch (sessionError) {
        this.logger.warn(`Failed to set session CWD: ${sessionError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error setting default CWD: ${error.message}`);
      // Даже при ошибке пытаемся установить fallback
      try {
        const fallbackCwd = process.cwd();
        if (!sessionVars.hasProjectWorkspace()) {
          sessionVars.setProjectWorkspace(fallbackCwd);
          resetInitialization();
          this.logger.info(`[MCP-SERVER] Fallback CWD set after error: ${fallbackCwd}`);
        }
      } catch (fallbackError) {
        this.logger.error(`Fallback CWD setting also failed: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Загружает конфигурацию из mcp.json
   */
  async loadMCPConfig() {
    try {
      // Путь к mcp.json - проверяем несколько возможных расположений
      const possiblePaths = [
        'C:\\apps\\.cursor\\mcp.json', // Основной путь
        path.join(process.cwd(), '..', '..', '.cursor', 'mcp.json'),
        path.join(__dirname, '..', '..', '..', '..', '.cursor', 'mcp.json'),
        path.join(process.cwd(), '.cursor', 'mcp.json'),
        path.join(__dirname, '..', '..', '.cursor', 'mcp.json')
      ];

      let configContent = null;
      let configPath = null;

      // Пытаемся прочитать mcp.json из возможных расположений
      for (const testPath of possiblePaths) {
        try {
          await fsp.access(testPath, fs.constants.F_OK); // Проверяем существование
          configContent = await fsp.readFile(testPath, 'utf8');
          configPath = testPath;
          this.logger.debug(`MCP config loaded from: ${configPath}`);
          break;
        } catch (pathError) {
          // Продолжаем поиск, если путь недоступен
          this.logger.debug(`Failed to check or read path ${testPath}: ${pathError.message}`);
        }
      }

      if (configContent) {
        this.mcpConfig = JSON.parse(configContent);
        this.logger.info('[MCP-SERVER] MCP configuration loaded successfully');

        // Применяем переменные окружения из конфигурации
        if (this.mcpConfig.env) {
          Object.entries(this.mcpConfig.env).forEach(([key, value]) => {
            if (!process.env[key]) {
              process.env[key] = value;
              this.logger.debug(`Environment variable set: ${key}=${value}`);
            }
          });
        }

        // Применяем настройки терминала
        if (this.mcpConfig.terminal) {
          const terminalConfig = this.mcpConfig.terminal;

          // Устанавливаем таймауты из конфигурации
          if (terminalConfig.timeouts) {
            const timeouts = terminalConfig.timeouts;
            process.env.HANG_TIMEOUT_MS = timeouts.hangTimeoutMs?.toString() || '120000';
            process.env.JEST_PROXY_TIMEOUT_MS = timeouts.jestProxyTimeoutMs?.toString() || '120000';
            this.logger.debug(`Terminal timeouts applied: hang=${timeouts.hangTimeoutMs}, jest=${timeouts.jestProxyTimeoutMs}`);
          }

          // Уровень логирования теперь определяется архитектурой автоматически
          // terminal.logging.level больше не используется

          this.logger.info('[MCP-SERVER] Terminal configuration applied successfully');
        }
      } else {
        this.logger.warn('[MCP-SERVER] MCP configuration not found, using defaults');
        this.logger.debug(`Searched paths: ${possiblePaths.join(', ')}`);
        this.mcpConfig = {};
      }
    } catch (error) {
      this.logger.error(`[MCP-SERVER] Error loading MCP config: ${error.message}`);
      this.mcpConfig = {};
    }
  }

  // MCP протокол: initialize
  handleInitialize(id, params) {
    this.logger.debug(`Handling initialize request with ID: ${id}, params: ${JSON.stringify(params)}`);
    const result = {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'mcp-node-terminal-server',
          version: '2.0.0',
          description: 'MCP Terminal Server with comprehensive terminal, file, search, archive, test, and propose operations'
        },
        capabilities: {
          tools: {
            list: true,
            call: true
          },
          logging: {
            level: this.logger.level,
            file: this.logger.filePath
          },
          metrics: {
            enabled: true,
            sampling: {}
          },
          security: {
            analyzer: true,
            pathValidation: true
          },
          session: {
            history: true,
            workspace: true
          },
          mode: {
            supportedModes: ['standard'], // RuntimeModeUtils disabled
            currentMode: 'standard' // RuntimeModeUtils disabled
          },
          emulatedCommands: CommandConverter.listEmulatedCommands().map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            tool: cmd.tool,
            action: cmd.action,
            subAction: cmd.subAction
          }))
        }
      }
    };
    this.logger.debug(`Initialize response: ${JSON.stringify(result)}`);
    return result;
  }

  // MCP протокол: ListOfferings (для клиентов, которые запрашивают информацию о сервере)
  handleListOfferings(id) {
    // Отключаем логирование для MCP протокола
    return {
      jsonrpc: '2.0',
      id,
      result: {
        serverInfo: {
          name: 'mcp-node-terminal-server',
          version: '2.0.0',
          description: 'MCP Terminal Server with comprehensive terminal, file, search, archive, test, and propose operations'
        },
        capabilities: {
          tools: {
            list: true,
            call: true
          },
          logging: {
            level: this.logger.level,
            file: this.logger.filePath
          },
          metrics: {
            enabled: true,
            sampling: {}
          },
          security: {
            analyzer: true,
            pathValidation: true
          },
          session: {
            history: true,
            workspace: true
          },
          mode: {
            supportedModes: ['standard'], // RuntimeModeUtils disabled
            currentMode: 'standard' // RuntimeModeUtils disabled
          },
          emulatedCommands: CommandConverter.listEmulatedCommands().map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            tool: cmd.tool,
            action: cmd.action,
            subAction: cmd.subAction
          }))
        }
      }
    };
  }

  handleToolsList(id) {
    this.logger.debug(`[MCP-SERVER] Handling tools/list request with ID: ${id}`);

    // Получаем список доступных инструментов с учетом настроек
    let availableTools = this.availableTools || [];
    
    // terminal всегда доступен (есть fallback механизм)
    if (!availableTools.includes('terminal')) {
      availableTools.push('terminal');
      this.logger.debug('[MCP-SERVER] Added terminal to available tools (fallback available)');
    }
    
    // Если список пустой после обновления, логируем предупреждение
    if (availableTools.length === 0) {
      this.logger.warn('[MCP-SERVER] No handlers available, but terminal should still work with fallback');
    }

    // run_terminal_cmd добавляется в updateToolsList() с учетом конфигурации
    
    const tools = [
      {
        name: 'terminal',
        description: 'Выполнение команд терминала с полной поддержкой сессионных директорий, таймаутов, фонового режима, безопасности и логирования. Поддерживает автоматическую установку workspace, чтение начального вывода фоновых процессов и управление рабочими директориями через cd/pushd/popd.',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Команда для выполнения в терминале (PowerShell на Windows, bash на Linux/macOS). Поддерживает пайпы, перенаправление вывода, переменные окружения и условные операторы.'
            },
            timeout: {
              type: 'number',
              description: 'Таймаут выполнения команды в секундах. Диапазон: 1-1200 секунд (до 20 минут). По умолчанию: 120 секунд (2 минуты). Команда будет прервана при превышении таймаута.'
            },
            is_background: {
              type: 'boolean',
              description: 'Запустить команду в фоновом режиме. При true команда выполняется асинхронно, процесс продолжает работать после возврата ответа. Возвращает processId для последующего управления процессом. По умолчанию: false.'
            },
            cwd: {
              type: 'string',
              description: 'Рабочая директория для выполнения команды. Если не указана, используется текущая сессионная директория или workspace. Приоритет: args.cwd > WORKSPACE_ROOT (env) > сессионная CWD > системная CWD.'
            },
            readInitialOutput: {
              type: 'boolean',
              description: 'При запуске в фоне (is_background=true) прочитать начальный вывод процесса после задержки. Полезно для проверки успешного запуска серверов и длительных процессов. По умолчанию: false.'
            },
            initialOutputDelay: {
              type: 'number',
              description: 'Задержка в секундах перед чтением начального вывода при readInitialOutput=true. Диапазон: 0.5-10 секунд. По умолчанию: 2 секунды.'
            }
          },
          required: ['command']
        }
      },
      {
        name: 'run_terminal_cmd',
        description: 'Legacy терминал с расширенной поддержкой структурированных действий и пакетного выполнения команд. Включает управление workspace, историей команд, режимами работы и пакетное выполнение. Может быть отключен через конфигурацию (terminal.tools.runTerminalCmdEnabled).',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Команда для выполнения в терминале или параметр для структурированных действий (workspace set, mode set). Для action=exec - команда терминала. Для action=workspace/mode - путь или значение параметра.'
            },
            timeout: {
              type: 'number',
              description: 'Таймаут выполнения команды в секундах. Диапазон: 1-1200 секунд (до 20 минут). По умолчанию: 120 секунд. Применяется только для action=exec.'
            },
            is_background: {
              type: 'boolean',
              description: 'Запустить команду в фоновом режиме. Применяется только для action=exec. По умолчанию: false.'
            },
            cwd: {
              type: 'string',
              description: 'Рабочая директория для выполнения команды. Применяется только для action=exec. Если не указана, используется текущая сессионная директория или workspace.'
            },
            action: {
              type: 'string',
              enum: ['exec', 'history', 'mode', 'workspace', 'batch', 'session', 'pwd'],
              description: 'Тип структурированного действия: exec - выполнение команды, history - работа с историей, mode - управление режимами, workspace - управление рабочей директорией, batch - пакетное выполнение, session - управление сессией, pwd - информация о директориях.'
            },
            subAction: {
              type: 'string',
              description: 'Поддействие для структурированных команд. Зависит от action: для workspace - set/get, для history - show/list/current, для mode - set/get/list, для session - cwd/reset/info, для pwd - не требуется.'
            },
            commands: {
              type: 'array',
              items: { type: 'string' },
              description: 'Массив команд для пакетного выполнения (только для action=batch). Команды выполняются последовательно. При stopOnError=true выполнение прерывается на первой ошибке.'
            },
            stopOnError: {
              type: 'boolean',
              description: 'Остановиться на первой ошибке при пакетном выполнении (action=batch). Если true, выполнение прерывается при ошибке любой команды. Если false, все команды выполняются независимо от ошибок. По умолчанию: true.'
            },
            path: {
              type: 'string',
              description: 'Путь для установки workspace (action=workspace, subAction=set). Если не указан, используется текущая директория.'
            },
            workspace: {
              type: 'string',
              description: 'Альтернативное имя параметра для path при установке workspace (action=workspace, subAction=set).'
            }
          },
          required: ['command']
        }
      },
    ];
    
    // Фильтруем инструменты по доступности
    // Если availableTools пустой (хендлеры отсутствуют), все равно возвращаем инструменты
    // чтобы они были видны в списке, но при вызове будет ошибка
    let filteredTools;
    if (availableTools.length === 0) {
      // Если хендлеры отсутствуют, возвращаем все инструменты с предупреждением
      this.logger.warn('[MCP-SERVER] No handlers loaded - tools will return errors when called. Returning tools list for information.');
      filteredTools = tools; // Возвращаем все инструменты
    } else {
      filteredTools = tools.filter(tool => availableTools.includes(tool.name));
    }
    
    this.logger.info(`[MCP-SERVER] Returning ${filteredTools.length} available tools: ${filteredTools.map(t => t.name).join(', ')}`);
    
    return { jsonrpc: '2.0', id, result: { tools: filteredTools } };
  }

  /**
   * Обрабатывает запрос на обновление списка инструментов
   */
  async handleUpdateToolsList(id) {
    try {
      this.logger.info(`[MCP-SERVER] Handling update tools list request with ID: ${id}`);
      await this.updateToolsList();
      
      return {
        jsonrpc: '2.0',
        id,
        result: {
          success: true,
          message: 'Tools list updated successfully',
          availableTools: this.availableTools || []
        }
      };
    } catch (error) {
      this.logger.error(`[MCP-SERVER] Error updating tools list: ${error.message}`, error);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Failed to update tools list: ${error.message}`,
          data: error.stack
        }
      };
    }
  }

  // Делегирование методов обработчикам
  async handleToolCall(id, name, args) {
    const startTime = Date.now();
    let result = null;
    let error = null;
    let success = false;
    
    // Инициализируем глобальную историю, если ещё не инициализирована (опционально)
    if (!this.globalHistory) {
      try {
        const { getGlobalCommandHistory } = require('./lib/global-command-history.cjs');
        this.globalHistory = getGlobalCommandHistory();
      } catch (historyError) {
        // Модуль истории отсутствует - продолжаем без истории
        this.globalHistory = null;
        if (this.logger) {
          this.logger.debug(`[GlobalHistory] Module not available: ${historyError.message}`);
        }
      }
    }
    
    // Извлекаем команду из аргументов (поддерживаем разные форматы)
    let command = '';
    if (args?.command) {
      command = args.command;
    } else if (args?.arguments?.command) {
      command = args.arguments.command;
    } else if (args?.arguments?.action === 'exec' && args?.arguments?.command) {
      command = args.arguments.command;
    } else if (typeof args === 'string') {
      // Если args - это строка команды (legacy)
      command = args;
    }
    
    // Извлекаем рабочую директорию
    const cwd = args?.cwd || args?.arguments?.cwd || args?.workspace || process.env.WORKSPACE_ROOT || process.cwd();
    
    // Локальный хелпер для нормализации payload глобальной истории
    const normalizeHistoryPayload = (payload, isSuccess) => {
      const normalized = Object.assign({}, payload);
      
      // duration: всегда number, без NaN и null
      if (typeof normalized.duration !== 'number' || Number.isNaN(normalized.duration)) {
        normalized.duration = 0;
      }
      
      // success: гарантируем boolean
      if (typeof normalized.success !== 'boolean') {
        normalized.success = !!isSuccess;
      }
      
      // stderr/error: для success=false должен быть хоть какой-то текст
      if (normalized.success === false) {
        const hasErr =
          (typeof normalized.stderr === 'string' && normalized.stderr.length > 0) ||
          (typeof normalized.error === 'string' && normalized.error.length > 0);
        if (!hasErr) {
          normalized.stderr = normalized.stderr || normalized.error || 'Unknown error';
        }
      }
      
      return normalized;
    };
    
    try {
      // Проверяем доступность run_terminal_cmd
      if (name === 'run_terminal_cmd') {
        if (!this.runTerminalCmdHandler) {
          throw new AppError('run_terminal_cmd tool is disabled in configuration', 400, 'TOOL_DISABLED');
        }
      }

      // Выполняем команду
      switch (name) {
        case 'terminal':
          if (!this.terminalHandler) {
            // Fallback: выполняем команду напрямую через CommandExecutor
            if (!command) {
              throw new AppError('Command is required', 400, 'MISSING_COMMAND');
            }
            const timeout = args?.timeout || 120;
            const isBackground = args?.is_background || false;
            
            this.logger.debug(`[Terminal-Fallback] Executing command: ${command}, cwd: ${cwd}, timeout: ${timeout}`);
            
            const execResult = await this.commandExecutor.execute({
              command: command,
              cwd: cwd,
              timeout: timeout * 1000, // CommandExecutor ожидает миллисекунды
              isBackground: isBackground
            });
            
            // Форматируем результат в MCP формат
            result = {
              content: [{
                type: 'text',
                text: execResult.stdout || execResult.stderr || ''
              }]
            };
          } else {
            result = await this.terminalHandler.handleTerminalTool(id, args);
          }
          break;
        case 'run_terminal_cmd':
          if (!this.runTerminalCmdHandler) {
            throw new AppError('run_terminal_cmd tool is disabled or handler not available', 400, 'TOOL_DISABLED');
          }
          result = await this.runTerminalCmdHandler.handleRunTerminalCmd(id, args);
          break;
        default:
          throw new AppError(`Unknown tool: ${name}`, 400, 'UNKNOWN_TOOL');
      }
      
      success = true;
      
      // Извлекаем stdout/stderr/exitCode из результата
      // Результат от обработчиков имеет формат: { content: [{ type: 'text', text: '...' }] }
      let stdout = null;
      let stderr = null;
      let exitCode = null;
      
      if (result) {
        // MCP response формат: { content: [{ type: 'text', text: '...' }] }
        if (result.content && Array.isArray(result.content)) {
          const textParts = result.content
            .filter(item => item && item.type === 'text' && item.text)
            .map(item => item.text)
            .join('\n');
          if (textParts) {
            stdout = textParts;
          }
        }
        // Прямой формат: { stdout, stderr, exitCode, return_code }
        else if (typeof result === 'object') {
          stdout = result.stdout || result.output || null;
          stderr = result.stderr || result.error || null;
          exitCode = result.exitCode || result.return_code || null;
        }
        // Строковый результат
        else if (typeof result === 'string') {
          stdout = result;
        }
      }
      
      // Сохраняем в глобальную историю (асинхронно, не блокируем ответ)
      if (this.globalHistory) {
        const duration = Date.now() - startTime;
        const historyPayload = normalizeHistoryPayload({
          tool: name,
          command: command,
          args: args,
          stdout: stdout,
          stderr: stderr,
          exitCode: exitCode,
          success: true,
          cwd: cwd,
          duration: duration,
          sessionId: getCurrentSessionId(),
          workspaceRoot: process.env.WORKSPACE_ROOT || null,
          metadata: {
            requestId: id
          }
        }, true);
        
        this.globalHistory.saveCommand(historyPayload).catch(err => {
          // Логируем ошибку, но не прерываем выполнение
          if (this.logger) {
            this.logger.debug(`[GlobalHistory] Failed to save command: ${err.message}`);
          }
        });
      }
      
      return result;
    } catch (err) {
      error = err;
      success = false;
      
      // Сохраняем ошибку в глобальную историю
      if (this.globalHistory) {
        const duration = Date.now() - startTime;
        const historyPayload = normalizeHistoryPayload({
          tool: name,
          command: command,
          args: args,
          error: err,
          success: false,
          cwd: cwd,
          duration: duration,
          sessionId: getCurrentSessionId(),
          workspaceRoot: process.env.WORKSPACE_ROOT || null,
          metadata: {
            requestId: id,
            errorCode: err.code || err.statusCode || null
          }
        }, false);
        
        this.globalHistory.saveCommand(historyPayload).catch(histErr => {
          if (this.logger) {
            this.logger.debug(`[GlobalHistory] Failed to save error: ${histErr.message}`);
          }
        });
      }
      
      // Пробрасываем ошибку дальше
      throw err;
    }
  }
}

// Глобальные обработчики ошибок для детального логирования
process.on('warning', (warning) => {
  if (server && server.logger) {
    server.logger.warn(`Node.js warning: ${warning.message}`, {
      name: warning.name,
      code: warning.code,
      stack: warning.stack
    });
  }
});

// Функция для обработки одной строки RPC
async function processRpcLine(line, serverInstance, resetInactivityTimer) {
  resetInactivityTimer();

  let request = null;
  try {
    if (!line || line.trim() === '') {
      serverInstance.logger.debug('Received empty line, ignoring');
      return;
    }

    serverInstance.logger.debug(`[RPC] Received raw line: ${line}`);

    try {
      request = JSON.parse(line);
      serverInstance.logger.debug(`[RPC] Parsed request: ${JSON.stringify(request)}`);
    } catch (parseError) {
      serverInstance.logger.error(`[RPC] JSON parse error: ${parseError.message}`, {
        rawLine: line,
        error: parseError.stack
      });
      serverInstance.logger.warn(`[RPC] Skipping malformed JSON line, continuing...`);
      return;
    }

    if (!request || typeof request !== 'object') {
      serverInstance.logger.warn(`Invalid JSON-RPC request format: ${line}`);
      return;
    }

    if (request.jsonrpc !== '2.0') {
      if (request.id !== undefined) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32600,
            message: 'Invalid JSON-RPC version, expected 2.0'
          }
        };
        console.log(JSON.stringify(errorResponse));
      }
      return;
    }

    if (request.method === undefined || typeof request.method !== 'string') {
      if (request.id !== undefined) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32600,
            message: 'Invalid JSON-RPC message: missing or invalid method'
          }
        };
        console.log(JSON.stringify(errorResponse));
      }
      return;
    }
    
    serverInstance.logger.info(`[RPC] Processing method: ${request.method}`);

    switch (request.method) {
      case 'initialize':
        const initResponse = serverInstance.handleInitialize(request.id, request.params);
        console.log(JSON.stringify(initResponse));
        break;

      case 'tools/list':
        try {
          const toolsResponse = serverInstance.handleToolsList(request.id);
          console.log(JSON.stringify(toolsResponse));
        } catch (error) {
          serverInstance.logger.error(`Tools list error: ${error.message}`, error);
          if (serverInstance && serverInstance.errorHandler && serverInstance.errorHandler.logError) {
            serverInstance.errorHandler.logError(error, { operation: 'tools.list', request });
          }
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: `Failed to list tools: ${error.message}`,
              data: error.stack
            }
          }));
        }
        break;

      case 'update_tools_list':
        try {
          const updateResponse = await serverInstance.handleUpdateToolsList(request.id);
          console.log(JSON.stringify(updateResponse));
        } catch (error) {
          serverInstance.logger.error(`Update tools list error: ${error.message}`, error);
          if (serverInstance && serverInstance.errorHandler && serverInstance.errorHandler.logError) {
            serverInstance.errorHandler.logError(error, { operation: 'update_tools_list', request });
          }
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: `Failed to update tools list: ${error.message}`,
              data: error.stack
            }
          }));
        }
        break;

      case 'ListOfferings':
        try {
          const offeringsResponse = serverInstance.handleListOfferings(request.id);
          console.log(JSON.stringify(offeringsResponse));
        } catch (error) {
          serverInstance.logger.error(`ListOfferings error: ${error.message}`, error);
          if (serverInstance && serverInstance.errorHandler && serverInstance.errorHandler.logError) {
            serverInstance.errorHandler.logError(error, { operation: 'ListOfferings', request });
          }
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: `Failed to list offerings: ${error.message}`,
              data: error.stack
            }
          }));
        }
        break;

      case 'notifications/initialized':
        serverInstance.logger.info(`[NOTIFICATION] Received initialized notification from MCP client`);
        break;

      case 'tools/call':
        const { name, arguments: args } = request.params;
        serverInstance.logger.info(`[TOOLS/CALL] Processing tool: ${name}`);
        serverInstance.logger.debug(`[TOOLS/CALL] Tool call: ${name} with args: ${JSON.stringify(args)}`);

        try {
          const response = await serverInstance.handleToolCall(request.id, name, args);
          console.log(JSON.stringify(response));
        } catch (error) {
          serverInstance.logger.error(`Tool call error: ${error.message}`, error);
          if (serverInstance && serverInstance.errorHandler && serverInstance.errorHandler.logError) {
            serverInstance.errorHandler.logError(error, { operation: 'tools.call', request });
          }
          const errorResponse = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: `Tool call failed: ${error.message}`,
              data: error.stack
            }
          };
          console.log(JSON.stringify(errorResponse));
        }
        break;

      default:
        serverInstance.logger.warn(`Unknown method: ${request.method}`);
        if (request.id !== undefined) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
          console.log(JSON.stringify(errorResponse));
        }
        break;
    }

  } catch (error) {
    serverInstance.logger.error(`[RPC] Unexpected error processing request: ${error.message}`, error);
    
    try {
      const workDir = 'C:\\apps\\system-run\\work';
      if (!fs.existsSync(workDir)) {
        fs.mkdirSync(workDir, { recursive: true });
      }

      const report = {
        checkId: 'mcp-server-rpc-error',
        statusCode: 4,
        statusName: 'ERROR',
        logLevel: 'ERROR',
        action: 'continue',
        description: `RPC Processing Error: ${error.message}`,
        taskType: 'error',
        taskPriority: 'high',
        timestamp: new Date().toISOString(),
        errorDetails: {
          errorMessage: error.message,
          stackTrace: error.stack
        },
        executionContext: {
          chainName: 'mcp-server',
          stepName: 'rpc-processing',
          nodeVersion: process.version,
          platform: process.platform,
          workingDirectory: process.cwd()
        },
        recommendations: [
          'Проверить логи сервера',
          'Убедиться, что клиент отправляет корректные запросы'
        ],
        nextSteps: [
          'Продолжить работу сервера',
          'Мониторить логи на предмет повторения ошибок'
        ]
      };

      const filename = `mcp-server-error-${Date.now()}.json`;
      const outPath = path.join(workDir, filename);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
      serverInstance.logger.info(`Saved error report: ${outPath}`);
    } catch (writeError) {
      serverInstance.logger.error(`Failed to write error report: ${writeError.message}`);
    }

    if (request && request.id !== undefined) {
      const errorResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Internal server error: ${error.message}`,
          data: { 
            errorType: 'internal_server_error',
            timestamp: new Date().toISOString()
          }
        }
      };
      console.log(JSON.stringify(errorResponse));
    }

    serverInstance.logger.info(`[RPC] Error handled, continuing server operation`);
  }
}

// Запуск MCP сервера
const server = new ExecuteCommandMCPServer();
server.initializeServer().catch(err => {
  server.logger.error(`[FATAL ERROR] Failed to initialize MCP Server: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

// Устанавливаем основной обработчик readline ПОСЛЕ инициализации сервера
server.rl.on('line', async (line) => {
  await processRpcLine(line, server, resetInactivityTimer);
});

// Устанавливаем обработчик закрытия readline
server.rl.on('close', () => {
  server.logger.info('MCP Server closing due to readline close.');
  process.exit(0);
});

module.exports = server;

// Таймаут для автоматического завершения (только в режиме разработки)
let inactivityTimer = null;
if (process.env.NODE_ENV === 'development' && process.env.MCP_DEV_TIMEOUT) {
  const timeoutMs = parseInt(process.env.MCP_DEV_TIMEOUT) || 30000;
  server.logger.info(`MCP Server running in development mode with ${timeoutMs}ms timeout`);
  inactivityTimer = setTimeout(() => {
    server.logger.info('MCP Server closing due to development timeout');
    server.rl.close();
    process.exit(0);
  }, timeoutMs);
} else {
  server.logger.info('MCP Server running in production mode (no timeout)');
}

// Сброс таймаута при получении команды (только в режиме разработки)
const resetInactivityTimer = () => {
  if (inactivityTimer && process.env.NODE_ENV === 'development') {
    clearTimeout(inactivityTimer);
    const timeoutMs = parseInt(process.env.MCP_DEV_TIMEOUT) || 30000;
    inactivityTimer = setTimeout(() => {
      server.logger.info('MCP Server closing due to development timeout');
      server.rl.close();
      process.exit(0);
    }, timeoutMs);
  }
};

// Глобальная обработка необработанных исключений - НЕ останавливаем процесс
process.on('uncaughtException', (error) => {
  server.logger.error(`Uncaught Exception: ${error.message}`, error);
  
  // Сохраняем отчёт об ошибке
  try {
    const workDir = 'C:\\apps\\system-run\\work';
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    const report = {
      checkId: 'mcp-server-uncaught-exception',
      statusCode: 4,
      statusName: 'ERROR',
      logLevel: 'ERROR',
      action: 'continue',
      description: `Uncaught Exception: ${error.message}`,
      taskType: 'error',
      taskPriority: 'high',
      timestamp: new Date().toISOString(),
      errorDetails: {
        errorMessage: error.message,
        stackTrace: error.stack
      },
      executionContext: {
        chainName: 'mcp-server',
        stepName: 'uncaught-exception',
        nodeVersion: process.version,
        platform: process.platform,
        workingDirectory: process.cwd()
      },
      recommendations: [
        'Проверить логи сервера',
        'Убедиться, что все обработчики корректно обрабатывают ошибки'
      ],
      nextSteps: [
        'Продолжить работу сервера',
        'Мониторить логи на предмет повторения ошибок'
      ]
    };

    const filename = `mcp-server-uncaught-${Date.now()}.json`;
    const outPath = path.join(workDir, filename);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    server.logger.info(`Saved uncaught exception report: ${outPath}`);
  } catch (writeError) {
    server.logger.error(`Failed to write uncaught exception report: ${writeError.message}`);
  }
  
  // Продолжаем работу сервера
  server.logger.info('Server continuing after uncaught exception');
});

// Глобальная обработка необработанных отклонений промисов
process.on('unhandledRejection', (reason, promise) => {
  server.logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  
  // Сохраняем отчёт об ошибке
  try {
    const workDir = 'C:\\apps\\system-run\\work';
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    const report = {
      checkId: 'mcp-server-unhandled-rejection',
      statusCode: 4,
      statusName: 'ERROR',
      logLevel: 'ERROR',
      action: 'continue',
      description: `Unhandled Rejection: ${reason}`,
      taskType: 'error',
      taskPriority: 'high',
      timestamp: new Date().toISOString(),
      errorDetails: {
        reason: reason,
        promise: promise.toString()
      },
      executionContext: {
        chainName: 'mcp-server',
        stepName: 'unhandled-rejection',
        nodeVersion: process.version,
        platform: process.platform,
        workingDirectory: process.cwd()
      },
      recommendations: [
        'Проверить логи сервера',
        'Убедиться, что все асинхронные операции корректно обрабатывают ошибки'
      ],
      nextSteps: [
        'Продолжить работу сервера',
        'Мониторить логи на предмет повторения ошибок'
      ]
    };

    const filename = `mcp-server-rejection-${Date.now()}.json`;
    const outPath = path.join(workDir, filename);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    server.logger.info(`Saved unhandled rejection report: ${outPath}`);
  } catch (writeError) {
    server.logger.error(`Failed to write unhandled rejection report: ${writeError.message}`);
  }
  
  // Продолжаем работу сервера
  server.logger.info('Server continuing after unhandled rejection');
});

// Обработка завершения процесса
process.on('SIGINT', () => {
  server.logger.info('Received SIGINT, shutting down gracefully...');
  server.rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.logger.info('Received SIGTERM, shutting down gracefully...');
  server.rl.close();
  process.exit(0);
});

// Обработка SIGKILL (если возможно)
process.on('SIGKILL', () => {
  server.logger.info('Received SIGKILL, shutting down immediately...');
  server.rl.close();
  process.exit(0);
});

// Обработка закрытия stdin
process.stdin.on('end', () => {
  server.logger.info('Stdin ended, closing server...');
  server.rl.close();
  process.exit(0);
});

// Обработка ошибок readline
server.rl.on('error', async (error) => {
  server.logger.error(`Readline error: ${error.message}`, error);
  
  try {
    server.logger.info('Attempting to recover readline by re-attaching handlers...');
    // Мы не пересоздаем rl здесь, а просто переподключаем обработчики
    // Это предотвращает дублирование импорта readline и потенциальные проблемы

    // Переустанавливаем обработчик 'line' (для повторного использования существующей функции)
    server.rl.removeAllListeners('line'); // Удаляем старые обработчики, чтобы избежать дублирования
    server.rl.on('line', async (line) => {
      await processRpcLine(line, server, resetInactivityTimer);
    });
    
    // Переустанавливаем обработчик 'close'
    server.rl.removeAllListeners('close');
    server.rl.on('close', () => {
      server.logger.info('MCP Server closing due to readline close.');
      process.exit(0);
    });

    server.logger.info('Readline handlers re-attached successfully');
  } catch (recoveryError) {
    server.logger.error(`Failed to re-attach readline handlers: ${recoveryError.message}`, recoveryError);
    server.logger.error('Cannot recover readline handlers, exiting...');
    process.exit(1);
  }
});