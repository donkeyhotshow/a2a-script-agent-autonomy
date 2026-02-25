/**
 * MCP (Model Context Protocol) Library - улучшенная версия
 * Extracted from mcp applications with core integration
 */

const { LoggerCore } = require('../../logging-reporting/core-logger/index.js'); // Updated path after libs reorganization
const { ErrorHandler } = require('../core/error-handler/src/error-handler.js');
const { ConfigManager } = require('../core/config-manager/index.js');

const ProtocolCore = require('./src/protocol-core');
const MessageHandler = require('./src/message-handler');
const ConnectionManager = require('./src/connection-manager');
const TerminalInterface = require('../core/terminal-interface/src/index.js'); // Обновлен путь
const RulesEngine = require('./src/rules-engine');
const TestController = require('./src/test-controller');

// Новые модули из node-terminal
const CommandExecutor = require('./command-executor');
const ArchiveManager = require('@mcp/archive-operations');
const AtomicOperations = require('./atomic-operations');
const DataManager = require('@mcp/data-manager');
const HistoryManager = require('./history-manager');

// Создание экземпляров core библиотек
const logger = new LoggerCore();
const errorHandler = new ErrorHandler({ logger });
const configManager = new ConfigManager();

const rulesEngineInstance = new RulesEngine(); // Изменено имя переменной
const testControllerInstance = new TestController(); // Изменено имя переменной

// Terminal instances
const commandExecutor = new CommandExecutor(logger, errorHandler, historyManager); // Передача historyManager
const archiveManager = new ArchiveManager();
const atomicOperations = new AtomicOperations();
const dataManager = new DataManager();
const historyManager = new HistoryManager('C:/apps/root/mcp/node-terminal/history/sessions', logger, {
  maxRecordsPerSession: 100,         // Максимум 100 записей на сессию (уменьшено)
  maxLogFileSize: 5 * 1024 * 1024,   // Максимум 5MB на файл (уменьшено)
  cleanupInterval: 15 * 60 * 1000,   // Очистка каждые 15 минут (ускорено)
  autoCleanup: true                  // Автоочистка включена
});

// Создание улучшенных экземпляров с интеграцией
const protocolCore = new ProtocolCore({
  logger,
  errorHandler,
  configManager,
  maxConnections: 100,
  enableHeartbeat: true,
  connectionTimeout: 30000
});

const messageHandler = new MessageHandler();
const connectionManager = new ConnectionManager();
const terminalInterface = new TerminalInterface(commandExecutor, historyManager, logger); // Передача commandExecutor, historyManager, logger

export { // Core classes
  ProtocolCore,
  MessageHandler,
  ConnectionManager,
  TerminalInterface,
  RulesEngine: rulesEngineInstance, // Экспортируем новый экземпляр
  TestController: testControllerInstance, // Экспортируем новый экземпляр
  
  // Terminal modules
  CommandExecutor,
  ArchiveManager,
  AtomicOperations,
  DataManager,
  HistoryManager,
  
  // Enhanced instances с core integration
  protocol: protocolCore,
  messageHandler,
  connectionManager,
  terminal: terminalInterface,
  rulesEngine: rulesEngineInstance, // Экспортируем новый экземпляр
  testController: testControllerInstance, // Экспортируем новый экземпляр
  
  // Terminal instances
  commandExecutor,
  archiveManager,
  atomicOperations,
  dataManager,
  historyManager,
  
  // Core library instances
  logger,
  errorHandler,
  configManager };

// Default export

